<template>
  <v-data-table
    :headers="headers"
    :items="rules"
    :loading="loading"
  >
    <template v-slot:item.dexId="{ item }">
      {{ dex(item.dexId) }}
    </template>

    <template v-slot:item.poolId="{ item }">
      {{ pool(item.dexId) }}
    </template>

    <template v-slot:item.enabled="{ item }">
      <v-simple-checkbox
        v-model="item.enabled"
        disabled
      />
    </template>

    <template v-slot:top>
      <v-toolbar flat>
        <v-spacer />
        <v-dialog
          v-model="dialog"
          max-width="800px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="primary"
              dark
              class="mb-2"
              v-bind="attrs"
              v-on="on"
            >
              New rule
            </v-btn>
          </template>
          <v-card>
            <v-card-title>
              <span class="text-h5">{{ formTitle }}</span>
            </v-card-title>

            <v-card-text>
              <v-container>
                <v-row>
                  <v-col
                    cols="12"
                    sm="6"
                    md="6"
                  >
                    <v-autocomplete
                      v-model="editedItem.dex"
                      :items="dexes"
                      :item-text="(item) => `#${item.id} ${item.market}`"
                      item-value="id"
                      label="Dex"
                      :rules="requiredValidation"
                      persistent-hint
                      return-object
                      single-line
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="6"
                  >
                    <v-text-field
                      v-model="editedItem.amount"
                      :rules="numberValidation"
                      label="Amount"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="6"
                  >
                    <v-text-field
                      v-model="editedItem.profit"
                      :rules="numberValidation"
                      label="Profit %"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="6"
                  >
                    <v-text-field
                      v-model="editedItem.tolerance"
                      :rules="numberValidation"
                      label="Tolerance %"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="6"
                  >
                    <v-select
                      v-model="editedItem.direction"
                      :items="directions"
                      label="Direction"
                      persistent-hint
                      single-line
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="6"
                  >
                    <v-checkbox
                      v-model="editedItem.enabled"
                      label="Enabled"
                    />
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn
                color="blue darken-1"
                text
                @click="close"
              >
                Cancel
              </v-btn>
              <v-btn
                color="blue darken-1"
                text
                @click="save"
              >
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-dialog
          v-model="dialogDelete"
          max-width="500px"
        >
          <v-card>
            <v-card-title
              class="text-h5"
            >
              Are you sure you want to delete this item?
            </v-card-title>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="blue darken-1"
                text
                @click="closeDelete"
              >
                Cancel
              </v-btn>
              <v-btn
                color="blue darken-1"
                text
                @click="deleteItemConfirm"
              >
                OK
              </v-btn>
              <v-spacer />
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-toolbar>
    </template>
    <template v-slot:item.actions="{ item }">
      <v-icon
        small
        class="mr-2"
        @click="editItem(item)"
      >
        mdi-pencil
      </v-icon>
      <v-icon
        small
        @click="deleteItem(item)"
      >
        mdi-delete
      </v-icon>
    </template>
    <template v-slot:no-data>
      <v-btn
        color="primary"
        @click="initialize"
      >
        Reset
      </v-btn>
    </template>
  </v-data-table>
</template>

<script>

import { exchangerListIdMap, exchangerListMarketMap } from "../../lib/util.mjs"


export default {
  name: "Rules",
  inject: ["$cradle"],

  data: () => ({
    rules: [],
    dexes: [],
    poolMarketMap: {},
    directions: [
      { value: 'F', text: 'Forward' },
      { value: 'B', text: 'Backward' }
    ],
    dialog: false,
    dialogDelete: false,
    editedIndex: -1,
    editedItem: {
      dex: undefined,
      pool: undefined,
      amount: -1,
      profit: -1,
      tolerance: -1,
      direction: 'F',
      enabled: false,
    },
    defaultItem: {
      dex: undefined,
      pool: undefined,
      amount: -1,
      profit: -1,
      tolerance: -1,
      direction: 'F',
      enabled: false,
    },
    numberValidation: [
      value => !!value || 'Required.',
      value => (value && parseFloat(value) > 0) || 'Float number > 0',
    ],
    requiredValidation: [
      value => !!value || 'Required.',
    ],
    headers: [
      { text: "Dex", value: "dexId" },
      { text: "Pool", value: "poolId" },
      { text: "Amount", value: "amount" },
      { text: "Profit %", value: "profit" },
      { text: "Tolerance %", value: "tolerance" },
      { text: "Dir", value: "direction" },
      { text: "Enabled", value: "enabled" },
      { text: 'Actions', value: 'actions', sortable: false },
    ],
    loading: true
  }),

  computed: {
    formTitle() {
      return this.editedIndex === -1 ? "New Rule" : "Edit Rule"
    },
  },

  watch: {
    dialog(val) {
      val || this.close();
    },
    dialogDelete(val) {
      val || this.closeDelete();
    },
  },

  created() {
    this.initialize();
  },

  methods: {
    async initialize() {
      const { alcorExchange, alcorSwap, rulesRef } = this.$cradle

      alcorExchange.all()
        .then((d) => {
          this.dexes = d

          alcorSwap.all()
            .then((p) => {
              this.poolMarketMap = exchangerListMarketMap(p)
              this.loading = false
            })
            .catch((err) => {
              this.$toast.error(err)
            })

        })
        .catch((err) => {
          this.$toast.error(err)
        })


      const rr = await rulesRef
      rr.on('value', this.onDataChange)

      this.rulesRef = rr
    },

    onDataChange(items) {
      let rules = []

      items.forEach((item) => {
        let key = item.key
        let rule = item.val()
        rule.key = key

        rules.push(rule)
      })

      this.rules = rules
    },

    editItem(item) {
      this.editedIndex = this.rules.findIndex((el) => item.key == el.key)
      if (this.editedIndex >= 0) {
        item.dex = this.dexes.find((d) => d.id == item.dexId)
      }

      this.editedItem = Object.assign({}, item)
      this.dialog = true
    },

    deleteItem(item) {
      this.editedIndex = this.rules.indexOf(item)
      this.editedItem = Object.assign({}, item)
      this.dialogDelete = true
    },

    deleteItemConfirm() {
      this.rules.splice(this.editedIndex, 1)
      this.rulesRef.child(this.editedItem.key).remove()
      this.closeDelete()
    },

    close() {
      this.dialog = false
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem)
        this.editedIndex = -1
      });
    },

    closeDelete() {
      this.dialogDelete = false
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem)
        this.editedIndex = -1
      });
    },

    save() {
      var item = this.editedItem

      var data = {
        dexId: typeof item.dex == 'undefined' ? -1 : item.dex.id,
        amount: item.amount,
        profit: item.profit,
        tolerance: item.tolerance,
        direction: item.direction,
        enabled: item.enabled
      }

      if (this.editedIndex > -1) {
        this.rulesRef.child(this.editedItem.key).update(data)
      } else {
        this.rulesRef.push(data)
      }
      this.close();
    },

    dex(id) {
      var item = exchangerListIdMap(this.dexes)[id]
      return (typeof item == 'undefined') ? 'INVALID' : `#${item.id} ${item.market}`
    },

    pool(dexId) {
      var dex = exchangerListIdMap(this.dexes)[dexId]
      var poolTuple = (typeof dex == 'undefined') ? undefined : this.poolMarketMap[dex.market]
      return (typeof poolTuple == 'undefined')
        ? 'INVALID'
        : `#${poolTuple[0].id} ${poolTuple[1] ? poolTuple[0].reverse_market : poolTuple[0].market}`
    }
  },

};
</script>
