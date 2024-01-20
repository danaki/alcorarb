import { asset, asset_to_number, number_to_asset, Name, Asset, ExtendedAsset, getContract } from "eos-common"
import { get_amount_out, get_amount_in, getSymbol, getExtendedSymbol } from "./util.mjs"


class BaseExchanger {
  constructor(base, quote) {
    this.base = base
    this.quote = quote
  }

  get market() {
    return this.baseSymbol.toString(false) + '_' + this.quoteSymbol.toString(false)
  }

  get market_safe() {
    return this.market.replace(/\./g, "-")
  }

  get reverse_market() {
    return this.quoteSymbol.toString(false) + '_' + this.baseSymbol.toString(false)
  }

  get reverse_market_safe() {
    return this.reverse_market.replace(/\./g, "-")
  }

  get baseSymbol() {
    return getExtendedSymbol(this.base)
  }

  get quoteSymbol() {
    return getExtendedSymbol(this.quote)
  }

  get baseContract() {
    return getContract(this.base)
  }

  get quoteContract() {
    return getContract(this.quote)
  }

  get basePrecision() {
    return getSymbol(this.base).precision()
  }

  get quotePrecision() {
    return getSymbol(this.quote).precision()
  }

  toBaseAsset(amount) {
    return number_to_asset(amount, getSymbol(this.baseSymbol))
  }

  toQuoteAsset(amount) {
    return number_to_asset(amount, getSymbol(this.quoteSymbol))
  }

  toBaseExtendedAsset(amount) {
    return new ExtendedAsset(this.toBaseAsset(amount), this.base.contract)
  }

  toQuoteExtendedAsset(amount, withContract=false) {
    return new ExtendedAsset(this.toQuoteAsset(amount), this.quote.contract)
  }
}

export default BaseExchanger;
