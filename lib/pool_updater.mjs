import Pool from './pool.mjs'


export default class PoolUpdater {
  constructor({ marketsRef, waxEndpoint, pool, logger, isReverse }) {
    this.marketsRef = marketsRef
    this.waxEndpoint = waxEndpoint
    this.pool = pool
    this.logger = logger
    this.isReverse = isReverse
  }

  run(period=1000) {
    this.interval = setInterval(this.updatePool.bind(this), period)
  }

  stop() {
    clearInterval(this.interval)
  }

  async updatePool() {
    var result = await this.waxEndpoint.tableOne({
      "json": true,
      "code": "alcorammswap",
      "scope": "alcorammswap",
      "table": "pairs",
      "table_key": "",
      "lower_bound": this.pool.id,
      "upper_bound": this.pool.id,
      "index_position": 1,
      "key_type": "",
      "limit": 1,
      "reverse": false,
      "show_payer": false
    })

    var pool = new Pool(result)

    this.logger.info(`Pool: ${pool.id} ${pool.market} ${pool.base.quantity} ${pool.quote.quantity} ${pool.quotePrice}`)
    if (this.isReverse) {
      this.reverseRef().update({
        poolId: pool.id,
        poolPrice: pool.basePrice,
        poolBaseAmount: Number(pool.quoteAmount),
        poolQuoteAmount: Number(pool.baseAmount),
        poolUpdatedAt: Date.now()
      })
    } else {
      this.ref().update({
        poolId: pool.id,
        poolPrice: pool.quotePrice,
        poolBaseAmount: Number(pool.baseAmount),
        poolQuoteAmount: Number(pool.quoteAmount),
        poolUpdatedAt: Date.now()
      })
    }
  }

  ref() {
    return this.marketsRef.child(this.pool.market_safe)
  }

  reverseRef() {
    return this.marketsRef.child(this.pool.reverse_market_safe)
  }
}
