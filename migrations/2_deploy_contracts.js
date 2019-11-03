var OptionsFactory = artifacts.require('./OptionsFactory.sol');
var StringComparator = artifacts.require('./StringComparator.sol');


var Metadata = require("../ethpm.json");
//var semver = require('semver');

module.exports = function(deployer, network, accounts) {
  deployer.deploy(StringComparator);
  deployer.link(StringComparator, OptionsFactory);
  deployer.deploy(OptionsFactory);

};
