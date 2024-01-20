<template>
  <v-data-table
    :headers="headers"
    :items="markets"
    :search="search"
  >
    <template v-slot:item.buyUpdatedAt="{ item }">
      <span :style="[ ago(item.buyUpdatedAt) < -30 ? {'color': 'red'} : {} ]">{{ ago(item.buyUpdatedAt) }}s</span>
    </template>

    <template v-slot:item.sellUpdatedAt="{ item }">
      <span :style="[ ago(item.sellUpdatedAt) < -30 ? {'color': 'red'} : {} ]">{{ ago(item.sellUpdatedAt) }}s</span>
    </template>

    <template v-slot:item.poolUpdatedAt="{ item }">
      <span :style="[ ago(item.poolUpdatedAt) < -30 ? {'color': 'red'} : {} ]">{{ ago(item.poolUpdatedAt) }}s</span>
    </template>

    <template v-slot:item.buy="{ item }">
      <transition name="shaketext">
        <span
          :key="item.buy"
          class="myAnimSpan"
        >{{ item.buy }}</span>
      </transition>
    </template>

    <template v-slot:item.sell="{ item }">
      <transition name="shaketext">
        <span
          :key="item.sell"
          class="myAnimSpan"
        >{{ item.sell }}</span>
      </transition>
    </template>

    <template v-slot:item.pool="{ item }">
      <transition name="shaketext">
        <span
          :key="item.pool"
          class="myAnimSpan"
        >{{ item.pool }}</span>
      </transition>
    </template>

    <template v-slot:item.diff="{ item }">
      <transition name="shaketext">
        <span
          :key="item.diff"
          class="myAnimSpan"
        ><span
          v-if="item.diff > 0"
          class="percentage"
        >{{ item.diff }}</span></span>
      </transition>
    </template>

    <template v-slot:item.actions="{ item }">
      <v-icon
        small
        @click="deleteItem(item)"
      >
        mdi-delete
      </v-icon>
    </template>

    <template v-slot:top>
      <v-toolbar flat>
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
        />
        <v-spacer />
      </v-toolbar>
    </template>
  </v-data-table>
</template>

<script>

export default {
  name: "Updater",
  inject: ["$cradle"],

  data: () => ({
    markets: [],
    search: "",
    headers: [
      { text: "Key", value: "key" },
      { text: "Buy", value: "buyPrice" },
      { text: "", value: "buyUpdatedAt" },
      { text: "Sell", value: "sellPrice" },
      { text: "", value: "sellUpdatedAt" },
      { text: "Pool", value: "poolPrice" },
      { text: "", value: "poolUpdatedAt" },
      { text: "Diff", value: "diff" },
      { text: 'Actions', value: 'actions', sortable: false },
    ],
    marketsRef: null,
  }),

  created() {
    this.initialize();
  },

  methods: {
    async initialize() {
      const { marketsRef } = this.$cradle
      const mr = await marketsRef
      this.marketsRef = mr
      mr.on('value', this.onDataChange)
    },

    onDataChange(items) {
      let markets = []

      items.forEach((item) => {
        let key = item.key
        let market = item.val()
        market.key = key

        if (market.pool > market.sell) {
          market.diff = ((market.pool - market.sell) / market.pool * 100).toFixed(2)
        } else if (market.pool < market.buy) {
          market.diff = -((market.buy - market.pool) / market.pool * 100).toFixed(2)
        } else {
          market.diff = ''
        }

        markets.push(market)
      })

      this.markets = markets
    },

    ago(value) {
      return Math.round((value - Date.now()) / 1000)
    },

    deleteItem(item) {
      this.marketsRef.child(item.key).remove()
    },
  },

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
