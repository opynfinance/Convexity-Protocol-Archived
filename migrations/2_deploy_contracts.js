var OptionsFactory = artifacts.require('./OptionsFactory.sol');
var StringComparator = artifacts.require('./lib/StringComparator.sol');
var mockUniswapFactory = artifacts.require('./lib/MockUniswapFactory.sol');
var mockCompoundOracle = artifacts.require('./lib/MockCompoundOracle.sol');
var OptionsExchange = artifacts.require('./OptionsExchange.sol');
var daiMock = artifacts.require('./lib/simpleERC20.sol');

var Metadata = require("../ethpm.json");
//var semver = require('semver');

module.exports = async function(deployer, network, accounts) {
  deployer.deploy(StringComparator);
  deployer.link(StringComparator, OptionsFactory);
  deployer.deploy(OptionsFactory);
  deployer.deploy(mockCompoundOracle);
  deployer.deploy(mockUniswapFactory);
  deployer.deploy(OptionsExchange);
  deployer.deploy(daiMock);
  // TODO: figure out how to get this to deploy
  // deployer.deploy(OptionsExchange, mockUniswapFactory.address, mockCompoundOracle.address);

};
