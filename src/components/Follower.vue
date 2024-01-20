<template>
  <v-data-table
    :headers="headers"
    :items="states"
    :sort-by.sync="sortBy"
    :sort-desc.sync="sortDesc"
  >

    <template v-slot:item.updatedAt="{ item }">
      <span>{{ todate(item.updatedAt) }}</span>
    </template>

    <template v-slot:top>
      <v-toolbar flat>
        <v-spacer />
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
        @click="deleteItem(item)"
      >
        mdi-delete
      </v-icon>
    </template>
  </v-data-table>
</template>

<script>


export default {
  name: "Follower",
  inject: ["$cradle"],

  data: () => ({
    states: [],
    dialogDelete: false,
    editedIndex: -1,
    headers: [
      { text: "Updated at", value: "updatedAt" },
      { text: "Tx id", value: "txid" },
      { text: "State", value: "state" },
      { text: "Type", value: "type" },
      { text: 'Actions', value: 'actions', sortable: false },
    ],
    sortBy: 'updatedAt',
    sortDesc: true,
  }),

  watch: {
    dialogDelete(val) {
      val || this.closeDelete();
    },
  },

  created() {
    this.initialize();
  },

  methods: {
    async initialize() {
      const { stateRef } = this.$cradle;
      const sr = await stateRef
      sr.on('value', this.onDataChange)

      this.stateRef = sr
    },

    onDataChange(items) {
      let states = [];

      items.forEach((item) => {
        let key = item.key;
        let state = item.val();
        state.key = key

        states.push(state)
      });

      this.states = states;
    },

    deleteItem(item) {
      this.editedIndex = this.states.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialogDelete = true;
    },

    deleteItemConfirm() {
      this.states.splice(this.editedIndex, 1);
      this.stateRef.child(this.editedItem.key).remove()
      this.closeDelete();
    },

    closeDelete() {
      this.dialogDelete = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      });
    },

    todate(value) {
      return typeof value == 'undefined' ? '' : new Date(value).toLocaleString()
    },
  },

};
</script>
