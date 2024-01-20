import { intializeNodeContainer } from "./container.mjs"
import ExchangeOrdebookUpdater from '../lib/exchange_orderbook_updater.mjs'
import ExchangeAccountUpdater from '../lib/exchange_account_updater.mjs'
import PoolUpdater from '../lib/pool_updater.mjs'
import { exchangerListIdMap, exchangerListMarketMap } from "../lib/util.mjs"


var container = await intializeNodeContainer('updater')

const {
  account,
  alcorExchange,
  alcorSwap,
  logger,
  waxEndpoint,
  reportLiveness,
  rulesRef,
  marketsRef,
  matchesQueueRef
} = container.cradle

var rr = await rulesRef
var mr = await marketsRef
var qr = await matchesQueueRef

const dexIdMap = exchangerListIdMap(await alcorExchange.all())
const poolMarketMap = exchangerListMarketMap(await alcorSwap.all())

var dexUpdaters = {}
var poolUpdaters = {}
var accountUpdater = null

rr.on('value', async (snapshot) => {
  if (snapshot.val() == null) {
    logger.debug(`Empty rules`)
    return
  }

  logger.debug(`Rules on value triggered`)
  if (accountUpdater) {
    accountUpdater.stop()
  }

  for (const [id, upd] of Object.entries(dexUpdaters)) {
    upd.stop()
  }

  for (const [id, upd] of Object.entries(poolUpdaters)) {
    upd.stop()
  }

  accountUpdater = new ExchangeAccountUpdater({ matchesQueueRef: qr, logger, account })
  accountUpdater.run()
  logger.info(`Starting account updater for ${account}`)

  dexUpdaters = {}
  poolUpdaters = {}

  for (const [key, rule] of Object.entries(snapshot.val()).filter(([id, rl]) => rl.enabled && rl.dexId >= 0)) {
    var dex = dexIdMap[rule.dexId]
    var poolTuple = poolMarketMap[dex.market]
    if (typeof poolTuple == 'undefined') {
      continue
    }

    if (! (dex.id in dexUpdaters)) {
      var upd = new ExchangeOrdebookUpdater({ marketsRef: mr, dex, logger })
      upd.run()
      dexUpdaters[dex.id] = upd
      logger.info(`Starting exchange updater: ${dex.id} ${dex.market}`)
    }

    var [pool, isReverse] = poolTuple
    if (! (pool.id in poolUpdaters)) {
      var upd = new PoolUpdater({ marketsRef: mr, waxEndpoint, pool, logger, isReverse })
      upd.run(250)
      poolUpdaters[pool.id] = upd
      logger.info(`Starting pool updater: ${pool.id} ${pool.market}`)
    }
  }
})

setInterval(() => {
  logger.debug(`Updating liveness`)
  reportLiveness()
}, 1000)
