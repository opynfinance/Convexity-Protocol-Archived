const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');

module.exports = function (deployer) {
  deployer.then(async () => {
    await deployer.deploy(StringComparator);
    await deployer.link(StringComparator, OptionsFactory);

    const uniswapFactory = await deployer.deploy(MockUniswapFactory);
    const compoundOracle = await deployer.deploy(MockCompoundOracle)

    const optionsExchange = await deployer.deploy(OptionsExchange, uniswapFactory.address, compoundOracle.address)

    await deployer.deploy(OptionsFactory, optionsExchange.address);
  })
};
