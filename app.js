require('dotenv').config();
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');

var Web3            = require('web3');
var contract        = require("@truffle/contract");
var path            = require('path');
var MyContractJSON  = require(path.join(__dirname, 'build/contracts/BlockEHR.json'));

var port = process.env.PORT || 8080;

// Setup RPC connection
var provider    = new Web3.providers.HttpProvider(process.env.HTTP_PROVIDER);

// Read JSON and attach RPC connection (Provider) from web3
var MyContract = contract(MyContractJSON);
MyContract.setProvider(provider);

var indexRoutes = require("./routes/index");
var filesRoutes = require("./routes/files");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
app.use(session({
  secret: 'BlockEHR is EHR on blockchain',
  resave: false,
  saveUninitialized: false
}));

app.locals.myContract = MyContract;
app.locals.moment = require('moment');

app.use(indexRoutes);
app.use(filesRoutes);

app.get("*", function(req, res){
    res.render("notfound");
});

app.listen(port, function(){
    console.log("Server started!!");
});