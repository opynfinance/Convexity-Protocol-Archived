import {expect} from 'chai';
import {
  ERC20MintableInstance,
  oTokenInstance,
  OptionsFactoryInstance,
  OptionsExchangeInstance,
  UniswapFactoryInterfaceInstance,
  UniswapExchangeInterfaceInstance,
  CompoundOracleInterfaceInstance
} from '../build/types/truffle-types';

const OptionsFactory = artifacts.require('OptionsFactory');
const MintableToken = artifacts.require('ERC20Mintable');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const oToken = artifacts.require('oToken');
const Oracle = artifacts.require('Oracle.sol');

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

  // Rinkeby Dai Address
  const daiAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
  // Rinkeby USDC Address
  const usdcAddress = '0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b';
  const uniswapFactoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36';

  // Rinkeby Addreesses
  const optionsExchangeAddress = '0x9837AD4759B1292b0296773a8D88EBF793cdD7B2';
  const optionsFactoryAddress = '0x308B6BC6A50B6a5a2Fe4953Aa09Fe6E32F903391';
  const optionsContractAddresses = [
    '0x71EFDA21aBC791FdbBa1F5E808C5b0C1FeEf281f',
    '0xC4fa5ce3d8945D851b93e7D52dd89E7F3787FDDE',
    '0x182bD91b2DAAeA48113935fbb1e6F13EFe7E6e6f'
  ];
  const oracleAddress = '0xEb46648930e87beeCC13B580f75bc83ce8a71410';

  const optionsContracts: oTokenInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;
  let uniswapFactory: UniswapFactoryInterfaceInstance;
  let optionsExchange: OptionsExchangeInstance;
  let oracle: CompoundOracleInterfaceInstance;

  const windowSize = 1611446400;
  const contractsDeployed = true;

  before('set up contracts', async () => {
    if (!contractsDeployed) {
      oracle = await Oracle.deployed();
      // 1.2 Mock Dai contract
      dai = await MintableToken.at(
        '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
      );
      // 1.3 USDC contract
      usdc = await MintableToken.at(
        '0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b'
      );

      // 2. Deploy our contracts
      // Deploy the Options Exchange
      optionsExchange = await OptionsExchange.deployed();

      // Deploy the Options Factory contract and add assets to it
      optionsFactory = await OptionsFactory.deployed();

      await optionsFactory.addAsset('DAI', dai.address);
      await optionsFactory.addAsset('USDC', usdc.address);
      await optionsFactory.addAsset(
        'cDAI',
        '0x6d7f0754ffeb405d23c51ce938289d4835be3b14'
      );
      await optionsFactory.addAsset(
        'cUSDC',
        '0x5b281a6dda0b271e91ae35de655ad301c976edb1'
      );

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
    xit('should be able to buy oTokens with ETH', async () => {
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
