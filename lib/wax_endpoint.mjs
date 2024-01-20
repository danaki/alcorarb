
import { JsonRpc } from 'eosjs'
import { getAllTableRows } from "./util.mjs"


export default class WaxEndpoint {
  constructor({ waxEndpoints, fetch }) {
    this.endpoints = waxEndpoints
    this.fetch = fetch
    this.endpointInst = null
  }

  rpc() {
    if ((this.endpoints.length == 1) && (this.endpointInst)) {
      return this.endpointInst
    }

    const endpoint = this.endpoints[this.endpoints.length * Math.random() | 0]
    console.log('Using endpoint: ' + endpoint)
    this.endpointInst = new JsonRpc(endpoint, { fetch: this.fetch })
    return this.endpointInst
  }

  async table(args) {
    return (await this.tableRowsWithRetry(args)).rows
  }

  async tableAll(args) {
    var tries = 3

    while (tries-- > 0) {
      try {
        return await getAllTableRows(this.rpc(), args)
      } catch (err) {
        console.log(err)
      }
    }

    throw "Got error after 3 retries in a row"
  }

  async tableOne(args) {
    const { rows } = await this.tableRowsWithRetry(args)
    return rows[0]
  }

  async tableRowsWithRetry(args) {
    var tries = 3

    while (tries-- > 0) {
      try {
        return await this.rpc().get_table_rows(args)
      } catch (err) {
        console.log(err)
      }
    }

    throw "Got error after 3 retries in a row"
  }

  async getAccount(account) {
    var tries = 1

    while (tries-- > 0) {
      try {
        return await this.rpc().get_account(account)
      } catch (err) {
      }
    }

    throw "Got error after 3 retries in a row"
  }

  async speedtest(endpoints) {
    const speeds = await Promise.all(endpoints.map(async (e) => [e, await this.endpointValidity(e)]))

    speeds.forEach(s => {
      console.log(s[0], s[1])
    })

    return speeds.filter(s => s[1] != false).sort((a, b) => a[1] - b[1]).map(s => s[0])
  }

  async endpointValidity(endpoint) {
    const started = Date.now()
    return this.fetch(endpoint + '/v1/chain/get_info')
      .then(value => value.json())
      .then(value => typeof value.chain_id !== 'undefined'
        && value.chain_id == '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4' ? Date.now() - started : false)
      .catch((err) => false)
  }
}
