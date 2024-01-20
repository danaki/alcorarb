import Dex from './dex.mjs'
import config from './config.mjs'


export default class AlcorExchange {
  constructor({ waxEndpoint }) {
      this.waxEndpoint = waxEndpoint
  }

  async all() {
    var rows = await this.waxEndpoint.tableAll({
      code: config.EXCHANGE_CONTRACT,
      scope: config.EXCHANGE_CONTRACT,
      table: 'markets',
      reverse: false,
      show_payer: false
    })

    return rows.map((r) => new Dex(r))
  }

  async byMarkets(markets) {
    var pools = await this.all()

    return pools.filter((p) => markets.includes(p.market))
  }

  async byId(id) {
    return new Dex(await this.waxEndpoint.tableOne({
      code: config.EXCHANGE_CONTRACT,
      scope: config.EXCHANGE_CONTRACT,
      table: 'markets',
      limit: 1,
      lower_bound: id,
      upper_bound: id,
      index_position: 1
    }))
  }
}
