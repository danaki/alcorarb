const PRICE_SCALE = 100000000
const POOL_CONTRACT = 'alcorammswap'
const EXCHANGE_CONTRACT = 'alcordexmain'
const LIGHTAPI = 'https://lightapi.eosamsterdam.net'
const OURNODE_PROTO = 'https'
const OURNODE_HOST = 'wax-node.local'
const OURNODE_USER = 'username'
const OURNODE_PASS = 'password'

export default {
  PRICE_SCALE,
  PRICE_DIGITS: PRICE_SCALE.toString().length - 1,
  POOL_CONTRACT,
  EXCHANGE_CONTRACT,
  LIGHTAPI,
  OURNODE_PROTO,
  OURNODE_HOST,
  OURNODE_USER,
  OURNODE_PASS
}
