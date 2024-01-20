<template>
  <v-layout align-center justify-center>
    <v-flex xs12 sm8 md4>
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>Login</v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          <v-form>
              <v-text-field
                name="email"
                label="Email"
                type="text"
                v-model="email"
              ></v-text-field>
              <v-text-field
                id="password"
                name="password"
                label="Password"
                type="password"
                v-model="password"
              ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="doLogin">Login</v-btn>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>

export default {
  name: "Login",
  inject: ["$cradle"],

  data: () => ({
    email: '',
    password: ''
  }),

  created() {
    this.initialize();
  },

  methods: {
    async initialize() {
      const { firebase } = this.$cradle;
      this.firebase = firebase
    },

    doLogin: function() {
      this.firebase.auth().signInWithEmailAndPassword(this.email, this.password)
        .then((result) => {
          this.$emit('loggedIn', result)
        })
        .catch((err) => {
          console.log(err); // This will give you all the information needed to further debug any errors
        });
    }
  },
};

</script>
