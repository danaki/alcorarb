<template>
  <v-row>
    <v-col>
      <v-card
        class="pa-2"
        elevation="0"
        outlined
        tile
      >
        <v-card-title style="font-size:1em">
          Market
        </v-card-title>
        <v-card-text style="font-size:2em">
          {{ str }}
        </v-card-text>
      </v-card>
    </v-col>

    <v-col>
      <v-card
        class="pa-2"
        elevation="0"
        outlined
        tile
      >
        <v-card-title style="font-size:1em">
          Buy
        </v-card-title>
        <v-card-text style="font-size:2em">
          <transition name="shaketext">
            <span
              :key="buy"
              class="myAnimSpan"
            >{{ buy }}</span>
          </transition>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col>
      <v-card
        class="pa-2"
        elevation="0"
        outlined
        tile
      >
        <v-card-title style="font-size:1em">
          Sell
        </v-card-title>
        <v-card-text style="font-size:2em">
          <transition name="shaketext">
            <span
              :key="sell"
              class="myAnimSpan"
            >{{ sell }}</span>
          </transition>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col>
      <v-card
        class="pa-2"
        elevation="0"
        outlined
        tile
      >
        <v-card-title style="font-size:1em">
          Pool
        </v-card-title>
        <v-card-text style="font-size:2em">
          <transition name="shaketext">
            <span
              :key="pool"
              class="myAnimSpan"
              :class="diffColor"
            >{{ pool }} <span
              v-if="diff > 0"
              class="percentage"
            >{{ diff }}</span></span>
          </transition>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>

export default {
  name: 'Watcher',

  props: [ 'marketId', 'poolId', 'str', 'precision' ],

  data: () => ({
    socket: null,
    buy: null,
    sell: null,
    pool: null,
    bids: [],
    asks: [],
  }),

  computed: {
    diffColor: function () {
      return (typeof this.pool !== 'undefined')
          && (typeof this.sell !== 'undefined')
          && (this.pool > this.sell)
        ? 'red--text'
        : (typeof this.pool !== 'undefined')
            && (typeof this.buy !== 'undefined')
            && (this.pool < this.buy)
          ? 'green--text'
          : ''
    },
    diff: function () {
      return (typeof this.pool !== 'undefined')
          && (typeof this.sell !== 'undefined')
          && (this.pool > this.sell)
        ? ((this.pool - this.sell) / this.pool * 100).toFixed(6)
        : (typeof this.pool !== 'undefined')
            && (typeof this.buy !== 'undefined')
            && (this.pool < this.buy)
          ? ((this.buy - this.pool) / this.pool * 100).toFixed(6)
          : ''
    }
  },

  mounted() {
    this.socket = io("https://wax.alcor.exchange", {
      transports: ["websocket"],
    })
    this.socket.connect()

    this.socket.emit("subscribe", {
      room: "orderbook",
      params: { chain: "wax", market: this.marketId, side: "buy" },
    })
    this.socket.emit("subscribe", {
      room: "orderbook",
      params: { chain: "wax", market: this.marketId, side: "sell" },
    })

    this.socket.on("orderbook_buy", this.onBuy)
    this.socket.on("orderbook_sell", this.onSell)

    setInterval(this.updatePool, 1000)
  },

  methods: {
    onBuy(bids) {
      if (this.bids.length == 0) {
        this.bids = bids.sort(sortByPrice);
      } else {
        const old_bids = cloneDeep(this.bids);

        bids.map((b) => {
          const old = old_bids.findIndex((old_bid) => old_bid[0] == b[0]);

          if (old != -1) {
            if (b[1] == 0) {
              old_bids.splice(old, 1);
            } else {
              old_bids[old] = b;
            }
          } else if (b[1] !== 0) {
            old_bids.push(b);
          }
        });

        this.bids = old_bids;
      }

      bids = this.bids.sort(sortByPrice);

      this.buy = bids.length > 0 ? bids[0][0] / 10 ** this.precision : null;
    },

    onSell(asks) {
      if (this.asks.length == 0) {
        this.asks = asks;
      } else {
        const old_asks = cloneDeep(this.asks);

        asks.map((b) => {
          const old = old_asks.findIndex((old_ask) => old_ask[0] == b[0]);
          if (old != -1) {
            if (b[1] == 0) {
              old_asks.splice(old, 1);
            } else {
              old_asks[old] = b;
            }
          } else if (b[1] !== 0) {
            old_asks.push(b);
          }
        });

        this.asks = old_asks;
      }

      asks = this.asks.sort(sortByPrice);
      this.sell = asks.length > 0 ? asks.slice(-1)[0][0] / 10 ** this.precision : null;
    },

    updatePool() {
      var data = {
        "json": true,
        "code": "alcorammswap",
        "scope": "alcorammswap",
        "table": "pairs",
        "table_key": "",
        "lower_bound": this.poolId,
        "upper_bound": this.poolId,
        "index_position": 1,
        "key_type": "",
        "limit": 1,
        "reverse": false,
        "show_payer": false
      }

      fetch(proxy + "/v1/chain/get_table_rows", {
        headers: {
          'Accept': 'application/json',
        },
        method: "POST",
        body: JSON.stringify(data)
      })
      .then((res) => { return res.json() })
      .then((res) => {
        this.pool = parseFloat(res.rows[0].pool1.quantity) / parseFloat(res.rows[0].pool2.quantity)
      })
    }
  }
};
</script>

<style scoped>
.myAnimSpan {
  display: inline-block;
}

.shaketext-enter-active {
  animation: shake 0.9s;
}
.shaketext-leave-to, .shaketext-leave-active{
  display: none;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}

.percentage:after {
    content: "%"
}
</style>
