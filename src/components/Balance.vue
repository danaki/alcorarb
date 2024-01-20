<template>
  <v-container>
    <div class="row row--dense">
      <div class="col-sm-6 col-lg-4 col-12 overflow-hidden v-sheet v-sheet--outlined theme--light rounded">
        <v-progress-linear
          :value="cpu"
          striped
          height="50"
          color="amber"
        >
          <strong>CPU: {{ cpu }}% ({{ cpu_limit_used }} of {{ cpu_limit_max }})</strong>
        </v-progress-linear>
      </div>

      <div class="col-sm-6 col-lg-4 col-12 overflow-hidden v-sheet v-sheet--outlined theme--light rounded">
        <v-progress-linear
          :value="ram"
          striped
          height="50"
          color="lime"
        >
          <strong>RAM: {{ ram }}% ({{ ram_usage }} of {{ ram_quota }})</strong>
        </v-progress-linear>
      </div>

      <div class="col-sm-6 col-lg-4 col-12 overflow-hidden v-sheet v-sheet--outlined theme--light rounded">
        <v-progress-linear
          :value="net"
          striped
          height="50"
          color="light-blue"
        >
          <strong>NET: {{ net }}% ({{ net_limit_used }} of {{ net_limit_max }})</strong>
        </v-progress-linear>
      </div>
    </div>

    <br />

    <v-data-table
      :headers="headers"
      :items="balances"
      :search="search"
      :sort-by.sync="sortBy"
      :sort-desc.sync="sortDesc"
      :loading="loading"
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
          <v-toolbar-title>Balance</v-toolbar-title>
        </v-toolbar>
      </template>

      <template v-slot:body.append>
        <tr class="sticky-table-footer">
          <td v-text="''" />
          <td v-text="'Total'" class="text-right"/>
          <td v-text="sumWax" class="text-right"/>
        </tr>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>

import { exchangerListMarketMap } from "../../lib/util.mjs"
import { asset } from "eos-common"

export default {
  name: "Balance",
  inject: ["$cradle"],

  data: () => ({
    cpu: 0,
    ram: 0,
    net: 0,
    cpu_limit_used: 0,
    cpu_limit_max: 0,
    ram_usage: 0,
    ram_quota: 0,
    net_limit_used: 0,
    net_limit_max: 0,
    balances: [],
    limits: {},
    search: "",
    headers: [
      { text: "Quantity", value: "quantity", align: "right" },
      { text: "Contract", value: "contract", align: "right" },
      { text: "WAX converted", value: "wax", align: "right" },
    ],
    sumWax: null,
    sortBy: 'wax',
    sortDesc: true,
    loading: true
  }),

  created () {
    this.initialize()
  },

  methods: {
    async initialize() {
      const { wallet, alcorSwap } = this.$cradle

      alcorSwap.all()
        .then((pools) => {
          const poolMarketMap = exchangerListMarketMap(pools)
          console.log(poolMarketMap)
          wallet.getBalances().then((balances) => {
            var sumWax = asset("0 8,WAX")

            this.balances = balances.map(b => {
              var other = b.quantity.symbol.toString(false) + '@' + b.contract
              var market = 'WAX@eosio.token_' + other
              var poolTuple = poolMarketMap[market]

              var q
              if (other == 'WAX@eosio.token') {
                q = b.quantity
              } else if (typeof poolTuple != 'undefined') {
                var [pool, isReverse] = poolTuple
                q = pool.quoteToBaseAsset(b.quantity)
              }

              if (typeof q != 'undefined') {
                sumWax = sumWax.plus(q)
              }

              return {...b, ...{wax: q}}
            })

            this.sumWax = sumWax
            this.loading = false
          })
        })

      wallet.loadAccountData()
        .then((data) => {
          this.cpu_limit_used = data.cpu_limit.used
          this.cpu_limit_max = data.cpu_limit.max
          this.ram_usage = data.ram_usage
          this.ram_quota = data.ram_quota
          this.net_limit_used = data.net_limit.used
          this.net_limit_max = data.net_limit.max

          this.cpu = Math.ceil(this.cpu_limit_used / this.cpu_limit_max * 100)
          this.ram = Math.ceil(this.ram_usage / this.ram_quota * 100)
          this.net = Math.ceil(this.net_limit_used / this.net_limit_max * 100)
        })
        .catch((err) => {
          this.$toast.error(err)
        })
    }
  },
};
</script>

<style scoped>
.sticky-table-footer td {
  font-weight: bold;
  position: sticky;
  bottom: 0;
  background-color: white;
  border-top: thin solid rgba(0,0,0,.12);
}
</style>
