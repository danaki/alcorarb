import { Serialize } from 'eosjs'

const types = Serialize.createInitialTypes()

export const nameToUint64 = (name) => {
  const ser = new Serialize.SerialBuffer()
  ser.pushName(name)
  return types.get('uint64').deserialize(ser)
}

export const sortByPrice = (a, b) => {
  if (a[0] > b[0]) return -1;
  if (a[0] < b[0]) return 1;
  return 0;
}

export async function getAllTableRows(rpc, args) {
  var pageSize = 100
  var nextKey = 0
  var rows = []
  var tries = 3

  do {
    try {
      var result = await rpc.get_table_rows({...args, ...{
        lower_bound: nextKey,
        limit: pageSize
      }})

      nextKey = result['next_key']

      rows = rows.concat(result.rows)
      tries = 3
    } catch (err) {
      console.log(tries)
      tries--
      console.log(err)
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (tries <= 0) {
        throw 'getAllTableRows() giveup after 3 tries'
      }
    }
  } while ((typeof result == 'undefined') || result['more'])

  return rows
}

export function get_amount_out(amount_in, reserve_in, reserve_out, fee) {
  const amount_in_with_fee = amount_in.multiply(10000 - fee)
  const numerator = amount_in_with_fee.multiply(reserve_out)
  const denominator = reserve_in.multiply(10000).add(amount_in_with_fee)

  return numerator.divide(denominator)
}

export function get_amount_in(amount_out, reserve_in, reserve_out, fee) {
  const numerator = reserve_in.multiply(amount_out).multiply(10000)
  const denominator = reserve_out.minus(amount_out).multiply(10000 - fee)
  const amount_in = numerator.divide(denominator).plus(1)

  return amount_in
}

export function getExtendedSymbol(obj) {
  if ( obj.typeof == "extended_symbol") return obj;
  if ( obj.typeof == "extended_asset") return obj.get_extended_symbol();
  return null
}

export function getSymbol(obj) {
  if ( obj.typeof == "symbol") return obj;
  if ( obj.typeof == "extended_symbol") return obj.get_symbol();
  if ( obj.typeof == "asset") return obj.symbol;
  if ( obj.typeof == "extended_asset") return obj.quantity.symbol;
  return null
}

export function exchangerListMarketMap(exchangers) {
  const exMap = {}

  for (const ex of exchangers) {
    // ex, is reverse
    exMap[ex.market] = [ex, false]
    exMap[ex.reverse_market] = [ex, true]
  }

  return exMap
}

export function exchangerListIdMap(exchangers) {
  return Object.assign({}, ...exchangers.map(ex => ({[ex.id]: ex})))
}
