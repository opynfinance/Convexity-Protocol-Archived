import { expect } from 'chai';
import {
  ERC20MintableInstance,
  oTokenInstance,
  OptionsFactoryInstance,
  OptionsExchangeInstance,
  UniswapFactoryInterfaceInstance,
  UniswapExchangeInterfaceInstance
} from '../build/types/truffle-types';

const OptionsFactory = artifacts.require('OptionsFactory');
const MintableToken = artifacts.require('ERC20Mintable');
const UniswapFactory = artifacts.require('UniswapFactoryInterface');
const UniswapExchange = artifacts.require('UniswapExchangeInterface');
const OptionsExchange = artifacts.require('OptionsExchange.sol');
const oToken = artifacts.require('oToken');

contract('OptionsContract', accounts => {
  const creatorAddress = accounts[0];
  const firstRepoOwnerAddress = accounts[1];
  const secondRepoOwnerAddress = accounts[2];

  const optionsFactoryAddress = '0xC0B7b9e6209804866e1b96CB6c9446533A98c6b2';
  const optionsContractAddress = '0x1695669d2E366e85115564EE2c1f3A9772c71389';
  const uniswapFactoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36';
  const optionsExchangeAddress = '0xaaE1AfA1045bF1361f23bfb55D6070D47eBe4Bc1';

  const optionsContracts: oTokenInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;
  let uniswapFactory: UniswapFactoryInterfaceInstance;
  let optionsExchange: OptionsExchangeInstance;

  const windowSize = 1577836800;
  const contractsDeployed = true;

  before('set up contracts', async () => {
    if (!contractsDeployed) {
      // 1.2 Mock Dai contract
      dai = await MintableToken.new();
      await dai.mint(creatorAddress, '10000000');
      // 1.3 Mock Dai contract
      usdc = await MintableToken.new();
      await usdc.mint(creatorAddress, '10000000');

      // 2. Deploy our contracts
      // Deploy the Options Exchange
      optionsExchange = await OptionsExchange.deployed();
      console.log(OptionsExchange.address);

      // Deploy the Options Factory contract and add assets to it
      optionsFactory = await OptionsFactory.deployed();
      console.log(optionsFactory.address);

      await optionsFactory.addAsset('DAI', dai.address);
      await optionsFactory.addAsset('USDC', usdc.address);

      // Create the unexpired options contract
      const optionsContractResult = await optionsFactory.createOptionsContract(
        'ETH',
        -'18',
        'DAI',
        -'18',
        -'14',
        '9',
        -'15',
        'USDC',
        '1577836800',
        windowSize,
        { from: creatorAddress, gas: '4000000' }
      );

      const optionsContractAddr = optionsContractResult.logs[1].args[0];
      optionsContracts.push(await oToken.at(optionsContractAddr));

      console.log('Options Factory ' + optionsFactory.address);
      console.log('Options contract ' + optionsContracts[0].address);
    } else {
      optionsFactory = await OptionsFactory.at(optionsFactoryAddress);
      optionsContracts.push(await oToken.at(optionsContractAddress));
      optionsExchange = await OptionsExchange.at(optionsExchangeAddress);
    }

    // instantiate Uniswap Factory
    uniswapFactory = await UniswapFactory.at(uniswapFactoryAddress);
  });

  describe('add liquidity on uniswap', () => {
    it('create the uniswap exchange', async () => {
      if (!contractsDeployed) {
        await uniswapFactory.createExchange(optionsContracts[0].address);
      }
    });

    it('should be able to create oTokens', async () => {
      if (!contractsDeployed) {
        const numOptions = '1388888888';
        const collateral = '200000000000';
        const result = await optionsContracts[0].createETHCollateralOption(
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
    });

    it('should be able to add liquidity to Uniswap', async () => {
      if (!contractsDeployed) {
        const uniswapExchangeAddr = await uniswapFactory.getExchange(
          optionsContracts[0].address
        );

        const uniswapExchange = await UniswapExchange.at(uniswapExchangeAddr);
        await optionsContracts[0].approve(
          uniswapExchangeAddr,
          '10000000000000000'
        );

        // assuming 1 * 10^-15 USD per oDai, 1000 * oDai * USD-ETH
        // the minimum value of ETH is 1000000000
        await uniswapExchange.addLiquidity(
          '1',
          '1000000000',
          '1000000000000000000000000',
          {
            from: creatorAddress,
            value: '5000000000'
          }
        );
      }
    });
  });

  describe('Should be able to buy and sell oTokens', async () => {
    it('should be able to create and sell oTokens for ETH', async () => {
      const numOptions = '13888';
      const collateral = '2000000';
      await optionsContracts[0].createAndSellETHCollateralOption(
        numOptions,
        creatorAddress,
        {
          from: creatorAddress,
          value: collateral
        }
      );
    });

    it('should be able to create and sell oTokens for ERC20s', async () => {
      const numOptions = '13888';
      const collateral = '2000000';
      await optionsContracts[0].createETHCollateralOption(
        numOptions,
        creatorAddress,
        {
          from: creatorAddress,
          value: collateral
        }
      );

      await optionsContracts[0].approve(
        optionsExchange.address,
        '1000000000000000000000'
      );

      const payoutTokenAddress = '0x2448eE2641d78CC42D7AD76498917359D961A783';
      await optionsExchange.sellOTokens(
        creatorAddress,
        optionsContracts[0].address,
        payoutTokenAddress,
        '13888'
      );
    });

    it('should be able to buy oTokens with ETH', async () => {
      await optionsExchange.buyOTokens(
        creatorAddress,
        optionsContracts[0].address,
        '1000',
        '0x0000000000000000000000000000000000000000',
        {
          value: '1000000'
        }
      );
    });

    it('should be able to buy oTokens with ERC20s', async () => {
      const paymentTokenAddr = '0x2448eE2641d78CC42D7AD76498917359D961A783';
      const paymentToken = await MintableToken.at(paymentTokenAddr);
      await paymentToken.approve(
        OptionsExchange.address,
        '10000000000000000000000000'
      );
      await optionsExchange.buyOTokens(
        creatorAddress,
        optionsContracts[0].address,
        '100',
        paymentTokenAddr
      );
    });
  });
});
