<template>
  <div class="pageContent">
    <b-container>
      <h1>Transfer to a different IHateCryptoCoin site account</h1>
      <hr />
      <div>
        <h2>Top IHateCryptoCoin holders</h2>
        <ul class="group-list">
          <li
            class="group-list-item"
            v-for="topuser in topuserlist"
            :key="topuser.username"
          >
            {{ topuser.username }} : {{ topuser.coinAmount }}
          </li>
        </ul>
      </div>
      <hr />
      <div class="centered-info-box">
        <h2>Send crypto</h2>
        <p v-if="failuretext">{{ failuretext }}</p>
        <p v-if="successtext">{{ successtext }}</p>
        <p>Amount to send:</p>
        <input
          class="form-control max-width-form"
          type="number"
          name="sendamount"
          v-model="input.coinAmount"
          placeholder="Amount..."
          @keyup.enter="search"
        />
        <input
          class="form-control max-width-form"
          type="text"
          name="usernamesearch"
          v-model="input.usernamesearch"
          placeholder="Search username..."
          v-debounce:1s="search"
          @keyup.enter="search"
        />
        <ul class="username-list">
          <li
            class="username-list-item"
            v-for="(searchuser, index) in searchresults"
            :key="index"
          >
            {{ searchuser }}
            <div class="buttonSelect">
              <a v-on:click="transfer(searchuser)" class="btn btn-primary"
                >Send</a
              >
              <a
                class="btn btn-primary"
                v-on:click="transferwithblockchain(searchuser)"
                >Send with blockchain</a
              >
            </div>
          </li>
        </ul>
      </div>
      <div class="small" v-if="searchresults.length > 0">
        <hr />
        <p>
          There are two options: "Send" and "Send with blockchain" why are there
          these differences?
        </p>
        <p>
          The first option "Send" just transfers your coin amount on this site
          iself. The "Send with blockchain" option checks if the user has an
          exisiting multichain wallet and then sends them coins via the
          blockchain to their wallet instead. You can see this transaction on
          the
          <router-link to="Visualizeblockchain"
            >Visualize Blockchain page</router-link
          >
          which is exciting!
        </p>
        <p>
          P.S: If you aren't sure which user to send it to,
          <code>craigaloewen</code> has a Wallet set up 😁
        </p>
      </div>
    </b-container>
  </div>
</template>

<script>
export default {
  name: "Transfer",
  data() {
    return {
      topuserlist: [],
      failuretext: "",
      successtext: "",
      topitemsperrow: 3,
      input: {
        usernamesearch: "",
        coinAmount: 0,
      },
      searchresults: [],
    };
  },
  computed: {
    topUsersRowCount() {
      return Math.ceil(this.topuserlist.length / this.topusersitemsperrow);
    },
  },
  methods: {
    search: function () {
      this.$http
        .post("/api/searchusers", { inputusername: this.input.usernamesearch })
        .then((response) => {
          const returnedData = response.data;
          if (returnedData.success) {
            const returnedUserList = returnedData.topUsers;
            this.searchresults = returnedUserList;
          } else {
            // Failure
            console.log("Failure to transfer", response);
            this.failuretext = response.data.log;
          }
        });
    },
    transfer: function (inputusername) {
      this.clearMessageTexts();
      this.$http
        .post("/api/transfercoin", {
          inputusername: inputusername,
          coinamount: this.input.coinAmount,
        })
        .then((response) => {
          const returnedData = response.data;
          if (returnedData.success) {
            this.$store.dispatch("refreshUserInfo", response.data.user);
            this.successtext = "Successful transfer!";
            this.refreshTopUserList();
          } else {
            // Failure
            console.log("Failure to transfer", response);
            this.failuretext = response.data.log;
          }
        });
    },
    transferwithblockchain: function (inputusername) {
      this.clearMessageTexts();
      this.$http
        .post("/api/transfercoinblockchain", {
          inputusername: inputusername,
          coinamount: this.input.coinAmount,
        })
        .then((response) => {
          const returnedData = response.data;
          if (returnedData.success) {
            this.$store.dispatch("refreshUserInfo", response.data.user);
            this.successtext = "Successful transfer!";
            this.refreshTopUserList();
          } else {
            // Failure
            console.log("Failure to transfer", response);
            this.failuretext = response.data.log;
          }
        });
    },
    refreshTopUserList: function () {
      this.$http.get("/api/topcoinholders").then((response) => {
        const returnedData = response.data;
        if (returnedData.success) {
          const returnedUserList = returnedData.topUsers;
          this.topuserlist = returnedUserList;
        } else {
          // Failure
          console.log("Failure to transfer", response);
          this.failuretext = response.data.log;
        }
      });
    },
    clearMessageTexts: function () {
      this.failuretext = "";
      this.successtext = "";
    },
  },
  mounted() {
    this.refreshTopUserList();
  },
};
</script>

<style>
.group-list {
  display: flex;
  justify-content: left;
  align-items: center;
  list-style-type: none;
  flex-wrap: wrap;
}

.group-list-item {
  width: 33%;
}

.username-list {
  margin-top: 20px;
  list-style-type: none;
}

.username-list-item {
  display: flex;
  align-items: center;
  margin-top: 10px;
  justify-content: flex-end;
}
</style>