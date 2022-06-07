const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const config = fs.existsSync('./config.js') ? require('./config') : require('./defaultconfig');

// Configure Vue Specific set up

console.log("Setting up normal app!");
app.use(express.static(__dirname + "/dist"));

// Configure secrets and variables

let mongooseConnectionString = '';
let hostPort = 3000;

if (process.env.NODE_ENV == 'production') {
  mongooseConnectionString = process.env.mongoDBConnectionString;
  config.secret = process.env.secret;
  config.multichainPort = process.env.multichainPort;
  config.multichainHost = process.env.multichainHost;
  config.multichainUser = process.env.multichainUser;
  config.multichainPassword = process.env.multichainPassword;
  config.sessionSecret = process.env.sessionSecret;
  config.adminMultichainAddress = process.env.adminMultichainAddress;
  config.adminMultichainPrivKey = process.env.adminMultichainPrivKey;
  hostPort = 80;
  console.log("Running in production mode");
} else {
  mongooseConnectionString = config.mongoDBConnectionString;
  hostPort = process.env.PORT || 3000;
  console.log("Running in dev mode");
}

// Multichain connect set up

let multichain = require("./multichain-node-local/index.js")({
  port: config.multichainPort,
  host: config.multichainHost,
  user: config.multichainUser,
  pass: config.multichainPassword,
});

// Coin name
let coinName = "ihatecryptocoin";
let coinUnits = 0.01;

async function setUpMultichain() {
  let importaddressrresponse = await multichain.importAddress({ address: config.adminMultichainAddress });
  let privkeyresponse = await multichain.importPrivKey({ privkey: config.adminMultichainPrivKey });
  let subscribeResponse = await multichain.subscribe(["ihatecryptocoin"]);
}

setUpMultichain();

const JWTTimeout = 43200;
const mineTimeoutCounter = 5;

/* MONGOOSE SETUP */

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const Schema = mongoose.Schema;
const UserDetail = new Schema({
  username: String,
  password: String
}, { collection: 'usercollection' });

const WalletInfo = new Schema({
  username: String,
  walletID: String,
  publicKey: String,
  privateKey: String,
  address: String,
  lastMineDate: Date,
  coinAmount: Number,
  transactions: [String],
})

mongoose.connect(mongooseConnectionString,
  { useNewUrlParser: true, useUnifiedTopology: true });

UserDetail.plugin(passportLocalMongoose);
const UserDetails = mongoose.model('userInfo', UserDetail, 'userInfo');
const WalletDetails = mongoose.model('walletInfo', WalletInfo, 'walletInfo');

// More server set up
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: MongoStore.create({
    mongoUrl: mongooseConnectionString,
    ttl: 24 * 60 * 60 * 1000,
    autoRemove: 'interval',
    autoRemoveInterval: 10
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2 // 2 weeks
  }
}));

const port = hostPort;
app.listen(port, () => console.log('App listening on port ' + port));

const passport = require('passport');

app.use(passport.initialize());
app.use(passport.session());

/* PASSPORT LOCAL AUTHENTICATION */

passport.use(UserDetails.createStrategy());

passport.serializeUser(UserDetails.serializeUser());
passport.deserializeUser(UserDetails.deserializeUser());

// Helper Functions

function hex2a(hexx) {
  var hex = hexx.toString();//force conversion
  var str = '';
  for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

function getUserFromUsername(inputUsername, callback) {
  // Find the user
  WalletDetails.find({ username: inputUsername }, (err, docs) => {
    if (err) {
      callback({ message: "Server failure on search" }, null);
    } else {

      if (!docs[0]) {
        callback({ message: "Error while obtaining user" }, null);
      } else {
        callback(null, docs);
      }
    }
  });
}

async function getUserCoinCount(inputWallet) {
  try {
    let totalBalance = await multichain.getAddressBalances({ address: inputWallet.address });
    let balanceResult = 0;

    // Look for coin name and get balance
    for (let i = 0; i < totalBalance.length; i++) {
      let balanceVisitor = totalBalance[i];
      if (balanceVisitor.name == coinName) {
        balanceResult = balanceVisitor.qty;
      }
    }

    // Save it to MongoDB
    await WalletDetails.updateOne({ '_id': inputWallet._id }, { coinAmount: balanceResult });

    return balanceResult;
  } catch (error) {
    console.log("Couldn't resolve");
    return 0;
  }
}

async function refreshUserCoinCount(inputWallet) {
  let balanceResult = await getUserCoinCount(inputWallet);
  let updateResult = WalletDetails.updateOne({ username: inputWallet.username }, { coinBalance: balanceResult });
  return true;
}

// Middleware function

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, config.secret, (err, user) => {
    if (err) return res.sendStatus(401)
    req.user = user
    next()
  });
}

function returnFailure(messageString) {
  return { success: false, log: messageString };
}

function returnBasicUserInfo(inputUsername, callback) {

  WalletDetails.find({ username: inputUsername }, async function (err, docs) {
    if (err) {
      callback(null);
    } else {
      if (!docs[0]) {
        callback(null);
      } else {
        let coinAmount = await getUserCoinCount(docs[0]);
        var returnValue = {
          username: docs[0].username, walletID: docs[0].walletID,
          coinAmount: coinAmount
        };
        callback(returnValue);
      }
    }
  });
}

/* ROUTES */

const connectEnsureLogin = require('connect-ensure-login');

// User management routes

app.post('/api/login', (req, res, next) => {
  try {
    passport.authenticate('local',
      (err, user, info) => {
        if (err) {
          return res.json(returnFailure('Server error while authenticating'));
        }

        if (!user) {
          return res.json(returnFailure('Failure to login'));
        }

        req.logIn(user, function (err) {
          if (err) {
            return res.json(returnFailure('Failure to login'));
          }

          let token = jwt.sign({ id: user.username }, config.secret, { expiresIn: JWTTimeout });

          returnBasicUserInfo(user.username, (userDataResponse) => {
            let response = { success: true, auth: true, token: token, user: userDataResponse };
            return res.json(response);
          });
        });

      })(req, res, next);
  } catch (error) {
    console.log(error);
  }
});

app.get('/api/user/:username/', authenticateToken, (req, res) => {
  WalletDetails.find({ username: req.params.username }, async function (err, docs) {
    if (err) {
      return res.json(returnFailure('Server error'));
    } else {
      if (!docs[0]) {
        return res.json(returnFailure("Error while obtaining user"));
      } else {
        let coinAmount = await getUserCoinCount(docs[0]);
        var returnValue = {
          success: true, auth: true,
          user: {
            username: docs[0].username, walletID: docs[0].walletID,
            coinAmount: coinAmount
          }
        };
        res.json(returnValue);
      }
    }
  });
});

app.get('/api/logout', function (req, res) {
  req.logout();
  res.redirect('/api/');
});

app.post('/api/register', async function (req, res) {

  UserDetails.exists({ username: req.body.username }, async function (err, result) {
    if (err) {
      return res.json(returnFailure("Server error finding user"));
    } else {

      if (result) {
        return res.json(returnFailure('User already exists'));
      } else {
        let generalWalletID = "";
        UserDetails.register({ username: req.body.username, active: false }, req.body.password, async function (err, user) {
          if (err) {
            console.log(err);
            return res.json(returnFailure('Server failure on registering user'));
          }

          let mineDate = new Date(Date.now());
          mineDate.setSeconds(mineDate.getSeconds() - mineTimeoutCounter)

          let createdKeyPair = await multichain.createKeyPairs({ count: 1 });
          let createdAddress = createdKeyPair[0].address;
          let publicKey = createdKeyPair[0].pubkey;
          let privateKey = createdKeyPair[0].privkey;

          // Add in the initial coins
          try {
            let permissionsRequest = await multichain.grant({ addresses: createdAddress, permissions: "send,receive" });
            let importRequest = await multichain.importAddress({ address: createdAddress, rescan: false });
            let issueRequest = await multichain.issueMore({ address: createdAddress, asset: coinName, qty: 5, units: coinUnits });
          } catch (error) {
            console.log(error);
          }

          // We are storing a private key without hashing or salting. It's bad security practice but luckily this app is just for fun.
          var walletInstance = new WalletDetails({
            username: req.body.username,
            walletID: generalWalletID,
            lastMineDate: mineDate,
            publicKey: publicKey,
            privateKey: privateKey,
            address: createdAddress,
            transactions: [],
          });

          walletInstance.save(function (err) {
            if (err) {
              return res.json(returnFailure('Server failure on registering user'));
            }

            let token = jwt.sign({ id: req.body.username }, config.secret, { expiresIn: JWTTimeout });
            returnBasicUserInfo(user.username, (userDataResponse) => {
              let response = { success: true, auth: true, token: token, user: userDataResponse };
              return res.json(response);
            });
          });
        });
      }
    }
  });
});

// coin routes

app.get('/api/clickmine', authenticateToken, function (req, res) {

  // Check if I can mine
  getUserFromUsername(req.user.id, async function (err, docs) {
    if (err) {
      return res.json(returnFailure(err.message));
    } else {
      let newMineDate = docs[0].lastMineDate;
      newMineDate.setSeconds(newMineDate.getSeconds() + mineTimeoutCounter);
      let returnedWallet = docs[0];

      if (Date.now() > newMineDate) {
        // You can mine
        // Grant a new coin
        let importRequest = await multichain.importAddress({ address: returnedWallet.address, rescan: false });
        let issueRequest = await multichain.issueMore({ address: returnedWallet.address, asset: coinName, qty: 1, units: coinUnits });

        let balanceResult = await getUserCoinCount(returnedWallet);

        WalletDetails.updateOne({ username: req.user.id },
          { lastMineDate: Date.now() }, (err, response) => {
            if (err) {
              return res.json(returnFailure('Server failure on update'));
            } else {
              returnBasicUserInfo(req.user.id, (userDataResponse) => {
                let response = { success: true, auth: true, user: userDataResponse };
                return res.json(response);
              })
            }
          });

      } else {
        return res.json(returnFailure("Server request rate limited"));
      }
    }
  });

});

app.post('/api/blocklist', (req, res) => {

  multichain.listBlocks({ "blocks": req.body.inputBlockRange, "verbose": true }, (error, response) => {
    if (error) {
      return res.json(returnFailure(error.message));
    } else if (response.length > 30) {
      return res.json(returnFailure("Too many blocks requested max is 30"));
    } else {
      let returnValue = {};
      returnValue.success = true;
      returnValue.blockList = [];

      const variableCopyList = ["hash", "miner", "confirmations", "height", "time"];

      response.forEach((record) => {
        let newResponseItem = {};

        variableCopyList.forEach((copyValueKey) => {
          newResponseItem[copyValueKey] = record[copyValueKey];
        });

        returnValue.blockList.push(newResponseItem);
      })

      let sortFunction = function (prop) {
        return function (a, b) {
          if (a[prop] > b[prop]) {
            return -1;
          } else if (a[prop] < b[prop]) {
            return 1;
          }
          return 0;
        }
      }

      returnValue.blockList.sort(sortFunction("height"));

      return res.json(returnValue);
    }
  });
});

app.post('/api/formattedblocklist', async (req, res) => {

  let queryBlockList = [];
  let returnBlockList = [];
  let blockchainHeight = 0;
  let error, response = null;
  const inputBlockRange = req.body.inputBlockRange;

  let startTransactionIndex = 0;
  let transactionNumberCount = 0;


  // Get blockchain height
  try {
    response = await multichain.getInfo();
    blockchainHeight = response.blocks;
  } catch (error) {
    return res.json(returnFailure(error.message));
  }

  try {
    let blockResponse = await multichain.listBlocks({ "blocks": inputBlockRange, "verbose": true });

    // For each block in the response
    for (let i = 0; i < blockResponse.length; i++) {
      let blockVisitor = blockResponse[i];
      let blockInfo = await multichain.getBlock({ "hash": blockVisitor.hash, "verbose": 4 });

      let transactionTypesArray = [];

      // Mark the block for detailed processing later
      for (let j = 0; j < blockInfo.tx.length; j++) {
        let blockInfoTxVisitor = blockInfo.tx[j];

        for (let k = 0; k < blockInfoTxVisitor.vout.length; k++) {
          let voutVisitor = blockInfoTxVisitor.vout[k];
          let blockInfoString = JSON.stringify(voutVisitor);

          if (blockInfoString.includes(coinName)) {

            let addedTransactions = 0;
            if (blockInfoString.includes("\"type\":\"issuemore\"")) {
              addedTransactions += 1;
              transactionTypesArray.push({ type: "issuemore", txIndex: j, voutIndex: k });
            }

            if (blockInfoString.includes("\"type\":\"transfer\"")) {
              addedTransactions += 1;
              transactionTypesArray.push({ type: "transfer", txIndex: j, voutIndex: k });
            }

            if (blockInfoString.includes("\"type\":\"issuefirst\"")) {
              addedTransactions += 1;
              transactionTypesArray.push({ type: "issuefirst", txIndex: j, voutIndex: k });
            }

            if (addedTransactions != 1) {
              console.log("Detected an unknown transaction at block: ", blockInfo.height, " txIndex: ", j, " voutIndex: ", k);
            }

          }
        }
      }

      queryBlockList.push({ blockInfo: blockInfo, transactionTypesIncluded: transactionTypesArray });
    }

    // Post process the blocks to a return item
    const variableCopyList = ["hash", "miner", "confirmations", "height", "time"];

    for (let i = 0; i < queryBlockList.length; i++) {
      let queryBlockVisitor = queryBlockList[i];
      let blockInfo = queryBlockVisitor.blockInfo;
      let returnBlockItem = {};

      // Add key variables to top
      variableCopyList.forEach((copyValueKey) => {
        returnBlockItem[copyValueKey] = queryBlockVisitor.blockInfo[copyValueKey];
      });

      // Add vout lists
      returnBlockItem.vout = [];
      queryBlockVisitor.blockInfo.tx.forEach((txValue) => {
        returnBlockItem.vout.push(txValue.vout);
      });

      // Pull in relevant info based on transactions
      returnBlockItem.transactionList = [];
      for (let i = 0; i < queryBlockVisitor.transactionTypesIncluded.length; i++) {
        let transactionTypeVisitor = queryBlockVisitor.transactionTypesIncluded[i];
        let addedOutputTransaction = {};

        // Add in values we care about
        addedOutputTransaction.type = transactionTypeVisitor.type;

        let txInfo = blockInfo.tx[transactionTypeVisitor.txIndex];
        let voutInfo = txInfo.vout[transactionTypeVisitor.voutIndex];
        let txID = txInfo.txid;

        let assetTransactionResponse = await multichain.getAssetTransaction({ asset: "ihatecryptocoin", txid: txID });
        let addressList = Object.keys(assetTransactionResponse.addresses);

        let toAddresses = [];
        let fromAddresses = [];
        let amount = null;

        for (let j = 0; j < addressList.length; j++) {
          let addressVisitor = addressList[j];
          if (assetTransactionResponse.addresses[addressVisitor] > 0) {
            toAddresses.push(addressVisitor);
            amount = assetTransactionResponse.addresses[addressVisitor];
          } else {
            fromAddresses.push(addressVisitor);
          }
        }

        addedOutputTransaction.toAddress = toAddresses[0];
        addedOutputTransaction.fromAddress = fromAddresses[0];
        addedOutputTransaction.amount = amount;

        returnBlockItem.transactionList.push(addedOutputTransaction);
      }

      returnBlockList.push(returnBlockItem);
    }

    // Sort return block list by height
    returnBlockList.sort((a, b) => { return b.height - a.height });

    // Return block list
    let returnValue = {};
    returnValue.success = true;
    returnValue.blockList = returnBlockList;

    return res.json(returnValue);

  } catch (error) {
    return res.json(returnFailure(error));
  }

});

app.post('/api/blockinfo', (req, res) => {

  multichain.getBlock({ "hash": req.body.inputHash, "verbose": 4 }, (error, response) => {
    if (error) {
      return res.json(returnFailure(error.message));
    } else {

      let returnValue = {};
      returnValue.success = true;
      returnValue.block = response;

      let txArray = [];

      response.tx.forEach((txValue) => {
        txArray.push(txValue.vout);
      });

      returnValue.block.vout = txArray;

      return res.json(returnValue);
    }
  });
});

// Website specific API calls

app.get('/api/topcoinholders', authenticateToken, function (req, res) {

  WalletDetails.find({}).sort('-coinAmount').limit(9).exec(async function (err, response) {
    if (err) {
      return res.json(returnFailure(["Server failure getting top coin holders", err]));
    } else {
      let returnValue = {};
      returnValue.success = true;
      returnValue.topUsers = [];

      await Promise.all(response.map(async function (record) {
        let coinAmount = await getUserCoinCount(record);
        returnValue.topUsers.push({ "username": record.username, "coinAmount": coinAmount });
      }));

      return res.json(returnValue);
    }
  });
});

app.post('/api/searchusers', authenticateToken, (req, res) => {

  const inputusername = req.body.inputusername;

  WalletDetails.find({ "username": { "$regex": inputusername, "$options": "gi" } }).limit(20).exec((err, response) => {
    if (err) {
      return res.json(returnFailure("Server failure searching users"));
    } else {
      let returnValue = {};
      returnValue.success = true;
      returnValue.topUsers = [];

      response.forEach((record) => {
        returnValue.topUsers.push(record.username);
      })

      return res.json(returnValue);
    }
  });
});

app.post('/api/transfercoin', authenticateToken, async function (req, res) {
  try {
    const inputusername = req.body.inputusername;
    const transferamount = parseInt(req.body.coinamount);
    const senderusername = req.user.id;

    let senderWallet = (await WalletDetails.find({ username: senderusername }))[0];
    let receiverWallet = (await WalletDetails.find({ username: inputusername }))[0];

    let createRawSend = await multichain.createRawSendFrom({ from: senderWallet.address, amounts: { [receiverWallet.address]: { [coinName]: transferamount } } });
    let hexBlob = createRawSend;
    let inputString = [hexBlob, [], [senderWallet.privateKey]];
    let signTransaction = await multichain.signRawTransaction(inputString);
    let newHexBlob = signTransaction.hex;
    let sendTransaction = await multichain.sendRawTransaction({ hexstring: newHexBlob });

    await Promise.all([refreshUserCoinCount(senderWallet), refreshUserCoinCount(receiverWallet)]);

  } catch (error) {
    return res.json(returnFailure(error));
  }
});
