const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const Oracle = artifacts.require('Oracle.sol');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');

module.exports = function (deployer) {
  deployer.then(async () => {
    // For the local testnet
    // await deployer.deploy(StringComparator);
    // await deployer.link(StringComparator, OptionsFactory);

    // const uniswapFactory = await deployer.deploy(MockUniswapFactory);
    // const uniswapFactoryAddr = uniswapFactory.address;

    // const compoundOracle = await deployer.deploy(MockCompoundOracle);
    // Rinkeby
    const uniswapFactoryAddr = "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36";

    const compoundOracleAddress = "0x332b6e69f21acdba5fb3e8dac56ff81878527e06";
    const compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);

    // For all testnets / mainnets
    // const optionsExchange = await deployer.deploy(OptionsExchange, uniswapFactoryAddr);
    // await deployer.deploy(OptionsFactory, optionsExchange.address, compoundOracle.address);
  })
};
