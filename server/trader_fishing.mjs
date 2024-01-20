import { write_decimal } from "eos-common"
import Queue from "@kaliber/firebase-queue"
import { intializeNodeContainer } from "./container.mjs"
import config from '../lib/config.mjs'
import Order from '../lib/order.mjs'
import { exchangerListIdMap, exchangerListMarketMap } from "../lib/util.mjs"
import { createDisposableResolver } from "awilix"


var container = await intializeNodeContainer('trader_fishing')

const {
  alcorExchange,
  alcorSwap,
  logger,
  reportLiveness,
  rulesRef,
  marketsRef,
  stateRef,
  matchesQueueRef,
  tradesRef,
  wallet
} = container.cradle

const poolDataObsoletePeriod = 2 * 1000; // seconds
const unconfirmedObsoletePeriod = 60 * 1000; // seconds

const rr = await rulesRef
const mr = await marketsRef
const sr = await stateRef
const qr = await matchesQueueRef

const lastSeen = {}

let orders = []
// matchedOrders: because quickly coming market data cancels other firebase hooks, we are using
// a some kind of stack to inside the market data handler
let matchedOrders = []
let haveDirtyOrders = true
let haveResources = true
let balances = await wallet.getBalances()

const dexIdMap = exchangerListIdMap(await alcorExchange.all())
const pools = await alcorSwap.all()
const poolMarketMap = exchangerListMarketMap(pools)

const queue = new Queue({
  tasksRef: qr,
  processTask: async function (order) {
    logger.info(`Order matched: ${JSON.stringify(order)}`)
    matchedOrders.push(order)
  },
  reportError: e => logger.error(e)
})

// capture shutdown signal to perform a gracefull shutdown
process.on('SIGINT', async () => {
  await queue.shutdown()
  process.exit(0)
})

async function updateOrders(task=null) {
  logger.info(`Updating orders`)
  try {
    let rawOrders = await wallet.getOrders()
    logger.debug(`Found orders buy=${rawOrders.buy.length} sell=${rawOrders.sell.length}`)
    orders = []
      .concat(rawOrders.buy.map(ord => new Order({...ord, ...{type: 'buy'}})))
      .concat(rawOrders.sell.map(ord => new Order({...ord, ...{type: 'sell'}})))
  } catch (err) {
    logger.error(err)
    reportLiveness(err)
    console.log(err)
    // throw e // this marks the task as failed
  }
}

function fromPrc(value, prc) {
  return value * prc / 100
}

function balanceFor(extendedSymbol) {
  var b = balances.filter((b) => `${b.quantity.symbol.code().to_string()}@${b.contract.to_string()}` == extendedSymbol.toString(false))
  if (b.length == 0) {
    return 0.0
  }

  return parseFloat(write_decimal(b[0].quantity.amount, b[0].quantity.symbol.precision(), true))
}

let haveAllConfirmed = false
let states = {}
sr.on('value', async (snapshot) => {
  var s = snapshot.val()
  states = s == null ? {} : s

  let prevHaveAllConfirmed = haveAllConfirmed
  if (Object.keys(states).length) {
    haveAllConfirmed = Object.entries(states).map(
      ([id, st]) => (st.state != 'unconfirmed') || (st.updatedAt < (Date.now() - unconfirmedObsoletePeriod))
    ).every(b => b)
  } else {
    haveAllConfirmed = true
  }

  if (haveAllConfirmed && ! prevHaveAllConfirmed) {
    haveDirtyOrders = true
  }
})

let rules = {}
rr.on('value', async (snapshot) => {
  logger.info("Got rule update")
  rules = snapshot.val()
})

async function onMarketData(snapshot) {
  // logger.debug("Market data update")

  if (typeof rules == 'undefined') {
    logger.error("Rules are undefined")
    return
  }

  // update pools no matter what
  for (const [market, data] of Object.entries(snapshot.val())) {
    var dex = dexIdMap[data.dexId]
    var [pool, isReverse] = poolMarketMap[dex.market]
    pool.update(data.poolBaseAmount, data.poolQuoteAmount)
  }

  if (! haveResources) {
    logger.error('No resources')
    return
  }

  var order
  while (typeof (order = matchedOrders.pop()) != 'undefined') {
    const dex = dexIdMap[order.market_id]
    var [pool, isReverse] = poolMarketMap[dex.market]

    if ("bid" in order) {
      var newTradeRef = (await tradesRef).push()
      newTradeRef.set({
        createdAt: Date.now(),
        bot: 'trader_fishing',
        side: 'buy',
        market: dex.market,
        orderAmount: dex.toQuoteAsset(order["bid"]).toString(),
        orderAmountFor: dex.toBaseAsset(order["bid"] * order["price"]).toString(),
        orderPrice: order["price"]
      })

      const amount = order["bid"] // * order["price"]
      const amountFor = order["bid"] * order["price"] * 0.99 // pool fee + slipage
      logger.info(`Swapping on pool ${pool.id} ${pool.reverse_market} ${amount} for ${amountFor}, order bid=${order["bid"]}, order price=${order["price"]}, pool price=${pool.quotePrice}`)
      let tx = wallet.prepareSwapTransaction(pool, amount, amountFor, true)

      try {
        let receipt = await wallet.transact([tx])
        if (('transaction_id' in receipt)
          && ('processed' in receipt)
          && ('action_traces' in receipt['processed'])
          && (receipt['processed']['action_traces'].length == 1)
          && ('inline_traces' in receipt['processed']['action_traces'][0])
          && (receipt['processed']['action_traces'][0]['inline_traces'].length > 0)
        ) {
          let outcome = receipt['processed']['action_traces'][0]['inline_traces'].pop()
          if (('act' in outcome)
            && ('data' in outcome['act'])
            && ('record' in outcome['act']['data'])
            && ('quantity_in' in outcome['act']['data']['record'])
            && ('quantity_out' in outcome['act']['data']['record'])
          ) {
            newTradeRef.update({
              swapAmount: outcome['act']['data']['record']['quantity_in'],
              swapAmountFor: outcome['act']['data']['record']['quantity_out'],
            })
          } else {
            throw 'Unexpected tx trace output'
          }
        } else {
          throw 'Unexpected tx output'
        }


      } catch (err) {
        logger.error(`Swap transact() returned null`)
        reportLiveness(err)
        newTradeRef.update({
          error: err.message
        })
        console.log(err)
      }
    } else if ("ask" in order) {
      var newTradeRef = (await tradesRef).push()
      newTradeRef.set({
        createdAt: Date.now(),
        bot: 'trader_fishing',
        side: 'sell',
        market: dex.market,
        orderAmount: dex.toBaseAsset(order["ask"] * order["price"]).toString(),
        orderAmountFor: dex.toQuoteAsset(order["ask"]).toString(),
        orderPrice: order["price"]
      })

      const amount = order["ask"] // * order["price"]
      const amountFor = order["ask"] * order["price"] * 0.99 // pool fee + slipage
      logger.info(`Swapping on pool ${pool.id} ${pool.market} ${amount} for ${amountFor}, order ask=${order["ask"]}, order price=${order["price"]}, pool price=${pool.quotePrice}`)
      let tx = wallet.prepareSwapTransaction(pool, amountFor, amount, false)

      try {
        let receipt = await wallet.transact([tx])
        if (('transaction_id' in receipt)
          && ('processed' in receipt)
          && ('action_traces' in receipt['processed'])
          && (receipt['processed']['action_traces'].length == 1)
          && ('inline_traces' in receipt['processed']['action_traces'][0])
          && (receipt['processed']['action_traces'][0]['inline_traces'].length > 0)
        ) {
          let outcome = receipt['processed']['action_traces'][0]['inline_traces'].pop()
          if (('act' in outcome)
            && ('data' in outcome['act'])
            && ('record' in outcome['act']['data'])
            && ('quantity_in' in outcome['act']['data']['record'])
            && ('quantity_out' in outcome['act']['data']['record'])
          ) {
            newTradeRef.update({
              swapAmount: outcome['act']['data']['record']['quantity_in'],
              swapAmountFor: outcome['act']['data']['record']['quantity_out'],
            })
          } else {
            throw 'Unexpected tx trace output'
          }
        } else {
          throw 'Unexpected tx output'
        }
      } catch (err) {
        logger.error(`Swap transact() returned null`)
        reportLiveness(err)
        newTradeRef.update({
          error: err.message
        })
        console.log(err)
      }
    } else {
      logger.error(`Unknown type of order`)
    }

    haveDirtyOrders = true
  }

  if (! haveAllConfirmed) {
    logger.debug("Have unconfirmed transactions, skipping market update")
    return
  }

  if (haveDirtyOrders) {
    logger.debug("Got all transactions confirmed, need to refresh orders")
    await updateOrders()
    haveDirtyOrders = false
  }

  for (const [market, data] of Object.entries(snapshot.val())) {
    var dex = dexIdMap[data.dexId]

    var marketRules = Object.fromEntries(Object.entries(rules).filter(
      ([id, rl]) => (rl.dexId == data.dexId) && rl.enabled
    ))

    if (Object.keys(marketRules).length == 0) {
      continue
    }

    if ((typeof lastSeen[market] != 'undefined')
        && (data.buyUpdatedAt <= lastSeen[market])
        && (data.sellUpdatedAt <= lastSeen[market])
        && (data.poolUpdatedAt <= lastSeen[market])
    ) {
      // logger.debug(`Market ${market} data already seen`)
      continue
    }

    lastSeen[market] = Math.max(data.buyUpdatedAt, data.sellUpdatedAt, data.poolUpdatedAt)
    var obsolete = Date.now() - poolDataObsoletePeriod;
    if (data.poolUpdatedAt < obsolete) {
      logger.debug(`Market ${market} data older than ${poolDataObsoletePeriod}ms`)
      continue
    }

    // ----- BUY -----

    var buyRules = Object.fromEntries(Object.entries(marketRules).filter(([id, rl]) => rl.direction == 'F'))
    if (Object.keys(buyRules).length > 1) {
      logger.debug(`Multiple buy rules for ${market}`)
      continue
    }
    let buyKeys = Object.keys(buyRules)
    var [buyRuleId, buyRule] = buyKeys.length == 0 ? [null, null] : [buyKeys[0], buyRules[buyKeys[0]]]

    if ((buyRuleId in states) && (states[buyRuleId].state == 'unconfirmed')) {
      logger.debug(`Waiting for ${states[buyRuleId]['txid']}, rule=${buyRuleId} to confirm`)
      continue
    }

    if (buyRule) {
      var buyOrders = orders.filter(ord => (ord.market_id == data.dexId) && (ord.type == 'buy'))
      if (buyOrders.length == 0) {
        let orderType = 'buy'
        let orderPrice = (data.poolPrice * (100 - parseFloat(buyRule.profit)) / 100).toFixed(config.PRICE_DIGITS)
        let quoteValue = buyRule.amount / orderPrice

        var baseBalance = balanceFor(dex.baseSymbol)
        if (baseBalance < buyRule.amount) {
          logger.debug(`Not enough funds to fulfill ${orderType} order, ${dex.toBaseAsset(buyRule.amount)} < ${dex.toBaseAsset(baseBalance)}`)
        } else {
          logger.info(`Creating ${orderType} order ${dex.toBaseAsset(buyRule.amount)} for ${dex.toQuoteAsset(quoteValue)}, market=${data.buyPrice}, pool=${data.poolPrice}, our=${orderPrice}`)
          let tx = await wallet.prepareExchangeBuyTransaction(dex, buyRule.amount, quoteValue)

          try {
            let receipt = await wallet.transact([tx])
            let txid = null
            if ('transaction_id' in receipt) {
              txid = receipt['transaction_id']
            }

            sr.child(buyRuleId).update({
              txid,
              type: orderType,
              state: 'unconfirmed',
              updatedAt: Date.now()
            })

            logger.info(`Sent ${orderType} order ${dex.toBaseAsset(buyRule.amount)} for ${dex.toQuoteAsset(quoteValue)}`)
          } catch (err) {
            logger.error(`Buy transact() returned null`)
            reportLiveness(err)
            console.log(err)
          }
        }
      }
      else {
        for (const order of buyOrders) {
          logger.debug(`Found ${order.type} order ${order.id} for market ${order.market_id}, price=${order.price}, market=${data.buyPrice}, pool=${data.poolPrice}`)

          const profited = fromPrc(data.poolPrice, 100 - parseFloat(buyRule.profit))
          const profitedToleranceLow = fromPrc(profited, 100 - parseFloat(buyRule.tolerance))
          const profitedToleranceHigh = fromPrc(profited, 100 + parseFloat(buyRule.tolerance))

          if ((order.price < profitedToleranceLow) || (order.price > profitedToleranceHigh)) {
            logger.info(`Creating cancel transaction ${order.type} order ${order.id} for market ${order.market_id}`)
            let tx = await wallet.prepareCancelOrderTransaction(order.type, order.market_id, order.id)

            try {
              let receipt = await wallet.transact([tx])
              let txid = null
              if ('transaction_id' in receipt) {
                txid = receipt['transaction_id']
              }

              sr.child(buyRuleId).update({
                txid,
                type: `cancel${order.type}`,
                state: 'unconfirmed',
                updatedAt: Date.now()
              })

              logger.info(`Sent cancel ${order.type} order ${order.id} for market ${order.market_id}`)
            } catch (err) {
              logger.error(`Cancel transact() returned null`)
              reportLiveness(err)
              console.log(err)
            }
          } else {
            logger.debug(`Not cancel ${order.type} order ${order.id} for market ${order.market_id} in bounds ${profitedToleranceLow} < ${order.price} < ${profitedToleranceHigh}`)
          }
        }
      }
    }

    // ----- SELL -----

    var sellRules = Object.fromEntries(Object.entries(marketRules).filter(([id, rl]) => rl.direction == 'B'))
    if (Object.keys(sellRules).length > 1) {
      logger.debug(`Multiple sell rules for ${market}`)
      continue
    }
    let sellKeys = Object.keys(sellRules)
    var [sellRuleId, sellRule] = sellKeys.length == 0 ? [null, null] : [sellKeys[0], sellRules[sellKeys[0]]]

    if ((sellRuleId in states) && (states[sellRuleId].state == 'unconfirmed')) {
      logger.debug(`Waiting for ${states[sellRuleId]['txid']}, rule=${sellRuleId} to confirm`)
      continue
    }

    if (sellRule) {
      var sellOrders = orders.filter(ord => (ord.market_id == data.dexId) && (ord.type == 'sell'))
      if (sellOrders.length == 0) {
        let orderType = 'sell'
        let orderPrice = (data.poolPrice * (100 + parseFloat(sellRule.profit)) / 100).toFixed(config.PRICE_DIGITS)
        let quoteValue = sellRule.amount / orderPrice

        var quoteBalance = balanceFor(dex.quoteSymbol)
        if (quoteBalance < quoteValue) {
          logger.debug(`Not enough funds to fulfill ${orderType} order, ${dex.toQuoteAsset(quoteBalance)} < ${dex.toQuoteAsset(quoteValue)}`)
        } else {
          logger.info(`Creating ${orderType} order ${dex.toBaseAsset(sellRule.amount)} for ${dex.toQuoteAsset(quoteValue)}, market=${data.sellPrice}, pool=${data.poolPrice}, our=${orderPrice}`)
          let tx = await wallet.prepareExchangeSellTransaction(dex, sellRule.amount, quoteValue)

          try {
            let receipt = await wallet.transact([tx])
            let txid = null
            if ('transaction_id' in receipt) {
              txid = receipt['transaction_id']
            }

            sr.child(sellRuleId).update({
              txid,
              type: orderType,
              state: 'unconfirmed',
              updatedAt: Date.now()
            })

            logger.info(`Sent ${orderType} order ${dex.toBaseAsset(sellRule.amount)} for ${dex.toQuoteAsset(quoteValue)}`)
          } catch (err) {
            logger.error(`Sell transact() returned null`)
            reportLiveness(err)
            console.log(err)
          }
        }
      }
      else {
        for (const order of sellOrders) {
          logger.debug(`Found ${order.type} order ${order.id} for market ${order.market_id}, price=${order.price}, market=${data.sellPrice}, pool=${data.poolPrice}`)
          const profited = fromPrc(data.poolPrice, 100 + parseFloat(sellRule.profit))
          const profitedToleranceLow = fromPrc(profited, 100 - parseFloat(sellRule.tolerance))
          const profitedToleranceHigh = fromPrc(profited, 100 + parseFloat(sellRule.tolerance))

          if ((order.price < profitedToleranceLow) || (order.price > profitedToleranceHigh)) {
            logger.info(`Creating cancel transaction ${order.type} order ${order.id} for market ${order.market_id}`)
            let tx = await wallet.prepareCancelOrderTransaction(order.type, order.market_id, order.id)

            try {
              let receipt = await wallet.transact([tx])
              let txid = null
              if ('transaction_id' in receipt) {
                txid = receipt['transaction_id']
              }

              sr.child(sellRuleId).update({
                txid,
                type: `cancel${order.type}`,
                state: 'unconfirmed',
                updatedAt: Date.now()
              })

              logger.info(`Sent cancel ${order.type} order ${order.id} for market ${order.market_id}`)
            } catch (err) {
              logger.error(`Cancel transact() returned null`)
              reportLiveness(err)
              console.log(err)
            }
          } else {
            logger.debug(`Not cancel ${order.type} order ${order.id} for market ${order.market_id} in bounds ${profitedToleranceLow} < ${order.price} < ${profitedToleranceHigh}`)
          }
        }
      }
    }
  }
}

async function onMarketDataRepeater(snapshot) {
  await onMarketData(snapshot)
  mr.once('value', onMarketDataRepeater)
  reportLiveness()
}

setInterval(() => wallet.haveResources(0.95).then(x => {
  haveResources = x
}), 1000)

setInterval(() => wallet.getBalances().then(x => {
  balances = x
}), 1000)

mr.once('value', onMarketDataRepeater)

