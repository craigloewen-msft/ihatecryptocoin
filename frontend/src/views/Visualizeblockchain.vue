<template>
  <div class="pageContent">
    <b-container>
      <h1>Visualize the blockchain</h1>
      <hr />
      <div class="centered-info-box">
        <p class="small muted">
          Sample input: "-20" for last 20 items, "30-40" for a range,
          "100" for a specific item. Click on nodes below for more info.
          Try looking at block 13!
        </p>
        <div class="text-input-flex" style="margin-bottom: 10px">
          <p><b>Search blocks: </b></p>
          <input
            class="form-control max-width-form"
            type="text"
            name="username"
            v-model="input.blockRange"
            placeholder="Block range"
            v-debounce:1s="refreshBlockList"
            @keyup.enter="refreshBlockList"
          />
        </div>
        <p v-if="failuretext">{{ failuretext }}</p>
        <div class="blockchain-info-box">
          <div class="buttonSelect">
            <b-button v-b-toggle.collapse-1 variant="info"
              >Learn more about what this page shows</b-button
            >
          </div>
          <b-collapse id="collapse-1" class="mt-2">
            <b-card>
              <p class="card-text">
                This page shows the exact contents of the full block chain! This
                is literally what 'the blockchain' is. It's what every machine
                sees when they connect to the blockchain and it's how all
                transactions are verified, stored, and added. We show a subset
                of this info, most interesting is the transaction data.
                <br /><br />
                If you load transaction data you'll notice that there are a lot
                of 'OP_RETURN' values, what even are these? These are values
                that return a small amount of information. They're controversial
                since users can use it to store things like: 'contracts' or
                other info on the blockchain, which might add bloat to the
                blockchain. You can learn more about that
                <a
                  href="https://bitcoin.stackexchange.com/questions/29554/explanation-of-what-an-op-return-transaction-looks-like"
                  >here.</a
                >
                <br /><br />
                What even is this block chain based on? It's based on
                <a href="https://www.multichain.com/">multichain</a>! Multichain
                is targeted towards Enterprises who want to manage their own
                blockchain. It was chosen because it was simple, easy for others
                to use and had good configurability. The main alternative would
                be forking another chain like Bitcoin but that seemed like more
                work.
              </p>
            </b-card>
          </b-collapse>
        </div>
      </div>
      <div>
        <ol class="list-group">
          <li
            class="list-group-item"
            v-for="(block, blockindex) in blocklist"
            :key="blockindex"
          >
            <b-container>
              <div class="row">
                <div class="col-md-6">
                  <ul class="block-card-info-list">
                    <li v-for="(value, valuename) in block" :key="valuename">
                      <div
                        v-if="valuename != 'vout' && valuename != 'rawDataView'"
                      >
                        <p class="text-capitalize block-card-info-descriptor">
                          <b>{{ valuename }}</b>
                        </p>
                        <div class="block-card-info-value small">
                          <div v-if="valuename === 'time'">
                            {{ dateFromMS(value) }}
                          </div>
                          <div v-else>{{ value }}</div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <div v-if="block.vout && !block.rawDataView">
                    <p class="text-capitalize lead">
                      <b>Transaction List</b>
                    </p>
                    <div
                      v-for="(
                        transactionDetail, transactionDetailIndex
                      ) in block.vout"
                      :key="transactionDetailIndex"
                    >
                      <div
                        v-for="(
                          transactionDetailNest, transactionDetailNestIndex
                        ) in transactionDetail"
                        :key="transactionDetailNestIndex"
                      >
                        <p class="text-capitalize block-card-info-descriptor">
                          <b
                            >Transaction {{ transactionDetailIndex }}-{{
                              transactionDetailNestIndex
                            }}</b
                          >
                        </p>
                        <p class="block-card-info-value small">
                          {{ transactionDetailNest.scriptPubKey.asm }}
                        </p>
                      </div>
                    </div>
                    <a
                      class="btn btn-info"
                      v-on:click="toggleRawDataBlockView(block)"
                      >Toggle raw data view</a
                    >
                  </div>
                  <div v-else-if="block.vout && block.rawDataView">
                    <p class="block-card-info-value small">{{ block.vout }}</p>
                    <a
                      class="btn btn-info"
                      v-on:click="toggleRawDataBlockView(block)"
                      >Toggle raw data view</a
                    >
                  </div>
                  <div
                    v-on:click="getBlockInfo(block.hash)"
                    class="load-transaction-prompt"
                    v-else
                  >
                    <a class="btn btn-primary">Load transaction data</a>
                  </div>
                </div>
              </div>
            </b-container>
          </li>
        </ol>
      </div>
      <hr />
    </b-container>
  </div>
</template>

<script>
export default {
  name: "Transfer",
  data() {
    return {
      blocklist: [],
      failuretext: "",
      successtext: "",
      input: { blockRange: "-30" },
    };
  },
  methods: {
    refreshBlockList: function () {
      this.failuretext = "";
      this.blocklist = [];

      let queryEndpoint = "";

        queryEndpoint = "/api/formattedblocklist";

      this.$http
        .post(queryEndpoint, {
          inputBlockRange: this.input.blockRange,
        })
        .then((response) => {
          const returnedData = response.data;
          if (returnedData.success) {
            const returnedBlockList = returnedData.blockList;
            this.blocklist = returnedBlockList;
          } else {
            // Failure
            console.log("Failure to transfer", response);
            this.failuretext = response.data.log;
          }
        });
    },
    dateFromMS: function (inputMS) {
      return new Date(parseInt(inputMS) * 1000).toString();
    },
    getBlockInfo: function (inputHash) {
      this.$http
        .post("/api/blockinfo", { inputHash: inputHash })
        .then((response) => {
          const returnedData = response.data;
          if (returnedData.success) {
            const returnedBlock = returnedData.block;

            let vueBlockIndex = this.blocklist.findIndex(
              (el) => el.hash == returnedBlock.hash
            );

            this.$set(
              this.blocklist[vueBlockIndex],
              "vout",
              returnedBlock.vout
            );
          } else {
            // Failure
            console.log("Failure to transfer", response);
            this.failuretext = response.data.log;
          }
        });
    },
    toggleRawDataBlockView: function (inBlock) {
      if (inBlock.rawDataView == true) {
        inBlock.rawDataView = false;
      } else {
        inBlock.rawDataView = true;
      }
      this.$forceUpdate();
    },
    checkIfContainsTransactionData: function (inBlock) {
      let voutString = JSON.stringify(inBlock.vout);

      if (voutString.includes("ihatecryptocoin")) {
        return true;
      } else {
        return false;
      }
    },
  },
  mounted() {
    this.refreshBlockList();
  },
};
</script>

<style>
.text-input-flex {
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.text-input-flex p {
  margin-bottom: 0px;
  margin-right: 5px;
}

.block-card-info-list {
  display: flex;
  flex-direction: column;
  list-style-type: none;
  padding-left: 0px;
}

.block-card-info-descriptor {
  margin-bottom: 0px;
}

.block-card-info-value {
  margin-bottom: 5px;
  word-break: break-all;
}

.load-transaction-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>