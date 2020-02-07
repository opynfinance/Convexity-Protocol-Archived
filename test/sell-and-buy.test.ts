import {expect} from 'chai';
import {
  ERC20MintableInstance,
  oTokenInstance,
  OptionsFactoryInstance,
  OptionsExchangeInstance,
  UniswapFactoryInterfaceInstance,
  UniswapExchangeInterfaceInstance,
  CompoundOracleInterfaceInstance,
  MockCompoundOracleInstance
} from '../build/types/truffle-types';
import {Address} from 'cluster';

const OptionsFactory = artifacts.require('OptionsFactory');
const MintableToken = artifacts.require('ERC20Mintable');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const oToken = artifacts.require('oToken');
// const Oracle = artifacts.require('Oracle.sol');
const Oracle = artifacts.require('MockCompoundOracle');

// Egs. collateral = 200 * 10^-18, strikePrice = 9 * 10^-15.
// returns number of oTokens
function calculateMaxOptionsToCreate(
  collateral: number,
  strikePrice: number,
  collateralToStrikePrice: number
): number {
  return Math.floor(
    (collateral * collateralToStrikePrice) / (1.7 * strikePrice)
  );
}

// Egs. oTokensSold = 200 * 10^15, strikePrice = 9 * 10^-15, apr = 2, strikeToCol = 0.01
// returns collateral to deposit (in wei).
function calculateETHInUniswapPool(
  oTokensSold: number,
  strikePrice: number,
  apr: number,
  strikeToCollateralPrice: number
): number {
  return Math.floor(
    (apr / 100) * strikePrice * strikeToCollateralPrice * oTokensSold * 10 ** 18
  );
}

contract('OptionsContract', accounts => {
  const creatorAddress = accounts[0];
  const firstRepoOwnerAddress = accounts[1];
  const secondRepoOwnerAddress = accounts[2];

  let daiAddress: string;
  let usdcAddress: string;
  let cUSDCAddress: string;
  let cDaiAddress: string;
  let uniswapFactoryAddress: string;

  let optionsExchangeAddress: string;
  let optionsFactoryAddress: string;
  let optionsContractAddresses: string[];
  let oracleAddress: string;

  const optionsContracts: oTokenInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;
  let uniswapFactory: UniswapFactoryInterfaceInstance;
  let optionsExchange: OptionsExchangeInstance;
  let oracle: MockCompoundOracleInstance;

  const windowSize = 1611446400;
  const contractsDeployed = false;

  before('set up contracts', async () => {
    if ((await web3.eth.net.getId()) == 4) {
      // Rinkeby Dai Address
      daiAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
      usdcAddress = '0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b';
      cUSDCAddress = '0x5b281a6dda0b271e91ae35de655ad301c976edb1';
      cDaiAddress = '0x6d7f0754ffeb405d23c51ce938289d4835be3b14';
      uniswapFactoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36';

      // Rinkeby Addreesses
      optionsExchangeAddress = '0x9837AD4759B1292b0296773a8D88EBF793cdD7B2';
      optionsFactoryAddress = '0x308B6BC6A50B6a5a2Fe4953Aa09Fe6E32F903391';
      optionsContractAddresses = [
        '0x71EFDA21aBC791FdbBa1F5E808C5b0C1FeEf281f',
        '0xC4fa5ce3d8945D851b93e7D52dd89E7F3787FDDE',
        '0x182bD91b2DAAeA48113935fbb1e6F13EFe7E6e6f'
      ];
      oracleAddress = '0xEb46648930e87beeCC13B580f75bc83ce8a71410';
    } else if ((await web3.eth.net.getId()) == 42) {
      // Kovan Addresses
      daiAddress = '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa';
      usdcAddress = '0x75B0622Cec14130172EaE9Cf166B92E5C112FaFF';
      cUSDCAddress = '0xcfC9bB230F00bFFDB560fCe2428b4E05F3442E35';
      cDaiAddress = '0xe7bc397DBd069fC7d0109C0636d06888bb50668c';
      uniswapFactoryAddress = '0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30';
    } else if ((await web3.eth.net.getId()) == 3) {
      // Ropsten Addresses
      daiAddress = '0xB5E5D0F8C0cbA267CD3D7035d6AdC8eBA7Df7Cdd';
      usdcAddress = '0x8a9447df1FB47209D36204e6D56767a33bf20f9f';
      cUSDCAddress = '0x43a1363afb28235720fcbdf0c2dab7759091f7e0';
      cDaiAddress = '0x2b536482a01e620ee111747f8334b395a42a555e';
      uniswapFactoryAddress = '0x0865A608E75FbD2ba087d08A5C7cAabcd977C1aD';
    }
    if (!contractsDeployed) {
      oracle = await Oracle.deployed();
      // 1.2 Mock Dai contract
      dai = await MintableToken.at(daiAddress);
      // 1.3 USDC contract
      usdc = await MintableToken.at(usdcAddress);

      // 2. Deploy our contracts
      // Deploy the Options Exchange
      optionsExchange = await OptionsExchange.deployed();

      // Deploy the Options Factory contract and add assets to it
      optionsFactory = await OptionsFactory.deployed();

      await optionsFactory.addAsset('DAI', dai.address);
      await optionsFactory.addAsset('USDC', usdc.address);
      await optionsFactory.addAsset('cDAI', cDaiAddress);
      await optionsFactory.addAsset('cUSDC', cUSDCAddress);

      // Create the unexpired options contract
      let optionsContractResult = await optionsFactory.createOptionsContract(
        'ETH',
        -'18',
        'DAI',
        -'18',
        -'14',
        '9',
        -'15',
        'USDC',
        '1611446400',
        windowSize,
        {from: creatorAddress, gas: '4000000'}
      );

      let optionsContractAddr = optionsContractResult.logs[1].args[0];
      optionsContracts.push(await oToken.at(optionsContractAddr));

      // Create the unexpired options contract
      optionsContractResult = await optionsFactory.createOptionsContract(
        'ETH',
        -'18',
        'cDAI',
        -'8',
        -'8',
        '2',
        -'10',
        'USDC',
        '1611446400',
        windowSize,
        {from: creatorAddress, gas: '4000000'}
      );

      optionsContractAddr = optionsContractResult.logs[1].args[0];
      optionsContracts.push(await oToken.at(optionsContractAddr));

      // Create the unexpired options contract
      optionsContractResult = await optionsFactory.createOptionsContract(
        'ETH',
        -'18',
        'cUSDC',
        -'8',
        -'8',
        '208',
        -'12',
        'USDC',
        '1611446400',
        windowSize,
        {from: creatorAddress, gas: '4000000'}
      );

      optionsContractAddr = optionsContractResult.logs[1].args[0];
      optionsContracts.push(await oToken.at(optionsContractAddr));

      console.log('Options Exchange ' + OptionsExchange.address);
      console.log('Options Factory ' + optionsFactory.address);
      console.log('oDai ' + optionsContracts[0].address);
      console.log('ocDai ' + optionsContracts[1].address);
      console.log('ocUSDC ' + optionsContracts[2].address);
      console.log('Oracle ' + oracle.address);
    } else {
      optionsFactory = await OptionsFactory.at(optionsFactoryAddress);
      optionsContracts.push(await oToken.at(optionsContractAddresses[0]));
      optionsContracts.push(await oToken.at(optionsContractAddresses[1]));
      optionsContracts.push(await oToken.at(optionsContractAddresses[2]));
      optionsExchange = await OptionsExchange.at(optionsExchangeAddress);
      oracle = await Oracle.at(oracleAddress);
    }

    // instantiate Uniswap Factory
    uniswapFactory = await UniswapFactory.at(uniswapFactoryAddress);
  });

  describe('add liquidity on uniswap', () => {
    it('create the uniswap exchange', async () => {
      if (!contractsDeployed) {
        let i;
        for (i = 0; i < optionsContracts.length; i++) {
          await uniswapFactory.createExchange(optionsContracts[i].address);
        }
      }
    });

    it('should be able to create oTokens', async () => {
      if (!contractsDeployed) {
        const collateral = '2000000000000000';
        const strikePrices = [9 * 10 ** -15, 2 * 10 ** -10, 208 * 10 ** -12];
        const ETHToUSDCPrice =
          10 ** 18 / Number(await oracle.getPrice(usdcAddress));
        for (let i = 0; i < optionsContracts.length; i++) {
          const numOptions = (
            calculateMaxOptionsToCreate(
              Number(collateral) * 10 ** -18,
              strikePrices[i],
              ETHToUSDCPrice
            ) - 10000
          ).toString();
          const result = await optionsContracts[i].createETHCollateralOption(
            numOptions,
            creatorAddress,
            {
              from: creatorAddress,
              value: collateral
            }
          );

          // Minting oTokens should emit an event correctly
          expect(result.logs[3].event).to.equal('IssuedOTokens');
          expect(result.logs[3].args.issuedTo).to.equal(creatorAddress);
        }
      }
    });

    it('should be able to add liquidity to Uniswap', async () => {
      if (!contractsDeployed) {
        const strikePrices = [9 * 10 ** -15, 2 * 10 ** -10, 208 * 10 ** -12];
        const USDCToETHPrice =
          Number(await oracle.getPrice(usdcAddress)) / 10 ** 18;

        for (let i = 0; i < optionsContracts.length; i++) {
          const uniswapExchangeAddr = await uniswapFactory.getExchange(
            optionsContracts[i].address
          );

          const uniswapExchange = await UniswapExchange.at(uniswapExchangeAddr);
          await optionsContracts[i].approve(
            uniswapExchangeAddr,
            '100000000000000000000000000000'
          );

          const oTokens = (
            await optionsContracts[i].balanceOf(creatorAddress)
          ).toString();
          const collateral = calculateETHInUniswapPool(
            Number(oTokens),
            strikePrices[i],
            2,
            USDCToETHPrice
          ).toString();
          // assuming 1 * 10^-15 USD per oDai, 1000 * oDai * USD-ETH
          // the minimum value of ETH is 1000000000
          await uniswapExchange.addLiquidity(
            '1',
            oTokens,
            '1000000000000000000000000',
            {
              from: creatorAddress,
              value: collateral
            }
          );
        }
      }
    });

    it('should be able to calculate premiums', async () => {
      // 1 Dai ~= 1 USDC, 1 cToken ~= $0.02.
      const priceInUSD = [10 ** -14, 0.02 * 10 ** -8, 0.0208 * 10 ** -8];
      const ETHToUSDCPrice =
        10 ** 18 / Number(await oracle.getPrice(usdcAddress));

      for (let i = 0; i < optionsContracts.length; i++) {
        const premiumToPay = await optionsExchange.premiumToPay(
          optionsContracts[i].address,
          '0x0000000000000000000000000000000000000000',
          '1'
        );
        const insuredAPR =
          ((Number(premiumToPay) * 10 ** -18) / priceInUSD[i]) *
          100 *
          ETHToUSDCPrice;
        console.log(insuredAPR.toString());
      }
    });
  });

  describe('Should be able to buy and sell oTokens', async () => {
    it('should be able to buy oTokens with ETH', async () => {
      await optionsExchange.buyOTokens(
        creatorAddress,
        optionsContracts[0].address,
        '0x0000000000000000000000000000000000000000',
        '1000',
        {
          value: '1000000'
        }
      );
    });
    xit('vault should be unsafe when price drops', async () => {
      const newETHToUSDPrice = 100;
      const newPrice = Math.floor((1 / newETHToUSDPrice) * 10 ** 18).toString();
      await oracle.updatePrice(newPrice, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(creatorAddress);
      expect(result).to.be.true;
    });
    xit('should be able to sell oTokens for ERC20', async () => {
      await optionsContracts[0].approve(
        optionsExchange.address,
        '1000000000000000000000'
      );

      const optionsToSell = (
        await optionsContracts[0].balanceOf(creatorAddress)
      ).toString();

      const payoutTokenAddress = '0x2448eE2641d78CC42D7AD76498917359D961A783';
      await optionsExchange.sellOTokens(
        creatorAddress,
        optionsContracts[0].address,
        payoutTokenAddress,
        optionsToSell
      );
    });
    xit('should be able to create and sell oTokens for ETH', async () => {
      const numOptions = '10000';
      const collateral = '2000000';
      console.log(firstRepoOwnerAddress);
      await optionsContracts[0].createAndSellETHCollateralOption(
        numOptions,
        firstRepoOwnerAddress,
        {
          from: firstRepoOwnerAddress,
          value: collateral
        }
      );
    });

    xit('should be able to create and sell oTokens for ERC20s', async () => {
      const numOptions = '10000';
      const collateral = '2000000';
      await optionsContracts[0].createETHCollateralOption(
        numOptions,
        firstRepoOwnerAddress,
        {
          from: firstRepoOwnerAddress,
          value: collateral
        }
      );

      await optionsContracts[0].approve(
        optionsExchange.address,
        '1000000000000000000000'
      );

      const payoutTokenAddress = '0x2448eE2641d78CC42D7AD76498917359D961A783';
      await optionsExchange.sellOTokens(
        firstRepoOwnerAddress,
        optionsContracts[0].address,
        payoutTokenAddress,
        '13888'
      );
    });

    xit('should be able to buy oTokens with ERC20s', async () => {
      const paymentTokenAddr = '0x2448eE2641d78CC42D7AD76498917359D961A783';
      const paymentToken = await MintableToken.at(paymentTokenAddr);
      // set to optionsCotnracs[0].address
      const oTokenAddress = optionsContractAddresses[0];
      await paymentToken.approve(
        OptionsExchange.address,
        '10000000000000000000000000'
      );
      await optionsExchange.buyOTokens(
        creatorAddress,
        oTokenAddress,
        paymentTokenAddr,
        '100'
      );
    });
  });
});
