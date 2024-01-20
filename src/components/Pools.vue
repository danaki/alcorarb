<template>
  <v-data-table
    :headers="headers"
    :items="pools"
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
  name: "Pools",
  inject: ["$cradle"],

  data: () => ({
    pools: [],
    search: "",
    headers: [
      { text: "Id", value: "id" },
      { text: "Market", value: "market" },
      { text: "Base", value: "base", align: "right" },
      { text: "Quote", value: "quote", align: "right" },
      { text: "Price", value: "basePrice", align: "right" },
      { text: "Fee", value: "fee", align: "right" },
      { text: "Base Quantity", value: "baseQuantity", align: "right" },
      { text: "Quote Quantity", value: "quoteQuantity", align: "right" },
    ],
    loading: true
  }),

  created () {
    this.initialize()
  },

  methods: {
    initialize() {
      const { alcorSwap } = this.$cradle;

      alcorSwap.all()
        .then((p) => {
          this.pools = p
          this.loading = false
        })
        .catch((err) => {
          this.$toast.error(err)
        })
    }
  }
};
</script>
