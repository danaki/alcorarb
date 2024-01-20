import Pool from './pool.mjs'
import config from './config.mjs'


export default class AlcorSwap {
  constructor({ waxEndpoint }) {
      this.waxEndpoint = waxEndpoint
  }

  async all() {
    var rows = await this.waxEndpoint.tableAll({
      code: config.POOL_CONTRACT,
      scope: config.POOL_CONTRACT,
      table: 'pairs',
      reverse: false,
      show_payer: false
    })

    return rows.map((r) => new Pool(r))
  }

  async byMarkets(markets) {
    var pools = await this.all()

    return pools.filter((p) => markets.includes(p.market))
  }

  async byId(id) {
    return new Pool(await this.waxEndpoint.tableOne({
      code: config.POOL_CONTRACT,
      scope: config.POOL_CONTRACT,
      table: 'pairs',
      limit: 1,
      lower_bound: id,
      upper_bound: id,
      index_position: 1
    }))
  }
}
