
import { ExtendedSymbol, ExtendedAsset, Sym, number_to_asset } from "eos-common"
import { nameToUint64 } from './util.mjs'
import config from './config.mjs'


export default class {
  constructor({ logger, eos, waxEndpoint, account, fetch=null }) {
    this.logger = logger
    this.eos = eos
    this.waxEndpoint = waxEndpoint
    this.account = account
    this.fetch = fetch
  }

  async loadAccountData() {
    return await this.waxEndpoint.getAccount(this.account)
  }

  async haveResources(limit=1) {
    const data = await this.waxEndpoint.getAccount(this.account)

    return data.cpu_limit.used < data.cpu_limit.max * limit
      && data.ram_usage < data.ram_quota * limit
      && data.net_limit.used < data.net_limit.max * limit
  }

  async getBalances() {
    const fetch = this.fetch ? this.fetch : window.fetch

    const response = await fetch(config.LIGHTAPI + '/api/balances/wax/' + this.account)
    const data = await response.json()

    return data.balances.map((b) => {
      const symbol = new Sym(b.currency, b.decimals)
      const exp = Math.pow(10, symbol.precision())

      return new ExtendedAsset(Math.floor(b.amount * exp), new ExtendedSymbol(symbol, b.contract))
    })
  }

  async getOrders() {
    let marketdata = await this.waxEndpoint.table({
      code: config.EXCHANGE_CONTRACT,
      scope: config.EXCHANGE_CONTRACT,
      table: 'account',
      limit: 1,
      lower_bound: nameToUint64(this.account),
      upper_bound: nameToUint64(this.account)
    })

    if (marketdata.length == 0) {
      return {
        buy: [],
        sell: []
      }
    }

    let buyPromises = marketdata[0].buyorders.map(async md => {
      let orders = await this.waxEndpoint.table({
        code: config.EXCHANGE_CONTRACT,
        table: 'buyorder',
        key_type: 'i64',
        scope: md.key,
        index_position: 3,
        lower_bound: nameToUint64(this.account),
        upper_bound: nameToUint64(this.account)
      })

      return orders.map(od => ({...od, market_id: md.key}))
    })

    let sellPromises = marketdata[0].sellorders.map(async md => {
      let orders = await this.waxEndpoint.table({
        code: config.EXCHANGE_CONTRACT,
        table: 'sellorder',
        key_type: 'i64',
        scope: md.key,
        index_position: 3,
        lower_bound: nameToUint64(this.account),
        upper_bound: nameToUint64(this.account)
      })

      return orders.map(od => ({...od, market_id: md.key}))
    })

    return {
      buy: (await Promise.all(buyPromises)).flat(),
      sell: (await Promise.all(sellPromises)).flat(),
    }
  }

  async transact(actions) {
    let api = await this.eos
    this.logger.info(`TX IN: ${JSON.stringify(actions)}`)
    const result = await api.transact({
      actions
    }, {
      blocksBehind: 3,
      expireSeconds: 30,
    })

    this.logger.info(`TX OUT: ${JSON.stringify(result)}`)

    return result
  }

  prepareSwapTransaction(pool, amount, minOutput, reverse=false) {
    const authorization = [{
      actor: this.account,
      permission: 'active',
    }]

    return {
      account: reverse ? pool.quoteContract.toString() : pool.baseContract.toString(),
      name: 'transfer',
      authorization,
      data: {
        from: this.account,
        to: 'alcorammswap',
        quantity: reverse ? pool.toQuoteAsset(amount).toString() : pool.toBaseAsset(amount).toString(),
        memo: reverse ? pool.toBaseExtendedAsset(minOutput).toString() : pool.toQuoteExtendedAsset(minOutput).toString()
      }
    }
  }

  prepareExchangeBuyTransaction(dex, amountValue, forAmountValue) {
    let baseAmount = dex.toBaseAsset(amountValue)
    let quoteAmount = dex.toQuoteExtendedAsset(forAmountValue)

    return this.prepareExchangeTransaction(
      dex.baseContract.toString(),
      baseAmount,
      quoteAmount
    )
  }

  prepareExchangeSellTransaction(dex, amountValue, forAmountValue) {
    let baseAmount = dex.toQuoteAsset(forAmountValue)
    let quoteAmount = dex.toBaseExtendedAsset(amountValue)

    return this.prepareExchangeTransaction(
      dex.quoteContract.toString(),
      baseAmount,
      quoteAmount
    )
  }

  prepareExchangeTransaction(contract, amount, forAmount) {
    const authorization = [{
      actor: this.account,
      permission: 'active',
    }]

    return {
      account: contract,
      name: 'transfer',
      authorization,
      data: {
        from: this.account,
        to: 'alcordexmain',
        quantity: amount.toString(),
        memo: forAmount.toString()
      }
    }
  }

  prepareCancelOrderTransaction(type, marketId, orderId) {
    const authorization = [{
      actor: this.account,
      permission: 'active',
    }]

    return {
      account: config.EXCHANGE_CONTRACT,
      name: `cancel${type}`,
      authorization,
      data: {
        executor: this.account,
        market_id: marketId,
        order_id: orderId
      }
    }
  }

}
