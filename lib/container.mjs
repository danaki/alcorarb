import { Api, JsonRpc, RpcError } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js'
import winston from 'winston'
import dotenv from 'dotenv'
import { createContainer, Lifetime, asClass, asFunction, asValue, InjectionMode } from "awilix"
import AlcorExchange from '../lib/alcor_exchange.mjs'
import AlcorSwap from '../lib/alcor_swap.mjs'
import Wallet from '../lib/wallet.mjs'
import WaxEndpoint from '../lib/wax_endpoint.mjs'
import config from './config.mjs'


export async function initializeContainer(service=null) {
  dotenv.config()

  const container = createContainer({
    injectionMode: InjectionMode.PROXY
  });

  container.register({
    account: asValue(process.env.VUE_APP_WAX_ACCOUNT),
    databaseUrl: asValue(process.env.DATABASE_URL || process.env.VUE_APP_DATABASE_URL),
    wallet: asClass(Wallet),
    // waxSignEndpoint: asValue('https://wax.cryptolions.io'),
    waxSignEndpoint: asValue(config.OURNODE_PROTO + '://' + config.OURNODE_USER + ':' + config.OURNODE_PASS + '@' + config.OURNODE_HOST),
    waxEndpoints: asValue([
      config.OURNODE_PROTO + '://' + config.OURNODE_USER + ':' + config.OURNODE_PASS + '@' + config.OURNODE_HOST
    ]),
    waxEndpoint: asClass(WaxEndpoint).singleton(),
    fetch: asFunction(({ realFetch }) => (url, options={}) => {
      let rx = /^(.*\:\/\/)(.*@)(.*)/
      let matches = url.match(rx)
      if (matches) {
        let headers = 'headers' in options ? options['headers'] : {}
        headers['Authorization'] = 'Basic ' + Buffer.from(matches[2].slice(0, -1)).toString('base64')
        url = matches[1] + matches[3]
        options['headers'] = headers
      }

      return realFetch(url, options)
    }),
    logger: asFunction(() => winston.createLogger(
        {
          level: process.env.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          transports: [
            new winston.transports.Console()
          ],
        }
      )).singleton(),
    alcorExchange: asClass(AlcorExchange).singleton(),
    alcorSwap: asClass(AlcorSwap).singleton(),
    signRpc: asFunction(({ waxSignEndpoint, fetch }) => {
      return new JsonRpc(waxSignEndpoint, { fetch })
    }).singleton(),
    rulesRef: asFunction(async ({ db }) => (await db).ref('rules')).singleton(),
    marketsRef: asFunction(async ({ db }) => (await db).ref('markets')).singleton(),
    stateRef: asFunction(async ({ db }) => (await db).ref('state')).singleton(),
    matchesQueueRef: asFunction(async ({ db }) => (await db).ref('matches_queue')).singleton(),
    livenessRef: asFunction(async ({ db }) => (await db).ref('liveness')).singleton(),
    tradesRef: asFunction(async ({ db }) => (await db).ref('trades')).singleton(),
    signatureProvider: asFunction(async ({ privateKey }) => new JsSignatureProvider(await privateKey)).singleton(),
    eos: asFunction(async ({ signRpc, signatureProvider }) => new Api({
      signatureProvider: await signatureProvider,
      rpc: signRpc,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder()
    })),
    reportLiveness: asFunction(({ livenessRef }) => (err=null) => {
      livenessRef.then((c) => {
        let ref = c.child(service)
        let data = err ? {
          lastSeenErrorAt: Date.now(),
          error: `${err.name}: ${err.message}`
        } : {}

        data['lastSeenAt'] = Date.now()
        ref.update(data)
      })
    })
  });

  return container;
}
