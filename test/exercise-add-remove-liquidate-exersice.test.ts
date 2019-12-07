import { expect } from 'chai';
import {
  ERC20MintableInstance,
  MockCompoundOracleInstance,
  OptionsContractInstance,
  OptionsFactoryInstance
} from '../build/types/truffle-types';

const OptionsContract = artifacts.require('OptionsContract');
const OptionsFactory = artifacts.require('OptionsFactory');
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

  const tokenHolder = accounts[5];

  const optionsContracts: OptionsContractInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
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
    compoundOracle = await MockCompoundOracle.deployed();

    // 1.2 Mock Dai contract
    dai = await MintableToken.new();
    await dai.mint(creatorAddress, '10000000');
    await dai.mint(firstExerciser, '100000', { from: creatorAddress });
    await dai.mint(secondExerciser, '100000', { from: creatorAddress });

    // 1.3 Mock Dai contract
    usdc = await MintableToken.new();
    await usdc.mint(creatorAddress, '10000000');

    // 2. Deploy our contracts

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
      windowSize,
      { from: creatorAddress, gas: '4000000' }
    );

    const optionsContractAddr = optionsContractResult.logs[1].args[0];
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

    await optionsContracts[0].issueOTokens(
      '0',
      repo1PutsOutstanding,
      firstRepoOwnerAddress,
      {
        from: firstRepoOwnerAddress,
        gas: '100000'
      }
    );

    await optionsContracts[0].transfer(firstExerciser, '10', {
      from: firstRepoOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].transfer(tokenHolder, '101010', {
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

    await optionsContracts[0].issueOTokens(
      1,
      repo2PutsOutstanding,
      secondRepoOwnerAddress,
      {
        from: secondRepoOwnerAddress,
        gas: '100000'
      }
    );

    await optionsContracts[0].transfer(secondExerciser, '10', {
      from: secondRepoOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].transfer(tokenHolder, '1000', {
      from: secondRepoOwnerAddress,
      gas: '100000'
    });

    await reverter.snapshot();
  });

  describe('Scenario: Exercise + Add + remove collateral + liquidate + burn tokens + Exercise + Claim collateral', () => {
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

      expect(result).to.be.true;
    });

    it('repo 2 should be unsafe after Compund Oracle drops price', async () => {
      compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(1);

      expect(result).to.be.true;
    });

    it('anyone should be able to add ETH collateral to Repo 2', async () => {
      let repoState = await optionsContracts[0].getRepoByIndex(1);
      const initialCollateral = new BN(repoState['0'].toString());

      await optionsContracts[0].addETHCollateral(1, {
        from: creatorAddress,
        gas: '100000',
        value: repo2Collateral
      });

      repoState = await optionsContracts[0].getRepoByIndex(1);
      const finalCollateral = new BN(repoState['0'].toString());

      expect(finalCollateral.toString()).to.equal(
        initialCollateral.add(new BN(repo2Collateral)).toString()
      );
    });

    it('repo 2 should be safe after adding ETH collateral', async () => {
      const result = await optionsContracts[0].isUnsafe(1);
      expect(result).to.be.false;
    });

    it('repo 1 should be safe after Compund Oracle increases price', async () => {
      await compoundOracle.updatePrice(200, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.false;
    });

    it('secondRepoOwnerAddress should be able to remove collateral', async () => {
      let repoState = await optionsContracts[0].getRepoByIndex(1);
      const initialCollateral = new BN(repoState['0'].toString());
      const initialETH = await balance.current(secondRepoOwnerAddress);
      const txInfo = await optionsContracts[0].removeCollateral(
        1,
        repo2Collateral,
        {
          from: secondRepoOwnerAddress,
          gas: '100000'
        }
      );

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(secondRepoOwnerAddress);

      repoState = await optionsContracts[0].getRepoByIndex(1);
      const finalCollateral = new BN(repoState['0'].toString());

      expect(finalCollateral.toString()).to.equal(
        initialCollateral.sub(new BN(repo2Collateral)).toString()
      );

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(new BN(repo2Collateral));
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it("firstRepoOwnerAddress shouldn't be able to remove collateral", async () => {
      await expectRevert(
        optionsContracts[0].removeCollateral(0, repo2Collateral, {
          from: firstRepoOwnerAddress,
          gas: '100000'
        }),
        'Repo is unsafe'
      );
    });

    it('repo 1 should be unsafe after Compund Oracle drops price', async () => {
      await compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });
      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.true;
    });

    it('repo 2 should be unsafe after Compund Oracle drops price', async () => {
      const result = await optionsContracts[0].isUnsafe(1);

      expect(result).to.be.true;
    });

    it('should be able to liquidate some collateral from Repo 1', async () => {
      const expectedCollateralToPay = new BN(9181809);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate('0', '101010', {
        from: tokenHolder,
        gas: '200000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(tokenHolder);

      expectEvent(txInfo, 'Liquidate', {
        amtCollateralToPay: expectedCollateralToPay
      });

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(expectedCollateralToPay);
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it('repo 1 should remain unsafe after Compund Oracle increases price', async () => {
      await compoundOracle.updatePrice(150, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.true;
    });

    it('repo 2 should be safe after Compund Oracle increases price', async () => {
      const result = await optionsContracts[0].isUnsafe(1);

      expect(result).to.be.false;
    });

    it('should be able to liquidate some more collateral from Repo 1', async () => {
      const expectedCollateralToPay = new BN(6060);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate('0', '100', {
        from: tokenHolder,
        gas: '200000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(tokenHolder);

      expectEvent(txInfo, 'Liquidate', {
        amtCollateralToPay: expectedCollateralToPay
      });

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(expectedCollateralToPay);
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it('repo 1 should remain unsafe after liquidation', async () => {
      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.true;
    });

    it('firstRepoOwner should be able to burn some put tokens to turn the repo safe', async () => {
      await optionsContracts[0].burnOTokens('0', '100000', {
        from: firstRepoOwnerAddress,
        gas: '100000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.false;
    });

    it('secondExerciser should be able to exercise 10 oTokens', async () => {
      await compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

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

      const collateralClaimed = new BN(9999351);
      const underlyingClaimed = new BN(96097);

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
      const collateralClaimed = new BN(10811429);
      const underlyingClaimed = new BN(103902);

      const initialDaiBalance = new BN(
        (await dai.balanceOf(firstRepoOwnerAddress)).toString()
      );

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
  });

  describe('Scenario: Exercise + Add + remove collateral + liquidate + burn tokens + Exercise + Claim collateral AFTER updateParameters ', () => {
    before('revert', async () => {
      await reverter.revert();

      let repo = await optionsContracts[0].getRepoByIndex(0);
      expect(repo['0'].toString()).to.equal(repo1Collateral);
      expect(repo['1'].toString()).to.equal(repo1PutsOutstanding);

      repo = await optionsContracts[0].getRepoByIndex(1);
      expect(repo['0'].toString()).to.equal(repo2Collateral);
      expect(repo['1'].toString()).to.equal(repo2PutsOutstanding);
    });

    it('only owner should be able to update parameters', async () => {
      await expectRevert(
        optionsContracts[0].updateParameters(0, 0, 0, 0, 0, {
          from: firstRepoOwnerAddress,
          gas: '100000'
        }),
        'Ownable: caller is not the owner.'
      );
    });

    it('owner should be able to update parameters', async () => {
      const liquidationIncentive = 20;
      const liquidationFactor = 1000;
      const liquidationFee = 10;
      const transactionFee = 10;
      const collateralizationRatio = 20;

      let currentCollateralizationRatio = await optionsContracts[0].collateralizationRatio();
      expect(currentCollateralizationRatio[0].toString()).to.equal('16');

      await optionsContracts[0].updateParameters(
        liquidationIncentive,
        liquidationFactor,
        liquidationFee,
        transactionFee,
        collateralizationRatio,
        { from: creatorAddress, gas: '100000' }
      );

      currentCollateralizationRatio = await optionsContracts[0].collateralizationRatio();
      expect(currentCollateralizationRatio[0].toString()).to.equal('20');
    });

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

      expect(result).to.be.true;
    });

    it('repo 2 should be unsafe after Compund Oracle drops price', async () => {
      compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(1);

      expect(result).to.be.true;
    });

    it('anyone should be able to add ETH collateral to Repo 2', async () => {
      let repoState = await optionsContracts[0].getRepoByIndex(1);
      const initialCollateral = new BN(repoState['0'].toString());

      await optionsContracts[0].addETHCollateral(1, {
        from: creatorAddress,
        gas: '100000',
        value: repo2Collateral
      });

      repoState = await optionsContracts[0].getRepoByIndex(1);
      const finalCollateral = new BN(repoState['0'].toString());

      expect(finalCollateral.toString()).to.equal(
        initialCollateral.add(new BN(repo2Collateral)).toString()
      );
    });

    it('repo 2 should be safe after adding ETH collateral', async () => {
      const result = await optionsContracts[0].isUnsafe(1);
      expect(result).to.be.false;
    });

    it('repo 1 should be safe after Compund Oracle increases price', async () => {
      await compoundOracle.updatePrice(400, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.false;
    });

    it('secondRepoOwnerAddress should be able to remove collateral', async () => {
      let repoState = await optionsContracts[0].getRepoByIndex(1);
      const initialCollateral = new BN(repoState['0'].toString());
      const initialETH = await balance.current(secondRepoOwnerAddress);
      const txInfo = await optionsContracts[0].removeCollateral(
        1,
        repo2Collateral,
        {
          from: secondRepoOwnerAddress,
          gas: '100000'
        }
      );

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(secondRepoOwnerAddress);

      repoState = await optionsContracts[0].getRepoByIndex(1);
      const finalCollateral = new BN(repoState['0'].toString());

      expect(finalCollateral.toString()).to.equal(
        initialCollateral.sub(new BN(repo2Collateral)).toString()
      );

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(new BN(repo2Collateral));
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it("firstRepoOwnerAddress shouldn't be able to remove collateral", async () => {
      await expectRevert(
        optionsContracts[0].removeCollateral(0, repo2Collateral, {
          from: firstRepoOwnerAddress,
          gas: '100000'
        }),
        'Repo is unsafe'
      );
    });

    it('repo 1 should be unsafe after Compund Oracle drops price', async () => {
      await compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });
      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.true;
    });

    it('repo 2 should be unsafe after Compund Oracle drops price', async () => {
      const result = await optionsContracts[0].isUnsafe(1);

      expect(result).to.be.true;
    });

    it('should be able to liquidate some collateral from Repo 1', async () => {
      const expectedCollateralToPay = new BN(9272718);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate('0', '101010', {
        from: tokenHolder,
        gas: '200000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(tokenHolder);

      expectEvent(txInfo, 'Liquidate', {
        amtCollateralToPay: expectedCollateralToPay
      });

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(expectedCollateralToPay);
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it('repo 1 should remain unsafe after Compund Oracle increases price', async () => {
      await compoundOracle.updatePrice(200, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.true;
    });

    it('repo 2 should be safe after Compund Oracle increases price', async () => {
      const result = await optionsContracts[0].isUnsafe(1);

      expect(result).to.be.false;
    });

    it('should be able to liquidate some more collateral from Repo 1', async () => {
      const expectedCollateralToPay = new BN(4590);
      const initialETH = await balance.current(tokenHolder);

      const repo = await optionsContracts[0].getRepoByIndex('0');

      const txInfo = await optionsContracts[0].liquidate('0', '100', {
        from: tokenHolder,
        gas: '200000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(tokenHolder);

      expectEvent(txInfo, 'Liquidate', {
        amtCollateralToPay: expectedCollateralToPay
      });

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(expectedCollateralToPay);
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it('repo 1 should remain unsafe after liquidation', async () => {
      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.true;
    });

    it('firstRepoOwner should be able to burn some put tokens to turn the repo safe', async () => {
      await optionsContracts[0].burnOTokens('0', '100000', {
        from: firstRepoOwnerAddress,
        gas: '100000'
      });

      const result = await optionsContracts[0].isUnsafe(0);

      expect(result).to.be.false;
    });

    it('secondExerciser should be able to exercise 10 oTokens', async () => {
      await compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

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

      const collateralClaimed = new BN(9999339);
      const underlyingClaimed = new BN(96938);

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
      const collateralClaimed = new BN(10631035);
      const underlyingClaimed = new BN(103061);

      const initialDaiBalance = new BN(
        (await dai.balanceOf(firstRepoOwnerAddress)).toString()
      );

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

    it('owner should be able to withdraw fee', async () => {
      const initialETH = await balance.current(creatorAddress);

      const txInfo = await optionsContracts[0].transferFee(creatorAddress, {
        from: creatorAddress,
        gas: '1000000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(creatorAddress);
      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(new BN('90967'));
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });
  });
});
