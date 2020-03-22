var express = require('express');
var router = express.Router();

const { generateKeyPair } = require('crypto');


//Home page
router.get("/", function(req, res){
	res.render("index");
});

router.get("/about", function(req, res){
  res.render("aboutus");
});

//Auth routes
router.get("/sign-doctor", function(req, res){
  res.render("signDoctor");
});

router.get("/sign-patient", function(req, res){
  res.render("signPatient");
});

//Render Explorer
router.get("/explorer", function(req, res){
  res.render("explorer");
});

//Explorer - get all transactions of user from smart contract and display
router.post("/explorer", function(req, res){
  var account = req.body.account;
  req.app.locals.myContract.deployed().then(function(instance) {

            return instance.getAllTransactions.call(account, {from: account});

        }).then(function(result) {
            res.render("explorer", {transactions: result});

        }).catch(function(error) {
            console.log(error);
            res.redirect("/");
        });
});

//Detect Metamask account switch and set session again and redirect
router.post("/account-switch", function(req, res){
  var newAccount = req.body.newaccount;

  if(req.session.currentUser) {
    req.session.currentUser = newAccount;
    res.redirect("/dashboard");
  } else {
    res.redirect("/");
  }
});

//Register doctor - gen pub/priv keys - write pubKey to smart contract, send privKey
router.post("/register-doctor", function(req, res){
  var newUser = req.body.username;
  var account = req.body.account;

  if(newUser == "" || newUser == null) {
    res.redirect("/sign-doctor");
  } else {
    req.session.currentUser = account;

    generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'top secret'
      }
    }, (err, publicKey, privateKey) => {
        if(err) {
          res.redirect("/");
        }
        res.render("dashboard", {privKey: privateKey, name: newUser, pubKey: publicKey, userType: "Doctor", account: account});
    });
  }
});

//Register patient - gen pub/priv keys - write pubKey to smart contract, send privKey
router.post("/register-patient", function(req, res){
	var newUser = req.body.username;
	var account = req.body.account;
  if(newUser == "" || newUser == null) {
    res.redirect("/sign-patient");
  } else {
    req.session.currentUser = account;

    generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'top secret'
      }
    }, (err, publicKey, privateKey) => {
        if(err) {
          res.redirect("/");
        }
        res.render("dashboard", {privKey: privateKey, name: newUser, pubKey: publicKey, userType: "Patient", account: account});
    });
  }
});

//Login User - check current account
router.post("/login", function(req, res){
  var account = req.body.account1;
  if(account == "" || account == null) {
    res.redirect("/");
  } else {
    if(req.session.currentUser) {
      res.redirect("/dashboard");
    } else {
      req.session.currentUser = account;
      res.redirect("/dashboard");
    }
  }

});

//Render dashboard - get user name from contract
router.get("/dashboard", function(req, res){

  if(req.session.currentUser) {

    var account = req.session.currentUser;

    req.app.locals.myContract.deployed().then(function(instance) {

            return instance.getUserName.call({from: account});

    }).then(function(result){
            console.log(result+" logged in");
            res.render("dashboard", {name: result, account: account});
    }).catch(function(error) {
        console.log(error);
        res.redirect("/");
    });

  } else {
    res.redirect("/");
  }
});

module.exports = router;