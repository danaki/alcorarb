<template>
  <v-data-table
    :headers="headers"
    :items="dexes"
    :search="search"
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
      </v-toolbar>
    </template>
  </v-data-table>
</template>

<script>

export default {
  name: "Exchanges",
  inject: ["$cradle"],

  data: () => ({
    dexes: [],
    search: "",
    headers: [
      { text: "Id", value: "id" },
      { text: "Market", value: "market" },
      { text: "Base", value: "base", align: "right" },
      { text: "Quote", value: "quote", align: "right" },
      { text: "Min buy", value: "minBuy", align: "right" },
      { text: "Min sell", value: "minSell", align: "right" },
      { text: "Fee", value: "fee", align: "right" },
    ],
    loading: true
  }),

  created () {
    this.initialize()
  },

  methods: {
    initialize() {
      const { alcorExchange } = this.$cradle;

      alcorExchange.all()
        .then((d) => {
          console.log(d)
          this.dexes = d
          this.loading = false
        })
        .catch((err) => {
          this.$toast.error(err)
        })
    }
  }
};
</script>
