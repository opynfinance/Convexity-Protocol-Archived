const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(StringComparator);
  deployer.link(StringComparator, OptionsFactory);

  // deployer.deploy(MockCompoundOracle).then(async () => {
  //   // await deployer.deploy(MockUniswapFactory);
  //   return  deployer.deploy(OptionsExchange, MockCompoundOracle.address, MockCompoundOracle.address).then(()=> {
  //     return deployer.deploy(OptionsFactory, OptionsExchange.address);
  //   });
  // })
  deployer.deploy(OptionsExchange).then(()=> {
    return deployer.deploy(OptionsFactory, OptionsExchange.address);
  });
  // deployer.deploy(OptionsFactory);

  // TODO: figure out how to get this to deploy
  // deployer.deploy(OptionsExchange, mockUniswapFactory.address, mockCompoundOracle.address);
};
