const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(StringComparator);
  deployer.link(StringComparator, OptionsFactory);
  deployer.deploy(OptionsFactory);
  deployer.deploy(OptionsExchange);

  // TODO: figure out how to get this to deploy
  // deployer.deploy(OptionsExchange, mockUniswapFactory.address, mockCompoundOracle.address);
};
