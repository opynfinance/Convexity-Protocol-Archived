const Util = require('./util.js');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
const util = new Util(web3);
var expect  = require('expect');
var OptionsExchange = artifacts.require("../contracts/OptionsExchange.sol");
const truffleAssert = require('truffle-assertions');
