const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');

module.exports = function (deployer) {
  deployer.then(async () => {
    await deployer.deploy(StringComparator);
    await deployer.link(StringComparator, OptionsFactory);

    // // TODO: uncomment for the local test net
    const uniswapFactory = await deployer.deploy(MockUniswapFactory);
    const compoundOracle = await deployer.deploy(MockCompoundOracle)

    const optionsExchange = await deployer.deploy(OptionsExchange, uniswapFactory.address);
    //TODO: change the compound Oracle address
    // const optionsExchange = await deployer.deploy(OptionsExchange, "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36", "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36");

    await deployer.deploy(OptionsFactory, optionsExchange.address, compoundOracle.address);
  })
};
