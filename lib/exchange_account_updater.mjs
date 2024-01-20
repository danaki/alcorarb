import { io } from "socket.io-client"


export default class ExchangeAccountUpdater {
  constructor({ logger, account, matchesQueueRef }) {
    this.logger = logger
    this.account = account
    this.matchesQueueRef = matchesQueueRef
  }

  run() {
    this.socket = io("https://wax.alcor.exchange", {
      transports: ["websocket"],
    })
    this.socket.connect()

    this.socket.emit('subscribe', {
      room: 'account',
      params: {
        chain: "wax",
        name: this.account
      }
    })

    this.socket.on("match", this.onMatch.bind(this))
    this.socket.on('connect_error', (err) => {
      this.logger.error(`Websocket connect_error due to ${err.message}`)
    })
  }

  stop() {
    this.socket.disconnect()
  }

  onMatch(data) {
    // Buy 350 FWW for ~0.53 WAX -> Bought "Match: 104 {\"bid\":0.530936,\"market_id\":104,\"price\":0.00152}"
    // Sell 350 FWW for ~0.53 WAX -> Sold "Match: 104 {\"ask\":349.3,\"market_id\":104,\"price\":0.0015112}"
    this.logger.info(`Match: ${JSON.stringify(data)}`)
    this.matchesQueueRef.push(data)
  }
}
