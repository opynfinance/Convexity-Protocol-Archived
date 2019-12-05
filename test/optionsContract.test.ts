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
const MintableToken = artifacts.require('ERC20Mintable');

const truffleAssert = require('truffle-assertions');

import Reverter from './utils/reverter';

const { BN, balance, expectEvent, time } = require('@openzeppelin/test-helpers');

function checkRepo(
  repo: any,
  {
    '0': expectedCollateral,
    '1': expectedPutsOutstanding,
    '2': expectedOwner
  }: { '0': string; '1': string; '2': string }
) {
  expect(repo['0'].toString()).to.equal(expectedCollateral);
  expect(repo['1'].toString()).to.equal(expectedPutsOutstanding);
  expect(repo['2']).to.equal(expectedOwner);
}

function checkRepoOwners(repos: any, expected: string[]) {
  expect(repos)
    .to.be.an('array')
    .with.length(expected.length);
  for (let i = 0; i < repos.length; i++) {
    expect(repos[i].toString()).to.equal(expected[i]);
  }
}

// Initialize the Options Factory, Options Exchange and other mock contracts
contract('OptionsContract', accounts => {
  const reverter = new Reverter(web3);
  const creatorAddress = accounts[0];
  const firstOwnerAddress = accounts[1];

  const optionsContracts: OptionsContractInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;

  before('set up contracts', async () => {
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    await MockCompoundOracle.deployed();

    // 1.2 Mock Dai contract
    dai = await MintableToken.new();
    await dai.mint(creatorAddress, '10000000');

    // 2. Deploy our contracts
    // deploys the Options Exhange contract

    // Deploy the Options Factory contract and add assets to it
    optionsFactory = await OptionsFactory.deployed();

    await optionsFactory.addAsset('DAI', dai.address);
    // TODO: deploy a mock USDC and get its address
    await optionsFactory.addAsset(
      'USDC',
      '0xB5D0545dF2649359B1F91679f64812dc70Bfd547'
    );

    // Create the unexpired options contract
    let optionsContractResult = await optionsFactory.createOptionsContract(
      'ETH',
      -'18',
      'DAI',
      -'17',
      '90',
      -'18',
      'ETH',
      '1577836800',
      '1577836800',
      { from: creatorAddress, gas: '4000000' }
    );

    let optionsContractAddr = optionsContractResult.logs[1].args[0];
    optionsContracts.push(await OptionsContract.at(optionsContractAddr));

    // create the expired options contract
    optionsContractResult = await optionsFactory.createOptionsContract(
      'ETH',
      -'18',
      'DAI',
      -'17',
      '90',
      -'18',
      'ETH',
      '1',
      '1',
      { from: creatorAddress, gas: '4000000' }
    );

    const expiredOptionsAddr = optionsContractResult.logs[1].args[0];
    const expiredOptionsContract = await OptionsContract.at(expiredOptionsAddr);
    optionsContracts.push(expiredOptionsContract);

    optionsContractResult = await optionsFactory.createOptionsContract(
      'DAI',
      -'18',
      'ETH',
      -'17',
      '90',
      -'18',
      'ETH',
      '1577836800',
      '1577836800',
      { from: creatorAddress, gas: '4000000' }
    );

    optionsContractAddr = optionsContractResult.logs[1].args[0];
    const ERC20collateralOptContract = await OptionsContract.at(
      optionsContractAddr
    );
    optionsContracts.push(ERC20collateralOptContract);
  });

  describe('#openRepo()', () => {
    it('should open first repo correctly', async () => {
      const result = await optionsContracts[0].openRepo({
        from: creatorAddress,
        gas: '100000'
      });
      const repoIndex = '0';

      // test getReposByOwner
      const repos = await optionsContracts[0].getReposByOwner(creatorAddress);
      expect(repos)
        .to.be.an('array')
        .with.lengthOf(1);
      expect(repos[0].toString()).to.equal('0');

      // test getRepoByIndex
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      expect(repo['0'].toString()).to.equal('0');
      expect(repo['1'].toString()).to.equal('0');
      expect(repo['2']).to.equal(creatorAddress);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('RepoOpened');
      expect(result.logs[0].args.repoIndex.toString()).to.equal('0');
    });

    it('should open second repo correctly', async () => {
      const result = await optionsContracts[0].openRepo({
        from: creatorAddress,
        gas: '100000'
      });
      const repoIndex = '1';

      // test getReposByOwner
      const repos = await optionsContracts[0].getReposByOwner(creatorAddress);
      expect(repos)
        .to.be.an('array')
        .with.lengthOf(2);
      expect(repos[0].toString()).to.equal('0');
      expect(repos[1].toString()).to.equal('1');

      // test getRepoByIndex
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      expect(repo['0'].toString()).to.equal('0');
      expect(repo['1'].toString()).to.equal('0');
      expect(repo['2']).to.equal(creatorAddress);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('RepoOpened');
      expect(result.logs[0].args.repoIndex.toString()).to.equal('1');
    });

    it('new person should be able to open third repo correctly', async () => {
      const result = await optionsContracts[0].openRepo({
        from: firstOwnerAddress,
        gas: '100000'
      });
      const repoIndex = '2';

      // test getReposByOwner
      const repos = await optionsContracts[0].getReposByOwner(
        firstOwnerAddress
      );
      expect(repos)
        .to.be.an('array')
        .with.lengthOf(1);
      expect(repos[0].toString()).to.equal('2');

      // test getRepoByIndex
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      expect(repo['0'].toString()).to.equal('0');
      expect(repo['1'].toString()).to.equal('0');
      expect(repo['2']).to.equal(firstOwnerAddress);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('RepoOpened');
      expect(result.logs[0].args.repoIndex.toString()).to.equal('2');
    });

    it('should not be able to open a repo in an expired options contract', async () => {
      try {
        await optionsContracts[1].openRepo({
          from: firstOwnerAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');
    });
  });

  describe('#addETHCollateral()', () => {
    it('should add ETH collateral successfully', async () => {
      const repoNum = '1';
      const msgValue = '10000000';
      const result = await optionsContracts[0].addETHCollateral(repoNum, {
        from: creatorAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the repo's balances have been updated.
      const repo = await optionsContracts[0].getRepoByIndex(repoNum);
      const expectedRepo = {
        '0': '10000000',
        '1': '0',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.repoIndex.toString()).to.equal(repoNum);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);
    });

    it('anyone should be able to add ETH collateral to any repo', async () => {
      const repoNum = '1';
      const msgValue = '10000000';
      let result = await optionsContracts[0].addETHCollateral(repoNum, {
        from: firstOwnerAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the repo's balances have been updated.
      let repo = await optionsContracts[0].getRepoByIndex(repoNum);
      let expectedRepo = {
        '0': '20000000',
        '1': '0',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);

      result = await optionsContracts[0].addETHCollateral(2, {
        from: creatorAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the repo's balances have been updated.
      repo = await optionsContracts[0].getRepoByIndex(2);
      expectedRepo = {
        '0': '10000000',
        '1': '0',
        '2': firstOwnerAddress
      };
      checkRepo(repo, expectedRepo);
    });
    
      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.repoIndex.toString()).to.equal(repoNum);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);
    });

    // TODO: first have an opened repo in an expired contract, then check this.
    xit('should not be able to add ETH collateral to an expired options contract', async () => {
      try {
        const repoNum = 1;
        const msgValue = '10000000';
        await optionsContracts[1].addETHCollateral(repoNum, {
          from: firstOwnerAddress,
          gas: '100000',
          value: msgValue
        });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });
  });

  describe('#addERC20Collateral()', () => {
    it('should open ERC20 repo correctly', async () => {
      await optionsContracts[2].openRepo({
        from: creatorAddress,
        gas: '100000'
      });
      const repoIndex = '0';

      // test getReposByOwner
      const repos = await optionsContracts[2].getReposByOwner(creatorAddress);
      const expectedRepos = ['0'];
      checkRepoOwners(repos, expectedRepos);

      // test getRepoByIndex
      const repo = await optionsContracts[2].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '0',
        '1': '0',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);
    });

    it('should add ERC20 collateral successfully', async () => {
      const repoNum = 0;
      const msgValue = '10000000';
      await dai.approve(optionsContracts[2].address, '10000000000000000');
      const result = await optionsContracts[2].addERC20Collateral(
        repoNum,
        msgValue,
        {
          from: creatorAddress,
          gas: '1000000'
        }
      );

      // Adding ETH should emit an event correctly
      expect(result.logs[2].event).to.equal('ERC20CollateralAdded');
      expect(result.logs[2].args.repoIndex.toString()).to.equal('0');
      expect(result.logs[2].args.amount.toString()).to.equal(msgValue);

      // test that the repo's balances have been updated.
      const repo = await optionsContracts[2].getRepoByIndex('0');
      const expectedRepo = {
        '0': msgValue,
        '1': '0',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);
    });

    it('should not be able to add ERC20 collateral to non-ERC20 collateralized options contract', async () => {
      try {
        const repoNum = 1;
        const msgValue = '10000000';
        await optionsContracts[0].addERC20Collateral(repoNum, '0', {
          from: firstOwnerAddress,
          gas: '100000',
          value: msgValue
        });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });

    it('should not be able to add ETH collateral to non-ETH collateralized options contract', async () => {
      try {
        const repoNum = 0;
        const msgValue = '10000000';
        await optionsContracts[2].addETHCollateral(repoNum, {
          from: firstOwnerAddress,
          gas: '100000',
          value: msgValue
        });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });
  });

  describe('#issueOptionTokens()', () => {
    it('should allow you to mint correctly', async () => {
      const repoIndex = '1';
      const numTokens = '138888';

      const result = await optionsContracts[0].issueOptionTokens(
        repoIndex,
        numTokens,
        {
          from: creatorAddress,
          gas: '100000'
        }
      );
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal(numTokens);

      // Minting oTokens should emit an event correctly
      expect(result.logs[2].event).to.equal('IssuedOptionTokens');
      expect(result.logs[2].args.issuedTo).to.equal(creatorAddress);
    });

    it('only owner should of repo should be able to mint', async () => {
      const repoIndex = '1';
      const numTokens = '100';
      try {
        await optionsContracts[0].issueOptionTokens(repoIndex, numTokens, {
          from: firstOwnerAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');

      // the balance of the contract caller should be 0. They should not have gotten tokens.
      const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens.toString()).to.equal('0');
    });

    it('should only allow you to mint tokens if you have sufficient collateral', async () => {
      const repoIndex = '1';
      const numTokens = '2';
      try {
        await optionsContracts[0].issueOptionTokens(repoIndex, numTokens, {
          from: creatorAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');

      // the balance of the contract caller should be 0. They should not have gotten tokens.
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal('138888');
    });

    // TODO: Need to check a contract that expires
    xit('should not be able to issue tokens after expiry');
  });

  describe('#burnPutTokens()', () => {
    it('should be able to burn put tokens', async () => {
      const repoIndex = '1';
      const numTokens = '10';

      const result = await optionsContracts[0].burnPutTokens(
        repoIndex,
        numTokens,
        {
          from: creatorAddress,
          gas: '100000'
        }
      );
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal('138878');
    });

    xit('correct events should be emitted');

    it('only owner should be able to burn tokens', async () => {
      await optionsContracts[0].transfer(firstOwnerAddress, '10', {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens.toString()).to.equal('10');

      const repoIndex = '1';
      const numTokens = '10';

      try {
        await optionsContracts[0].burnPutTokens(repoIndex, numTokens, {
          from: firstOwnerAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });
  });

  describe('#removeCollateral()', () => {
    it('should be able to remove collateral if sufficiently collateralized', async () => {
      const repoIndex = '1';
      const numTokens = '1000';

      const result = await optionsContracts[0].removeCollateral(
        repoIndex,
        numTokens,
        {
          from: creatorAddress,
          gas: '100000'
        }
      );

      // Check the contract correctly updated the repo
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '19999000',
        '1': '138878',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);

      // TODO: Check that the owner correctly got their collateral back.

      // TODO: check event emitted
    });

    it('only owner should be able to remove collateral', async () => {
      const repoIndex = '0';
      const numTokens = '10';
      try {
        await optionsContracts[0].removeCollateral(repoIndex, numTokens, {
          from: firstOwnerAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');
    });

    it('should be able to remove more collateral if sufficient collateral', async () => {
      const repoIndex = '1';
      const numTokens = '500';

      const result = await optionsContracts[0].removeCollateral(
        repoIndex,
        numTokens,
        {
          from: creatorAddress,
          gas: '100000'
        }
      );

      // TODO: Check correct event emitted

      // Check the contract correctly updated the repo
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '19998500',
        '1': '138878',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);
    });

    it('should not be able to remove collateral if not sufficient collateral', async () => {
      const repoIndex = '1';
      const numTokens = '70';

      try {
        await optionsContracts[0].removeCollateral(repoIndex, numTokens, {
          from: creatorAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');

      // check that the collateral in the repo remains the same
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '19998500',
        '1': '138878',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);
    });

    it('should not be able to remove collateral after expiry');
  });

  describe('#exercise', () => {
    describe('during expiry window', () => {
      let initialETH: BN;
      let finalETH: BN;
      let gasUsed: BN;
      let gasPrice: BN;
      let txInfo: any;

      it('should be able to call exercise', async () => {
        const amtToExercise = '10';

        // ensure the person has enough oTokens
        await optionsContracts[0].transfer(secondOwnerAddress, amtToExercise, {
          from: creatorAddress,
          gas: '100000'
        });
        const amtPTokens = await optionsContracts[0].balanceOf(
          secondOwnerAddress
        );
        expect(amtPTokens.toString()).to.equal(amtToExercise);

        // ensure the person has enough underyling
        const ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
        expect(ownerDaiBal.toString()).to.equal('0');
        await dai.mint(secondOwnerAddress, '100000', { from: creatorAddress });
        await dai.approve(
          optionsContracts[0].address,
          '10000000000000000000000',
          { from: secondOwnerAddress }
        );

        // call exercise
        // ensure you approve before burn
        await optionsContracts[0].approve(
          optionsContracts[0].address,
          '10000000000000000',
          { from: secondOwnerAddress }
        );

        initialETH = await balance.current(secondOwnerAddress);

        txInfo = await optionsContracts[0].exercise(amtToExercise, {
          from: secondOwnerAddress,
          gas: '1000000'
        });

        const tx = await web3.eth.getTransaction(txInfo.tx);
        finalETH = await balance.current(secondOwnerAddress);

        gasUsed = new BN(txInfo.receipt.gasUsed);
        gasPrice = new BN(tx.gasPrice);
      });

      // TODO: Check tx.logs for the events emitted by a transaction
      it('check the calculations for the events emitted', async () => {
        expectEvent(txInfo, 'Exercise', {
          amtUnderlyingToPay: new BN(100),
          amtCollateralToPay: new BN(900)
        });
      });

      it('check that the underlying and oTokens were transferred', async () => {
        // The balances of the person should be 0
        const amtPTokens = await optionsContracts[0].balanceOf(
          secondOwnerAddress
        );
        expect(amtPTokens.toString()).to.equal('0');

        const ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
        expect(ownerDaiBal.toString()).to.equal('99900');

        // The underlying balances of the contract should have increased
        const contractDaiBal = await dai.balanceOf(optionsContracts[0].address);
        expect(contractDaiBal.toString()).to.equal('100');

        // check the supply of oTokens has changed
        const totalSupply = await optionsContracts[0].totalSupply();
        expect(totalSupply.toString()).to.equal('138868');

        const expectedEndETHBalance = initialETH
          .sub(gasUsed.mul(gasPrice))
          .add(new BN(900));
        expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
      });
    });

    describe('after expiry window', () => {
      it('first person should be able to collect their share of collateral', async () => {
        await reverter.snapshot();

        const repoIndex = '1';

        const initialETH = await balance.current(creatorAddress);

        const txInfo = await optionsContracts[0].claimCollateral(repoIndex, {
          from: creatorAddress,
          gas: '1000000'
        });

        const tx = await web3.eth.getTransaction(txInfo.tx);
        const finalETH = await balance.current(creatorAddress);

        // check the calculations on amount of collateral paid out and underlying transferred is correct
        expect(txInfo.logs[0].event).to.equal('ClaimedCollateral');
        expect(txInfo.logs[0].args.amtCollateralClaimed.toString()).to.equal(
          '19997900'
        );
        expect(txInfo.logs[0].args.amtUnderlyingClaimed.toString()).to.equal(
          '66'
        );

        const gasUsed = new BN(txInfo.receipt.gasUsed);
        const gasPrice = new BN(tx.gasPrice);
        const expectedEndETHBalance = initialETH
          .sub(gasUsed.mul(gasPrice))
          .add(new BN(19997900));
        expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());

        // check the person's underlying balance increased
        const ownerDaiBal = await dai.balanceOf(creatorAddress);
        expect(ownerDaiBal.toString()).to.equal('66');
      });

      it('only the owner of the repo should be able to collect collateral', async () => {
        const repoIndex = '2';

        try {
          await optionsContracts[0].claimCollateral(repoIndex, {
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
        const repoIndex = '2';
        const tx = await optionsContracts[0].claimCollateral(repoIndex, {
          from: firstOwnerAddress,
          gas: '1000000'
        });

        // check the calculations on amount of collateral paid out and underlying transferred is correct
        expect(tx.logs[0].event).to.equal('ClaimedCollateral');
        expect(tx.logs[0].args.amtCollateralClaimed.toString()).to.equal(
          '9999699'
        );

        const ownerDaiBal = await dai.balanceOf(firstOwnerAddress);
        expect(ownerDaiBal.toString()).to.equal('33');
      });
    });
  });
  // describe('#liquidate()', () => {
  //   it('repo should be unsafe when the price drops', async () => {
  //     // Make sure Repo is safe before price drop
  //     const isUnsafe = await optionsContracts[0].isUnsafe('1');
  //     expect(isUnsafe).to.be.false;

  //     // change the oracle price:
  //     await compoundOracle.updatePrice('100');

  //     // Make sure repo is unsafe after price drop
  //     const isUnsafeAfterPriceDrop = await optionsContracts[0].isUnsafe('1');
  //     expect(isUnsafeAfterPriceDrop).to.be.true;
  //   });

  //   it('should not be able to liquidate more than collateral factor when the price drops', async () => {
  //     // Try to liquidate the repo
  //     try {
  //       await optionsContracts[0].liquidate('1', '11001105', {
  //         from: firstOwnerAddress,
  //         gas: '100000'
  //       });
  //     } catch (err) {
  //       return;
  //     }

  //     truffleAssert.fails('should throw err');
  //   });

  //   it('should be able to liquidate when the price drops', async () => {
  //     const repoIndex = '1';
  //     //Liquidator first needs oTokens
  //     await optionsContracts[0].transfer(firstOwnerAddress, '11001100', {
  //       from: creatorAddress,
  //       gas: '100000'
  //     });
  //     const amtPTokens1 = await optionsContracts[0].balanceOf(
  //       firstOwnerAddress
  //     );
  //     expect(amtPTokens1.toString()).to.equal('11001110');

  //     // Approve before burn
  //     await optionsContracts[0].approve(
  //       optionsContracts[0].address,
  //       '10000000000000000',
  //       { from: firstOwnerAddress }
  //     );

  //     // Try to liquidate the repo
  //     const tx = await optionsContracts[0].liquidate(repoIndex, '11001100', {
  //       from: firstOwnerAddress,
  //       gas: '100000'
  //     });

  //     // Check that the correct liquidate events are emitted
  //     expect(tx.logs[0].event).to.equal('Liquidate');
  //     expect(tx.logs[0].args.amtCollateralToPay.toString()).to.equal('9999999');

  //     // check that the repo balances have changed
  //     const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
  //     const expectedRepo = {
  //       '0': '10000001',
  //       '1': '16776667',
  //       '2': creatorAddress
  //     };
  //     checkRepo(repo, expectedRepo);

  //     // check that the liquidator balances have changed
  //     const amtPTokens2 = await optionsContracts[0].balanceOf(
  //       firstOwnerAddress
  //     );
  //     expect(amtPTokens2.toString()).to.equal('10');
  //     // TODO: how to check that collateral has increased?
  //   });

  //   it('should be able to liquidate if still undercollateralized', async () => {
  //     const repoIndex = '1';
  //     //Liquidator first needs oTokens
  //     await optionsContracts[0].transfer(firstOwnerAddress, '1000', {
  //       from: creatorAddress,
  //       gas: '100000'
  //     });
  //     const amtPTokens1 = await optionsContracts[0].balanceOf(
  //       firstOwnerAddress
  //     );
  //     expect(amtPTokens1.toString()).to.equal('1010');

  //     // Approve before burn
  //     await optionsContracts[0].approve(
  //       optionsContracts[0].address,
  //       '10000000000000000',
  //       { from: firstOwnerAddress }
  //     );

  //     // Try to liquidate the repo
  //     const tx = await optionsContracts[0].liquidate(repoIndex, '1000', {
  //       from: firstOwnerAddress,
  //       gas: '100000'
  //     });

  //     // Check that the correct liquidate events are emitted
  //     expect(tx.logs[0].event).to.equal('Liquidate');
  //     expect(tx.logs[0].args.amtCollateralToPay.toString()).to.equal('909');

  //     // check that the repo balances have changed
  //     const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
  //     const expectedRepo = {
  //       '0': '9999092',
  //       '1': '16775667',
  //       '2': creatorAddress
  //     };
  //     checkRepo(repo, expectedRepo);

  //     // check that the liquidator balances have changed
  //     const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
  //     expect(amtPTokens.toString()).to.equal('10');
  //     // TODO: how to check that collateral has increased?
  //   });

  //   it('should not be able to liquidate if safe');
  // });

});
