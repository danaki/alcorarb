import { asset, asset_to_number, number_to_asset, Name, Asset, ExtendedAsset } from "eos-common"
import { get_amount_out, get_amount_in } from "./util.mjs"
import BaseExchanger from './base_exchanger.mjs'


class Pool extends BaseExchanger {
  constructor(row) {
    super(
      new ExtendedAsset(asset(row.pool1.quantity), new Name(row.pool1.contract)),
      new ExtendedAsset(asset(row.pool2.quantity), new Name(row.pool2.contract))
    )

    this.id = row.id
    this.fee = row.fee
  }

  get basePrice() {
    return asset_to_number(this.quote) / asset_to_number(this.base)
  }

  get quotePrice() {
    return asset_to_number(this.base) / asset_to_number(this.quote)
  }

  get baseQuantity() {
    return asset_to_number(this.base)
  }

  get quoteQuantity() {
    return asset_to_number(this.quote)
  }

  get baseAmount() {
    return this.base.quantity.amount;
  }

  set baseAmount(value) {
    this.base.quantity.set_amount(Number(value));
  }

  get quoteAmount() {
    return this.quote.quantity.amount;
  }

  set quoteAmount(value) {
    this.quote.quantity.set_amount(Number(value));
  }

  baseToQuoteAsset(amount) {
    const amountIn = asset(
      parseFloat(amount).toFixed(this.base.quantity.symbol.precision()) + ' TEXT'
    ).amount

    var amountOut = get_amount_out(amountIn, this.base.quantity.amount, this.quote.quantity.amount, this.fee)

    return asset(amountOut, this.quote.quantity.symbol)
  }

  quoteToBaseAsset(amount) {
    const amountOut = asset(
      parseFloat(amount).toFixed(this.quote.quantity.symbol.precision()) + ' TEXT'
    ).amount

    var amountIn = get_amount_in(amountOut, this.base.quantity.amount, this.quote.quantity.amount, this.fee)

    return asset(amountIn, this.base.quantity.symbol)
  }

  baseToQuote(amount) {
    return parseFloat(this.baseToQuoteAsset(amount).to_string())
      .toFixed(this.quote.quantity.symbol.precision())
  }

  quoteToBase(amount) {
    return parseFloat(this.quoteToBaseAsset(amount).to_string())
      .toFixed(this.quote.quantity.symbol.precision())
  }

  update(baseAmount, quoteAmount) {
    this.baseAmount = baseAmount
    this.quoteAmount = quoteAmount
  }
}

export default Pool;
