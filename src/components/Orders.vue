<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="buyorders"
      :search="search"
    >
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
          <v-toolbar-title>Buy orders</v-toolbar-title>
        </v-toolbar>
      </template>

      <template v-slot:item.timestamp="{ item }">
        {{ item.timestamp | moment('YYYY-MM-DD HH:mm') }}
      </template>

      <template v-slot:item.unit_price="{ item }">
        {{ item.unit_price | humanPrice }}
      </template>
    </v-data-table>

    <v-data-table
      :headers="headers"
      :items="sellorders"
      :search="search"
    >
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
          <v-toolbar-title>Sell orders</v-toolbar-title>
        </v-toolbar>
      </template>

      <template v-slot:item.timestamp="{ item }">
        {{ item.timestamp | moment('YYYY-MM-DD HH:mm') }}
      </template>

      <template v-slot:item.unit_price="{ item }">
        {{ item.unit_price | humanPrice }}
      </template>
    </v-data-table>
  </v-container>
</template>

<script>


export default {
  name: "Orders",
  inject: ["$cradle"],

  data: () => ({
    buyorders: [],
    sellorders: [],
    search: "",
    headers: [
      { text: "Id", value: "id", align: "right" },
      { text: "Date", value: "timestamp", align: "right" },
      { text: "Market", value: "market", align: "right" },
      { text: "Bid", value: "bid", align: "right"  },
      { text: "Ask", value: "ask", align: "right" },
      { text: "Price", value: "unit_price", align: "right" },
      { text: 'Actions', value: 'actions', sortable: false },
    ],
  }),

  async created () {
    this.initialize()
  },

  methods: {
    async initialize() {
      const { alcorExchange, wallet } = this.$cradle;

      this.dexes = await alcorExchange.all().then((d) => (this.dexes = d));
      this.wallet = wallet

      this.loadOrders()
    },

    loadOrders() {
      this.wallet.getOrders().then(({buy, sell}) => {
        this.buyorders = buy.map(od => ({
          ...od,
          market: this.dex(od.market_id),
          type: 'buy'
        }))

        this.sellorders = sell.map(od => ({
          ...od,
          market: this.dex(od.market_id),
          type: 'sell'
        }))
      })
    },

    dex(value) {
      var item = this.dexes.find((d) => d.id == value)
      return (typeof item == 'undefined') ? 'INVALID' : `#${item.id} ${item.market}`;
    },
  }
};
</script>
