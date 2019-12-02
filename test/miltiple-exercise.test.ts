import { expect } from 'chai';
import {
  ERC20MintableInstance,
  MockCompoundOracleInstance,
  OptionsContractInstance,
  OptionsExchangeInstance,
  OptionsFactoryInstance
} from '../build/types/truffle-types';

const OptionsContract = artifacts.require('OptionsContract');
const OptionsFactory = artifacts.require('OptionsFactory');
const OptionsExchange = artifacts.require('OptionsExchange');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const MintableToken = artifacts.require('ERC20Mintable');

const {
  BN,
  constants,
  balance,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

contract('OptionsContract', accounts => {
  const creatorAddress = accounts[0];
  const firstRepoOwnerAddress = accounts[1];
  const secondRepoOwnerAddress = accounts[2];

  const firstExerciser = accounts[3];
  const secondExerciser = accounts[4];

  const optionsContracts: OptionsContractInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let optionsExchange: OptionsExchangeInstance;
  let compoundOracle: MockCompoundOracleInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;

  const repo1Collateral = '20000000';
  const repo1PutsOutstanding = '250000';

  const repo2Collateral = '10000000';
  const repo2PutsOutstanding = '100000';

  before('set up contracts', async () => {
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    compoundOracle = await MockCompoundOracle.new();
    // 1.2 Uniswap Factory
    const uniswapFactory = await MockUniswapFactory.new();
    // 1.3 Mock Dai contract
    dai = await MintableToken.new();
    await dai.mint(creatorAddress, '10000000');
    await dai.mint(firstExerciser, '100000', { from: creatorAddress });
    await dai.mint(secondExerciser, '100000', { from: creatorAddress });
    // 1.4 Mock Dai contract
    usdc = await MintableToken.new();
    await usdc.mint(creatorAddress, '10000000');
    // 2. Deploy our contracts
    // deploys the Options Exhange contract
    optionsExchange = await OptionsExchange.deployed();

    // TODO: remove this later. For now, set the compound Oracle and uniswap Factory addresses here.
    await optionsExchange.setUniswapAndCompound(
      uniswapFactory.address,
      compoundOracle.address
    );

    // Deploy the Options Factory contract and add assets to it
    optionsFactory = await OptionsFactory.deployed();
    await optionsFactory.setOptionsExchange(optionsExchange.address);

    await optionsFactory.addAsset('DAI', dai.address);
    // TODO: deploy a mock USDC and get its address
    await optionsFactory.addAsset('USDC', usdc.address);

    // Create the unexpired options contract
    const optionsContractResult = await optionsFactory.createOptionsContract(
      'ETH',
      -'18',
      'DAI',
      -'14',
      '9',
      -'15',
      'USDC',
      '1577836800',
      '1577836800'
    );

    const optionsContractAddr = optionsContractResult.logs[0].args[0];
    optionsContracts.push(await OptionsContract.at(optionsContractAddr));

    // Open Repo1, add Collateral and Mint oTokens
    await optionsContracts[0].openRepo({
      from: firstRepoOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].addETHCollateral(0, {
      from: firstRepoOwnerAddress,
      gas: '100000',
      value: repo1Collateral
    });

    await optionsContracts[0].issueOptionTokens('0', repo1PutsOutstanding, {
      from: firstRepoOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].transfer(firstExerciser, '10', {
      from: firstRepoOwnerAddress,
      gas: '100000'
    });

    // Open Repo2, add Collateral and Mint oTokens
    await optionsContracts[0].openRepo({
      from: secondRepoOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].addETHCollateral(1, {
      from: secondRepoOwnerAddress,
      gas: '100000',
      value: repo2Collateral
    });

    await optionsContracts[0].issueOptionTokens(1, repo2PutsOutstanding, {
      from: secondRepoOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].transfer(secondExerciser, '10', {
      from: secondRepoOwnerAddress,
      gas: '100000'
    });
  });

  describe('Scenario: Exerxise + Claim collateral', () => {
    it('firstExerciser should be able to exercise 10 oTokens', async () => {
      const amtToExercise = '10';
      const initialEth = await balance.current(firstExerciser);
      console.log(initialEth.toString());

      await dai.approve(
        optionsContracts[0].address,
        '10000000000000000000000',
        { from: firstExerciser }
      );

      // call exercise
      // ensure you approve before burn
      await optionsContracts[0].approve(
        optionsContracts[0].address,
        '10000000000000000',
        { from: firstExerciser }
      );
      const txInfo = await optionsContracts[0].exercise(amtToExercise, {
        from: firstExerciser,
        gas: '1000000'
      });

      expectEvent(txInfo, 'Exercise', {
        amtUnderlyingToPay: new BN(100000),
        amtCollateralToPay: new BN(450)
      });

      const oTokenBalance = await optionsContracts[0].balanceOf(firstExerciser);
      expect(oTokenBalance.toString()).to.equal('0');
    });
  });
});
