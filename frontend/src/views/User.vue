<template>
  <div class="pageContent">
    <b-container>
      <h1>User details</h1>
      <h3>Username: {{ user.username }}</h3>
      <h3>Your wallet address: {{ user.wallet }}</h3>
      <h3>IHateCryptoCoin balance: {{ user.coinAmount }}</h3>
      <div class="buttonSelect">
        <router-link class="btn btn-primary" to="/clickmine"
          >Start mining!</router-link
        >
      </div>
      <br /><br /><br />
      <h5>Get your IHateCryptoCoins locally on your machine and connect to the network!</h5>
      <p>
        IHateCryptoCoin runs on a cryptocurrency base platform called
        <a href="https://www.multichain.com/">MultiChain</a>. You can create
        your own multichain node and transfer funds from this site directly to
        your wallet where you can use them however you like. The steps to do
        that are listed below:
      </p>
      <ul>
        <li>
          Install MultiChain
          <a href="https://www.multichain.com/download-community/"
            >using this documentation</a
          >
        </li>
        <li>
          Connect to a IHateCryptoCoin node by running: <br />
          <code>multichaind ihatecryptocoin@gitgudissuesdb.westus.cloudapp.azure.com:2765 -daemon</code>
        </li>
        <li>
          Ensure that your node is running correctly by seeing
          <code>"Node ready."</code> in the output.
        </li>
        <li>
          You are now set up and have a running node! Move on to transfer funds
          in or out of your account. You can learn more about doing that via <a href="https://www.multichain.com/getting-started/#:~:text=Assets%20and%20Tokens%20(optional)">the multichain-cli here</a>
        </li>
      </ul>
    </b-container>
  </div>
</template>

<script>
import router from "../router";

export default {
  name: "About",
  data() {
    return {
      user: this.$store.state.user,
    };
  },
  methods: {},
  mounted() {
    this.$http.defaults.headers.common["Authorization"] =
      this.$store.state.token;
    this.$http
      .get("/api/user/" + this.$route.params.username + "/")
      .then((response) => {
        const someUserData = response.data.user;
        this.user = someUserData;
      });
  },
};
</script>
