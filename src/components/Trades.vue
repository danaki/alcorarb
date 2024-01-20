<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="trades"
      :search="search"
      :sort-by.sync="sortBy"
      :sort-desc.sync="sortDesc"
      :loading="loading"
    >
      <template v-slot:item.createdAt="{ item }">
        <span>{{ todate(item.createdAt) }}</span>
      </template>

      <template v-slot:item.orderAmountFor="{ item }">
        <span :style="[ ! item.swapAmountFor || (parseFloat(item.orderAmountFor) > parseFloat(item.swapAmountFor)) ? {'color': 'red'} : {} ]">{{ item.orderAmountFor }}</span>
      </template>

      <template v-slot:item.swapAmountFor="{ item }">
        <span :style="[ ! item.swapAmountFor || (parseFloat(item.orderAmountFor) > parseFloat(item.swapAmountFor)) ? {'color': 'red'} : {} ]">{{ item.swapAmountFor }}</span>
      </template>

      <template v-slot:item.profit="{ item }">
        <span :style="[ ! item.swapAmountFor || (parseFloat(item.orderAmountFor) > parseFloat(item.swapAmountFor)) ? {'color': 'red'} : {} ]">
          {{ ((parseFloat(item.swapAmountFor) - parseFloat(item.orderAmountFor)) / parseFloat(item.swapAmountFor) * 100).toFixed(2) }}%
        </span>
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
          <v-toolbar-title>Trades</v-toolbar-title>
        </v-toolbar>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>

export default {
  name: "Trades",
  inject: ["$cradle"],

  data: () => ({
    trades: [],
    search: "",
    headers: [
      { text: "Created", value: "createdAt" },
      { text: "Bot", value: "bot" },
      { text: "Market", value: "market" },
      { text: "Side", value: "side" },
      { text: "Order price", value: "orderPrice" },
      { text: "Order/swap amount", value: "orderAmount" },
      { text: "Order amount for", value: "orderAmountFor" },
      { text: "Swap amount for", value: "swapAmountFor" },
      { text: "Profit", value: "profit" },
      { text: "Error", value: "error" },
    ],
    sortBy: 'createdAt',
    sortDesc: true,
    loading: true,
    computed: {
      profit: function() {
        return this.item.fat +
          this.item.carbs +
          this.item.protein
      }
    },
  }),

  created () {
    this.initialize()
  },

  methods: {
    async initialize() {
      const { tradesRef } = this.$cradle
      const tr = await tradesRef
      tr.on('value', this.onDataChange)
    },

    onDataChange(items) {
      let trades = []

      items.forEach((item) => {
        let key = item.key
        let trade = item.val()

        trade.key = key

        trades.push(trade)
      });

      this.trades = trades
      this.loading = false
    },

    todate(value) {
      return typeof value == 'undefined' ? '' : new Date(value).toLocaleString()
    },
  },
};
</script>
