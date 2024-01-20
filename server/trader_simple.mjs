import { intializeNodeContainer } from "./container.mjs"

var container = await intializeNodeContainer('trader')

const { alcorExchange, alcorSwap, logger, rulesRef, marketsRef, wallet } = container.cradle

const rr = await rulesRef
const mr = await marketsRef

const pools = await alcorSwap.all()
const dexes = await alcorExchange.all()

// const dexIdMap = Object.assign({}, ...dexes.map(d => ({[d.id]: d})))
// const dexMarketMap = Object.assign({}, ...dexes.map(d => ({[d.market.replace(/\./g, "-")]: d})))
const poolIdMap = Object.assign({}, ...pools.map(p => ({[p.id]: p})))
const dexIdMap = Object.assign({}, ...dexes.map(d => ({[d.id]: d})))

// const poolMarketMap = Object.assign({}, ...pools.map(p => ({[p.market.replace(/\./g, "-")]: p})))
const minArbitrage = 0.01
const obsoletePeriod = 10 * 1000;
const lastSeen = {}

var rules = {}
rr.on('value', async (snapshot) => {
  rules = snapshot.val()
})

mr.on('value', async (snapshot) => {
  for (const [market, data] of Object.entries(snapshot.val())) {
    var rule = Object.entries(rules).map((val) => val[1]).find((val) => val.dexId == data.dexId && val.poolId == data.poolId)
    if (typeof rule == 'undefined') {
      logger.debug(`Rule for ${market} not found`)
      continue
    }

    if (! rule.enabled) {
      logger.debug(`Rule for ${market} not enabled`)
      continue
    }

    // var obsolete = Date.now() - obsoletePeriod;
    // if ((data.buyUpdatedAt < obsolete) || (data.sellUpdatedAt < obsolete) || (data.poolUpdatedAt < obsolete)) {
    //   logger.info(`Market ${market} data older than ${obsoletePeriod}ms`)
    //   continue
    // }

    if ((typeof lastSeen[market] != 'undefined')
        && (data.buyUpdatedAt <= lastSeen[market])
        && (data.sellUpdatedAt <= lastSeen[market])
        && (data.poolUpdatedAt <= lastSeen[market])
    ) {
      // logger.info(`Market ${market} data already seen`)
      continue
    }

    lastSeen[market] = Math.max(data.buyUpdatedAt, data.sellUpdatedAt, data.poolUpdatedAt)

    var pool = poolIdMap[data.poolId]
    pool.baseAmount = data.poolBaseAmount
    pool.quoteAmount = data.poolQuoteAmount

    var dex = dexIdMap[data.dexId]

    var buyArbitrage = (data.buyPrice - data.poolPrice) / data.buyPrice
    var sellArbitrage = (data.poolPrice - data.sellPrice) / data.poolPrice

    if ((data.buyPrice > data.poolPrice) && (buyArbitrage > minArbitrage)) {
      logger.info(`Buy: ${market} buyPrice=${data.buyPrice} pool=${data.poolPrice} arb=${(buyArbitrage * 100).toFixed(2)}%`)
      var aout = pool.baseToQuote(rule.amount) * 0.997 // slipage
      var swapTx = wallet.prepareSwapTransaction(pool, rule.amount, aout)
      var exchangeTx = wallet.prepareExchangeTransaction(dex, aout, rule.amount, true)
      console.log(await wallet.transact([swapTx, exchangeTx]))
    }
    else if ((data.sellPrice < data.poolPrice) && (sellArbitrage > minArbitrage)) {
    }
  }
})
