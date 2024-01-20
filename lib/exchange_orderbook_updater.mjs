import cloneDeep from "lodash/cloneDeep.js"
import { io } from "socket.io-client"
import { sortByPrice } from "./util.mjs"


export default class ExchangeOrderbookUpdater {
  constructor({ logger, marketsRef, dex }) {
    this.logger = logger
    this.marketsRef = marketsRef
    this.dex = dex

    this.bids = []
    this.asks = []
  }

  run() {
    this.socket = io("https://wax.alcor.exchange", {
      transports: ["websocket"],
    })
    this.socket.connect()

    this.socket.emit("subscribe", {
      room: "orderbook",
      params: { chain: "wax", market: this.dex.id, side: "buy" },
    })
    this.socket.emit("subscribe", {
      room: "orderbook",
      params: { chain: "wax", market: this.dex.id, side: "sell" },
    })

    this.socket.on("orderbook_buy", this.onBuy.bind(this))
    this.socket.on("orderbook_sell", this.onSell.bind(this))
    this.socket.on('connect_error', (err) => {
      this.logger.error(`Websocket connect_error due to ${err.message}`)
    })
  }

  stop() {
    this.socket.disconnect()
  }

  ref() {
    return this.marketsRef.child(this.dex.market_safe)
  }

  onBuy(bids) {
    if (this.bids.length == 0) {
      this.bids = bids.sort(sortByPrice)
    } else {
      const old_bids = cloneDeep(this.bids)

      bids.map((b) => {
        const old = old_bids.findIndex((old_bid) => old_bid[0] == b[0])

        if (old != -1) {
          if (b[1] == 0) {
            old_bids.splice(old, 1)
          } else {
            old_bids[old] = b
          }
        } else if (b[1] !== 0) {
          old_bids.push(b)
        }
      });

      this.bids = old_bids
    }

    bids = this.bids.sort(sortByPrice)

    var buyPrice = null
    var buyAmount = 0

    if (bids.length > 0) {
      const topOrder = bids[0]

      buyPrice = topOrder[0] / 10 ** this.dex.basePrecision
      buyAmount = topOrder[1]
    }

    this.logger.info(`Dex: buy ${this.dex.id} ${this.dex.market} ${buyPrice} ${buyAmount}`)

    this.ref().update({
      dexId: this.dex.id,
      buyPrice: buyPrice,
      buyAmount: buyAmount,
      buyUpdatedAt: Date.now()
    })
  }

  onSell(asks) {
    if (this.asks.length == 0) {
      this.asks = asks;
    } else {
      const old_asks = cloneDeep(this.asks)

      asks.map((b) => {
        const old = old_asks.findIndex((old_ask) => old_ask[0] == b[0])
        if (old != -1) {
          if (b[1] == 0) {
            old_asks.splice(old, 1)
          } else {
            old_asks[old] = b
          }
        } else if (b[1] !== 0) {
          old_asks.push(b)
        }
      });

      this.asks = old_asks
    }

    asks = this.asks.sort(sortByPrice)

    var sellPrice = null
    var sellAmount = 0

    if (asks.length > 0) {
      const topOrder = asks.slice(-1)[0]

      sellPrice = topOrder[0] / 10 ** this.dex.basePrecision
      sellAmount = topOrder[1]
    }

    this.logger.info(`Dex: sell ${this.dex.id} ${this.dex.market} ${sellPrice} ${sellAmount}`)

    this.ref().update({
      dexId: this.dex.id,
      sellPrice: sellPrice,
      sellAmount: sellAmount,
      sellUpdatedAt: Date.now()
    })
  }
}
