
import * as admin from "firebase-admin/app"
import * as dba from "firebase-admin/database"
import fetch from 'node-fetch'
import { createContainer, Lifetime, asClass, asFunction, asValue, InjectionMode } from "awilix"
import { initializeContainer } from '../lib/container.mjs'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'


export async function intializeNodeContainer(service) {
  const container = await initializeContainer(service)

  container.register({
    db: asFunction(async ({ databaseUrl }) => {
      admin.initializeApp({
        credential: admin.applicationDefault(),
        databaseURL: databaseUrl
      })

      // dba.enableLogging(true)

      return dba.getDatabase()
    }).singleton(),
    realFetch: asFunction(() => fetch),
    privateKey: asFunction(async () => {
      const client = new SecretManagerServiceClient()

      const s = await client.accessSecretVersion({
        name: process.env.GOOGLE_SECRET_PRIVATE_KEY_VERSION_PATH,
      })

      const secret = s[0]

      return [secret.payload.data.toString('utf8')]
    }),
  })

  container.cradle.logger.defaultMeta = { service }

  return container
}
