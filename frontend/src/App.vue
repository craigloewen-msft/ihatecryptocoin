<template>
  <div id="app">
    <b-navbar toggleable="lg" type="dark" variant="dark">
      <b-container>
        <router-link class="navbar-brand" to="/">IHateCryptoCoin</router-link>

        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <Bootstrapnavlinkcustom to="/about">About</Bootstrapnavlinkcustom>
            <Bootstrapnavlinkcustom to="/visualizeblockchain"
              >Visualize Blockchain</Bootstrapnavlinkcustom
            >
          </b-navbar-nav>
          <b-navbar-nav v-if="isLoggedIn">
            <Bootstrapnavlinkcustom to="/clickmine"
              >Mine Coin</Bootstrapnavlinkcustom
            >
            <Bootstrapnavlinkcustom to="/transfer"
              >Transfer</Bootstrapnavlinkcustom
            >
          </b-navbar-nav>

          <b-navbar-nav
            v-if="isLoggedIn"
            class="ml-auto"
            style="margin-left: auto"
            is-nav
          >
            <Bootstrapnavlinkcustom :to="'/user/' + user.username"
              >{{ user.username }} ({{
                user.coinAmount
              }})</Bootstrapnavlinkcustom
            >
            <Bootstrapnavlinkcustom to="/logout">Logout</Bootstrapnavlinkcustom>
          </b-navbar-nav>
          <b-navbar-nav
            v-if="!isLoggedIn"
            class="ml-auto"
            style="margin-left: auto"
            is-nav
          >
            <Bootstrapnavlinkcustom to="/login">Login</Bootstrapnavlinkcustom>
            <Bootstrapnavlinkcustom to="/register"
              >Register</Bootstrapnavlinkcustom
            >
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>

    <router-view />
  </div>
</template>

<script>
import Bootstrapnavlinkcustom from "./components/BootstrapNavlinkCustom";

export default {
  name: "App",
  components: {
    Bootstrapnavlinkcustom,
  },
  computed: {
    isLoggedIn: function () {
      return this.$store.getters.isLoggedIn;
    },
    user: function () {
      return this.$store.state.user;
    },
  },
  created: function () {
    // Handle expired tokens case
    const storeRef = this.$store;
    const routerRef = this.$router;

    var errorResponseFunc = function (err) {
      var returnPromiseFunc = function (storeRef, routerRef) {
        return new Promise(function (resolve, reject) {
          if (err.response.status === 401) {
            storeRef.dispatch("logout");
            routerRef.push("/");
          }
        });
      };

      return returnPromiseFunc(storeRef, routerRef);
    };

    this.$http.interceptors.response.use(
      undefined,
      errorResponseFunc.bind(this)
    );
  },
};
</script>


<style>
#app {
  /* font-family: "Nunito", sans-serif; */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

body {
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.pageContent {
  margin-top: 150px;
}

.pageContent h1 {
  color: rgb(13, 0, 78);
}

.topNavigateBackContainer {
  display: flex;
  margin-bottom: 5px;
}

.footer {
  margin-top: auto;
  bottom: 0;
  width: 100%;
  height: 60px;
  line-height: 60px;
  background-color: #212529;
}

.img-responsive {
  display: block;
  width: 100%;
  height: auto;
}

.centered-info-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
}

.max-width-form {
  max-width: 400px;
}

.buttonSelect {
  display: flex;
  justify-content: center;
}

.buttonSelect a {
  margin-left: 5px;
  margin-right: 5px;
}

.buttonSelect button {
  margin-left: 5px;
  margin-right: 5px;
}
</style>
