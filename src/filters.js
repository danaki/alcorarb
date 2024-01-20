import config from '../lib/config'


export function humanPrice(amount, PRICE_DIGITS = config.PRICE_DIGITS) {
  const price = (amount / config.PRICE_SCALE)

  return parseFloat(price.toFixed(PRICE_DIGITS))
    .toLocaleString('en', { minimumFractionDigits: Math.min(PRICE_DIGITS, 2), maximumFractionDigits: PRICE_DIGITS })
}

export function humanFloat(amount, precision = 4, MAX_DIGITS, MIN_DIGITS = 2) {
  const amt = amount / 10 ** precision

  if (MAX_DIGITS !== undefined) {
    MAX_DIGITS = Math.min(MAX_DIGITS, precision)
  } else {
    MAX_DIGITS = precision
  }

  return parseFloat(amt.toFixed(precision))
    .toLocaleString('en', { minimumFractionDigits: Math.min(MIN_DIGITS, parseFloat(precision)), maximumFractionDigits: MAX_DIGITS })
}

export function commaFloat(num, precision = 4) {
  const pow = Math.pow(10, precision)

  let sym = ''

  if (typeof num === 'string' && num.includes(' ')) {
    sym = ' ' + num.split(' ')[1]
    num = num.split(' ')[0]
  }

  const rounded = Math.ceil(parseFloat(num) * pow) / pow
  const fixed = rounded.toFixed(precision)

  const [int, dec] = fixed.split('.')
  return int.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + '.' + dec + sym
}

