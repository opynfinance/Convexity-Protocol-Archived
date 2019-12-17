import { expect } from 'chai';
import {
  ERC20MintableInstance,
  OptionsContractInstance,
  OptionsFactoryInstance
} from '../build/types/truffle-types';

const OptionsContract = artifacts.require('OptionsContract');
const OptionsFactory = artifacts.require('OptionsFactory');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MintableToken = artifacts.require('ERC20Mintable');

const truffleAssert = require('truffle-assertions');

const {
  BN,
  time,
  expectEvent,
  balance
} = require('@openzeppelin/test-helpers');

// Initialize the Options Factory, Options Exchange and other mock contracts
contract('OptionsContract', accounts => {
  const creatorAddress = accounts[0];
  const firstOwnerAddress = accounts[1];
  const secondOwnerAddress = accounts[2];

  let optionsContracts: OptionsContractInstance;
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;

  before('set up contracts', async () => {
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    await MockCompoundOracle.deployed();

    // 1.2 Mock Dai contract
    dai = await MintableToken.new();

    // 2. Deploy our contracts
    // Deploy the Options Factory contract and add assets to it
    optionsFactory = await OptionsFactory.deployed();

    await optionsFactory.addAsset('DAI', dai.address);
    // TODO: deploy a mock USDC and get its address
    await optionsFactory.addAsset(
      'USDC',
      '0xB5D0545dF2649359B1F91679f64812dc70Bfd547'
    );

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
      '1577836800',
      { from: creatorAddress, gas: '4000000' }
    );

    const optionsContractAddr = optionsContractResult.logs[1].args[0];
    optionsContracts = await OptionsContract.at(optionsContractAddr);

    // Open two repos
    await optionsContracts.openRepo({ from: creatorAddress, gas: '100000' });
    await optionsContracts.openRepo({ from: firstOwnerAddress, gas: '100000' });

    // Add Collateral to both repos
    let repoNum = '0';
    let msgValue = '20000000';
    await optionsContracts.addETHCollateral(repoNum, {
      from: creatorAddress,
      gas: '100000',
      value: msgValue
    });

    repoNum = '1';
    msgValue = '10000000';
    await optionsContracts.addETHCollateral(repoNum, {
      from: firstOwnerAddress,
      gas: '100000',
      value: msgValue
    });

    // Mint tokens
    repoNum = '0';
    let numTokens = '25000';
    optionsContracts.issueOTokens(repoNum, numTokens, creatorAddress, {
      from: creatorAddress,
      gas: '100000'
    });

    repoNum = '1';
    numTokens = '10000';
    optionsContracts.issueOTokens(repoNum, numTokens, firstOwnerAddress, {
      from: firstOwnerAddress,
      gas: '100000'
    });
  });

  describe('#exercise() during expiry window', () => {
    let initialETH: BN;
    let finalETH: BN;
    let gasUsed: BN;
    let gasPrice: BN;
    let txInfo: any;

    it('should be able to call exercise', async () => {
      const amtToExercise = '10';

      // ensure the person has enough oTokens
      await optionsContracts.transfer(secondOwnerAddress, amtToExercise, {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts.balanceOf(secondOwnerAddress);
      expect(amtPTokens.toString()).to.equal(amtToExercise);

      // ensure the person has enough underyling
      const ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
      expect(ownerDaiBal.toString()).to.equal('0');
      await dai.mint(secondOwnerAddress, '100000', { from: creatorAddress });
      await dai.approve(optionsContracts.address, '10000000000000000000000', {
        from: secondOwnerAddress
      });

      const totalSupplyBefore = new BN(
        (await optionsContracts.totalSupply()).toString()
      );

      // call exercise
      // ensure you approve before burn
      await optionsContracts.approve(
        optionsContracts.address,
        '10000000000000000',
        { from: secondOwnerAddress }
      );

      initialETH = await balance.current(secondOwnerAddress);

      txInfo = await optionsContracts.exercise(amtToExercise, {
        from: secondOwnerAddress,
        gas: '1000000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      finalETH = await balance.current(secondOwnerAddress);

      gasUsed = new BN(txInfo.receipt.gasUsed);
      gasPrice = new BN(tx.gasPrice);

      // check that the person gets the right amount of ETH back
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(new BN(450));
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());

      // check the supply of oTokens has changed
      const totalSupplyAfter = await optionsContracts.totalSupply();
      expect(totalSupplyBefore.sub(new BN(amtToExercise)).toString()).to.equal(
        totalSupplyAfter.toString()
      );

      // check that the right events were emitted
      expectEvent(txInfo, 'Exercise', {
        amtUnderlyingToPay: new BN(100000),
        amtCollateralToPay: new BN(450)
      });
    });

    it('check that the underlying and oTokens were transferred', async () => {
      // The balances of the person should be 0
      const amtPTokens = await optionsContracts.balanceOf(secondOwnerAddress);
      expect(amtPTokens.toString()).to.equal('0');

      const ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
      expect(ownerDaiBal.toString()).to.equal('0');

      // The underlying balances of the contract should have increased
      const contractDaiBal = await dai.balanceOf(optionsContracts.address);
      expect(contractDaiBal.toString()).to.equal('100000');
    });
  });

  describe('#exercise() after expiry window', () => {
    it('first person should be able to collect their share of collateral', async () => {
      const repoIndex = '0';

      await time.increaseTo(1577836802);

      const initialETH = await balance.current(creatorAddress);

      const txInfo = await optionsContracts.claimCollateral(repoIndex, {
        from: creatorAddress,
        gas: '1000000'
      });

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(creatorAddress);
      // check the calculations on amount of collateral paid out and underlying transferred is correct
      expect(txInfo.logs[0].event).to.equal('ClaimedCollateral');
      expect(txInfo.logs[0].args.amtCollateralClaimed.toString()).to.equal(
        '19999700'
      );
      expect(txInfo.logs[0].args.amtUnderlyingClaimed.toString()).to.equal(
        '66666'
      );

      // TODO: check the person's collateral balance went up
      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(new BN(19999700));
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());

      // check the person's underlying balance increased
      const ownerDaiBal = await dai.balanceOf(creatorAddress);
      expect(ownerDaiBal.toString()).to.equal('66666');
    });

    it('only the owner of the repo should be able to collect collateral', async () => {
      const repoIndex = '1';

      try {
        await optionsContracts.claimCollateral(repoIndex, {
          from: creatorAddress,
          gas: '1000000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw err');
    });

    it(
      'once collateral has been collected, should not be able to collect again'
    );

    it('the second person should be able to collect their share of collateral', async () => {
      const repoIndex = '1';
      const tx = await optionsContracts.claimCollateral(repoIndex, {
        from: firstOwnerAddress,
        gas: '1000000'
      });

      // check the calculations on amount of collateral paid out and underlying transferred is correct
      expect(tx.logs[0].event).to.equal('ClaimedCollateral');
      expect(tx.logs[0].args.amtCollateralClaimed.toString()).to.equal(
        '9999850'
      );

      const ownerDaiBal = await dai.balanceOf(firstOwnerAddress);
      // expect(ownerDaiBal.toString()).to.equal('33333');
    });
  });
});
