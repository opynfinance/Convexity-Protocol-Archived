const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const Oracle = artifacts.require('Oracle.sol');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');

module.exports = function (deployer) {
  deployer.then(async () => {
    var uniswapFactoryAddr;
    var compoundOracleAddress;
    var compoundOracle;
    if ((await web3.eth.net.getId()) == 4) {
      // Rinkeby
      uniswapFactoryAddr = "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36";
      compoundOracleAddress = "0x332b6e69f21acdba5fb3e8dac56ff81878527e06";
      compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
    } else if ((await web3.eth.net.getId()) == 42) {
      await deployer.deploy(StringComparator);
      await deployer.link(StringComparator, OptionsFactory);
      // Kovan
      uniswapFactoryAddr = "0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30";
      compoundOracleAddress = "0x6998ed7daf969ea0950e01071aceeee54cccbab5";
      // compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
      compoundOracle = await deployer.deploy(MockCompoundOracle);
    } else if ((await web3.eth.net.getId()) == 3) {
      await deployer.deploy(StringComparator);
      await deployer.link(StringComparator, OptionsFactory);
      // Ropsten
      uniswapFactoryAddr = "0x0865A608E75FbD2ba087d08A5C7cAabcd977C1aD";
      compoundOracleAddress = "0xc7E20CF485b8E0Bcec3e2fCc23e3aD93b1b0cB39";
      // compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
      compoundOracle = await deployer.deploy(MockCompoundOracle);
    } else {
      // For the local testnet
      await deployer.deploy(StringComparator);
      await deployer.link(StringComparator, OptionsFactory);

      const uniswapFactory = await deployer.deploy(MockUniswapFactory);
      uniswapFactoryAddr = uniswapFactory.address;
      compoundOracle = await deployer.deploy(MockCompoundOracle);
    }

    // For all testnets / mainnets
    const optionsExchange = await deployer.deploy(OptionsExchange, uniswapFactoryAddr);
    await deployer.deploy(OptionsFactory, optionsExchange.address, compoundOracle.address);
  })
};
