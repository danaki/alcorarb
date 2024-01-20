<template>
  <v-app>
    <v-app-bar app light>
      <v-tabs v-if="user" centered>
        <v-tab to="/balance">Balance</v-tab>
        <v-tab to="/exchanges">Exchanges</v-tab>
        <v-tab to="/pools">Pools</v-tab>
        <v-tab to="/rules">Rules</v-tab>
        <v-tab to="/updater">Updater</v-tab>
        <v-tab to="/follower">Follower</v-tab>
        <v-tab to="/trades">Trades</v-tab>
        <v-tab to="/orders">Orders</v-tab>
        <v-tab to="/services">Liveness</v-tab>
        <v-tab @click="logout()">Logout {{ user.email }}</v-tab>
      </v-tabs>
      <v-tabs v-if="!user" centered>
        <v-tab to="/login">Login</v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <v-container class="lighten-5">
        <router-view @loggedIn="loggedIn" v-if="(this.user && $route.name != 'login') || (! this.user && $route.name == 'login')"></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>


export default {
  name: "App",
  inject: ["$cradle"],

  data: () => ({
    user: false
  }),

  created() {
    this.initialize();
  },

  methods: {
    async initialize() {
      const { firebase } = this.$cradle
      this.firebase = firebase

      if (! this.user && this.$route.name !== 'login') {
        this.$router.push("login")
      } else {
        this.user = this.firebase.auth().currentUser
      }
    },

    loggedIn: function (r) {
      this.user = r.user
      this.$router.push("balance")
    },

    logout: function () {
      this.firebase
        .auth()
        .signOut()
        .then(() => {
          this.user = null
          this.$router.push("login")
        })
    }
  },

  watch: {
  	'$route': function(value) {
			if (value == null) {
        this.$router.push("login")
      }
    }
  }
};
</script>
