import { asset, ExtendedSymbol } from "eos-common"
import BaseExchanger from './base_exchanger.mjs'


class Dex extends BaseExchanger {
  constructor(row) {
    super(
      new ExtendedSymbol(row.base_token.sym, row.base_token.contract),
      new ExtendedSymbol(row.quote_token.sym, row.quote_token.contract)
    )

    this.id = row.id
    this.fee = row.fee
    this.minBuy = asset(row.min_buy)
    this.minSell = asset(row.min_sell)
  }
}

export default Dex;
