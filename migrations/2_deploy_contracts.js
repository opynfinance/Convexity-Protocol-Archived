const OptionsFactory = artifacts.require('./OptionsFactory.sol');
const StringComparator = artifacts.require('./lib/StringComparator.sol');
const mockUniswapFactory = artifacts.require('./lib/MockUniswapFactory.sol');
const mockCompoundOracle = artifacts.require('./lib/MockCompoundOracle.sol');
const OptionsExchange = artifacts.require('./OptionsExchange.sol');
const daiMock = artifacts.require('./lib/simpleERC20.sol');

const Metadata = require('../ethpm.json');

module.exports = async function (deployer, network, accounts) {
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
