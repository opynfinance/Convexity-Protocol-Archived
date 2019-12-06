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

const {
  BN,
  balance,
  expectEvent,
  time
} = require('@openzeppelin/test-helpers');

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
      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.repoIndex.toString()).to.equal(repoNum);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);

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

  describe('#issueOTokens()', () => {
    it('should allow you to mint correctly', async () => {
      const repoIndex = '1';
      const numTokens = '138888';

      const result = await optionsContracts[0].issueOTokens(
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
      expect(result.logs[1].event).to.equal('IssuedOTokens');
      expect(result.logs[1].args.issuedTo).to.equal(creatorAddress);
    });

    it('only owner should of repo should be able to mint', async () => {
      const repoIndex = '1';
      const numTokens = '100';
      try {
        await optionsContracts[0].issueOTokens(repoIndex, numTokens, {
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
        await optionsContracts[0].issueOTokens(repoIndex, numTokens, {
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

  describe('#burnOTokens()', () => {
    it('should be able to burn put tokens', async () => {
      const repoIndex = '1';
      const numTokens = '10';

      const result = await optionsContracts[0].burnOTokens(
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
        await optionsContracts[0].burnOTokens(repoIndex, numTokens, {
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

  describe('#createOptions()', () => {
    it('should be able to create new ETH options in a new repo', async () => {
      const numOptions = '138888';
      const collateral = '20000000';
      const result = await optionsContracts[0].createETHCollateralOptionNewRepo(
        numOptions,
        {
          from: creatorAddress,
          value: collateral
        }
      );

      // Minting oTokens should emit an event correctly
      expect(result.logs[3].event).to.equal('IssuedOTokens');
      expect(result.logs[3].args.issuedTo).to.equal(creatorAddress);
    });
    xit('should be able to create new ERC20 options in a new repo', async () => {
      const numOptions = '100';
      const collateral = '20000000';

      await dai.mint(creatorAddress, '20000000');
      await dai.approve(optionsContracts[2].address, '10000000000000000');

      const result = await optionsContracts[2].createERC20CollateralOptionNewRepo(
        numOptions,
        collateral,
        {
          from: creatorAddress
        }
      );

      // Minting oTokens should emit an event correctly
      expect(result.logs[3].event).to.equal('IssuedOTokens');
      expect(result.logs[3].args.issuedTo).to.equal(creatorAddress);
    });
  });
});
