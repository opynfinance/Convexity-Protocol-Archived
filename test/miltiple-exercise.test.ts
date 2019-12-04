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

import Reverter from './utils/reverter';

const {
  BN,
  constants,
  balance,
  time,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

contract('OptionsContract', accounts => {
  const reverter = new Reverter(web3);

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

  const windowSize = 1577836800;

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
      windowSize
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

    await reverter.snapshot();
  });

  describe('Scenario: Exercise + Claim collateral', () => {
    it('firstExerciser should be able to exercise 10 oTokens', async () => {
      const underlyingToPay = new BN(100000);
      const collateralToPay = new BN(450);
      const amtToExercise = '10';
      const initialDaiBalance = new BN(
        (await dai.balanceOf(firstExerciser)).toString()
      );

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

      const initialETH = await balance.current(firstExerciser);

      const txInfo = await optionsContracts[0].exercise(amtToExercise, {
        from: firstExerciser,
        gas: '1000000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(firstExerciser);

      expectEvent(txInfo, 'Exercise', {
        amtUnderlyingToPay: underlyingToPay,
        amtCollateralToPay: collateralToPay
      });

      const oTokenBalance = await optionsContracts[0].balanceOf(firstExerciser);
      expect(oTokenBalance.toString()).to.equal('0');

      const finalDaiBalance = await dai.balanceOf(firstExerciser);
      expect(initialDaiBalance.sub(underlyingToPay).toString()).to.equal(
        finalDaiBalance.toString()
      );

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(collateralToPay);
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it('repo 1 should be unsafe after Compund Oracle drops price', async () => {
      await compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result.logs[1].event).to.equal('unsafeCalled');
      expect(result.logs[1].args.isUnsafe).to.be.true;
    });

    xit('repo 2 should be safe after Compund Oracle drops price', async () => {
      compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

      const unsafe = await optionsContracts[0].isUnsafe(1);
      expect(unsafe).to.be.false;
    });

    it('secondExerciser should be able to exercise 10 oTokens', async () => {
      const underlyingToPay = new BN(100000);
      const collateralToPay = new BN(900);
      const amtToExercise = '10';
      const initialDaiBalance = new BN(
        (await dai.balanceOf(secondExerciser)).toString()
      );

      await dai.approve(
        optionsContracts[0].address,
        '10000000000000000000000',
        { from: secondExerciser }
      );

      // call exercise
      // ensure you approve before burn
      await optionsContracts[0].approve(
        optionsContracts[0].address,
        '10000000000000000',
        { from: secondExerciser }
      );

      const initialETH = await balance.current(secondExerciser);

      const txInfo = await optionsContracts[0].exercise(amtToExercise, {
        from: secondExerciser,
        gas: '1000000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(secondExerciser);

      expectEvent(txInfo, 'Exercise', {
        amtUnderlyingToPay: underlyingToPay,
        amtCollateralToPay: collateralToPay
      });

      const oTokenBalance = await optionsContracts[0].balanceOf(
        secondExerciser
      );
      expect(oTokenBalance.toString()).to.equal('0');

      const finalDaiBalance = await dai.balanceOf(secondExerciser);
      expect(initialDaiBalance.sub(underlyingToPay).toString()).to.equal(
        finalDaiBalance.toString()
      );

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(collateralToPay);
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it('secondRepoOwnerAddress should be able to claim after expiry', async () => {
      await compoundOracle.updatePrice(200, {
        from: creatorAddress,
        gas: '1000000'
      });

      const collateralClaimed = new BN(9999550);
      const underlyingClaimed = new BN(66666);

      const initialDaiBalance = new BN(
        (await dai.balanceOf(secondRepoOwnerAddress)).toString()
      );

      await time.increaseTo(windowSize + 2);

      const txInfo = await optionsContracts[0].claimCollateral(1, {
        from: secondRepoOwnerAddress,
        gas: '1000000'
      });

      expectEvent(txInfo, 'ClaimedCollateral', {
        amtCollateralClaimed: collateralClaimed,
        amtUnderlyingClaimed: underlyingClaimed
      });

      const finalDaiBalance = new BN(
        (await dai.balanceOf(secondRepoOwnerAddress)).toString()
      );
      expect(initialDaiBalance.add(underlyingClaimed).toString()).to.equal(
        finalDaiBalance.toString()
      );

      const repo = await optionsContracts[0].getRepoByIndex(1);
      expect(repo['0'].toString()).to.equal('0');
    });

    it('firstRepoOwnerAddress should be able to claim after expiry', async () => {
      const collateralClaimed = new BN(19999100);
      const underlyingClaimed = new BN(133333);

      const initialDaiBalance = new BN(
        (await dai.balanceOf(firstRepoOwnerAddress)).toString()
      );
      //       await time.increaseTo(1577836802);
      const txInfo = await optionsContracts[0].claimCollateral(0, {
        from: firstRepoOwnerAddress,
        gas: '1000000'
      });

      expectEvent(txInfo, 'ClaimedCollateral', {
        amtCollateralClaimed: collateralClaimed,
        amtUnderlyingClaimed: underlyingClaimed
      });

      const finalDaiBalance = new BN(
        (await dai.balanceOf(firstRepoOwnerAddress)).toString()
      );
      expect(initialDaiBalance.add(underlyingClaimed).toString()).to.equal(
        finalDaiBalance.toString()
      );

      const repo = await optionsContracts[0].getRepoByIndex(0);
      expect(repo['0'].toString()).to.equal('0');
    });

    it('should rever everything', async () => {
      await reverter.revert();

      let repo = await optionsContracts[0].getRepoByIndex(0);
      expect(repo['0'].toString()).to.equal(repo1Collateral);
      expect(repo['1'].toString()).to.equal(repo1PutsOutstanding);

      repo = await optionsContracts[0].getRepoByIndex(1);
      expect(repo['0'].toString()).to.equal(repo2Collateral);
      expect(repo['1'].toString()).to.equal(repo2PutsOutstanding);
    });
  });
});
