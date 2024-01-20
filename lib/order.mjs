import { asset, ExtendedSymbol } from "eos-common"

export default class {
  constructor({type, id, bid, ask, unit_price, timestamp, market_id}) {
    this.type = type
    this.id = id
    this.bid = asset(bid)
    this.ask = asset(ask)
    this.unit_price = unit_price
    this.timestamp = timestamp
    this.market_id = market_id
  }

  get price() {
    return parseInt(this.unit_price) / Math.pow(10, (this.type == 'buy' ? this.bid.symbol.precision() : this.ask.symbol.precision()))
  }
}
