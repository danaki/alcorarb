<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="services"
      :search="search"
    >
      <template v-slot:item.lastSeenAt="{ item }">
        <span :style="[ ago(item.lastSeenAt) < -30 ? {'color': 'red'} : {} ]">{{ todate(item.lastSeenAt) }}</span>
      </template>

      <template v-slot:item.lastSeenErrorAt="{ item }">
        <span>{{ todate(item.lastSeenErrorAt) }}</span>
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
          <v-toolbar-title>Services</v-toolbar-title>
        </v-toolbar>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>

export default {
  name: "Services",
  inject: ["$cradle"],

  data: () => ({
    services: [],
    search: "",
    headers: [
      { text: "Service", value: "key" },
      { text: "Last seen", value: "lastSeenAt" },
      { text: "Last error", value: "error" },
      { text: "Error last seen", value: "lastSeenErrorAt" },
    ],
  }),

  created () {
    this.initialize()
  },

  methods: {
    async initialize() {
      const { livenessRef } = this.$cradle
      const lr = await livenessRef
      lr.on('value', this.onDataChange)
    },

    onDataChange(items) {
      let services = []

      items.forEach((item) => {
        let key = item.key
        let service = item.val()

        service.key = key

        services.push(service)
      });

      this.services = services
    },

    ago(value) {
      return typeof value == 'undefined' ? '' : Math.round((value - Date.now()) / 1000)
    },

    todate(value) {
      return typeof value == 'undefined' ? '' : new Date(value).toLocaleString()
    },
  },
};
</script>
