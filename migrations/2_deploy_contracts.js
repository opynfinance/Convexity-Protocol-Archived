const OptionsFactory = artifacts.require('OptionsFactory.sol');
const StringComparator = artifacts.require('StringComparator.sol');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const Oracle = artifacts.require('Oracle.sol');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');

module.exports = function(deployer, network) {
  deployer.then(async () => {
    let uniswapFactoryAddr;
    let compoundOracleAddress;
    let compoundOracle;

    if (network == 'rinkeby') {
      // Rinkeby
      uniswapFactoryAddr = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36';
      compoundOracleAddress = '0x332b6e69f21acdba5fb3e8dac56ff81878527e06';
      // compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
      compoundOracle = await deployer.deploy(MockCompoundOracle);
      console.log('Oracle Address ', compoundOracle.address.toString());

      const optionsExchange = await deployer.deploy(
        OptionsExchange,
        uniswapFactoryAddr
      );
      console.log('Options Exchange ', optionsExchange.address.toString());
      await deployer.deploy(
        OptionsFactory,
        optionsExchange.address,
        compoundOracle.address
      );
      console.log('Options Factory ', OptionsFactory.address.toString());
    } else if (network == 'kovan') {
      await deployer.deploy(StringComparator);
      await deployer.link(StringComparator, OptionsFactory);
      // Kovan
      uniswapFactoryAddr = '0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30';
      compoundOracleAddress = '0x6998ed7daf969ea0950e01071aceeee54cccbab5';
      // compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
      compoundOracle = await deployer.deploy(MockCompoundOracle);

      const optionsExchange = await deployer.deploy(
        OptionsExchange,
        uniswapFactoryAddr
      );
      await deployer.deploy(
        OptionsFactory,
        optionsExchange.address,
        compoundOracle.address
      );
    } else if (network == 'ropsten') {
      await deployer.deploy(StringComparator);
      await deployer.link(StringComparator, OptionsFactory);
      // Ropsten
      uniswapFactoryAddr = '0x0865A608E75FbD2ba087d08A5C7cAabcd977C1aD';
      compoundOracleAddress = '0xc7E20CF485b8E0Bcec3e2fCc23e3aD93b1b0cB39';
      // compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
      compoundOracle = await deployer.deploy(MockCompoundOracle);

      const optionsExchange = await deployer.deploy(
        OptionsExchange,
        uniswapFactoryAddr
      );
      await deployer.deploy(
        OptionsFactory,
        optionsExchange.address,
        compoundOracle.address
      );
    } else if (network == 'mainnet') {
      // await deployer.deploy(StringComparator);
      // await deployer.link(StringComparator, OptionsFactory);
      // // Mainnet
      // uniswapFactoryAddr = "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95";
      // compoundOracleAddress = "0x1D8aEdc9E924730DD3f9641CDb4D1B92B848b4bd";
      // compoundOracle = await deployer.deploy(Oracle, compoundOracleAddress);
      // // compoundOracle = await Oracle.at('0x317166AB2bF19152D16871C8Cf1B33583e26932B');
      // console.log("Oracle Address ", compoundOracle.address.toString());
      // const optionsExchange = await deployer.deploy(OptionsExchange, uniswapFactoryAddr);
      // console.log("Options Exchange ", optionsExchange.address.toString());
      // await deployer.deploy(OptionsFactory, optionsExchange.address, compoundOracle.address);
      // console.log("Options Factory ", OptionsFactory.address.toString());
    } else {
      // For the development network
      await deployer.deploy(StringComparator);
      await deployer.link(StringComparator, OptionsFactory);

      const uniswapFactory = await deployer.deploy(MockUniswapFactory);
      uniswapFactoryAddr = uniswapFactory.address;
      compoundOracle = await deployer.deploy(MockCompoundOracle);

      const optionsExchange = await deployer.deploy(
        OptionsExchange,
        uniswapFactoryAddr
      );
      await deployer.deploy(
        OptionsFactory,
        optionsExchange.address,
        compoundOracle.address
      );
    }
  });
};
