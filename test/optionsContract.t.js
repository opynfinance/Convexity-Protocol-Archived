const expect = require('./chai-expect');

const OptionsContract = artifacts.require('../contracts/OptionsContract.sol');
const OptionsFactory = artifacts.require('../contracts/OptionsFactory.sol');
const OptionsExchange = artifacts.require('../contracts/OptionsExchange.sol');
const CompoundOracle = artifacts.require('../contracts/lib/MockCompoundOracle.sol');
const UniswapFactory = artifacts.require('../contracts/lib/MockUniswapFactory.sol');
const daiMock = artifacts.require('../contracts/lib/simpleERC20.sol');

const truffleAssert = require('truffle-assertions');

function checkRepo(repo, { '0': expectedCollateral, '1': expectedPutsOutstanding, '2': expectedOwner }) {
  expect(repo['0']).to.be.a.bignumber.that.equal(expectedCollateral);
  expect(repo['1']).to.be.a.bignumber.that.equal(expectedPutsOutstanding);
  expect(repo['2']).to.equal(expectedOwner);
}

function checkRepoOwners(repos, expected) {
  expect(repos).to.be.an('array').with.length(expected.length);
  for (let i = 0; i < repos.length; i++) {
    expect(repos[i]).to.be.a.bignumber.that.equal(expected[i]);
  }
}

// Initialize the Options Factory, Options Exchange and other mock contracts
contract('OptionsContract', (accounts) => {
  const creatorAddress = accounts[0];
  const firstOwnerAddress = accounts[1];
  const secondOwnerAddress = accounts[2];

  /* create named accounts for contract roles */

  let optionsContracts;
  let optionsFactory;
  let optionsExchange;
  let dai;

  before('set up contracts', async () => {
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    const compoundOracle = await CompoundOracle.deployed();
    // 1.2 Uniswap Factory
    const uniswapFactory = await UniswapFactory.deployed();
    // 1.3 Mock Dai contract
    dai = await daiMock.deployed();
    await dai.mint('10000000');
    // 2. Deploy our contracts
    // deploys the Options Exhange contract
    optionsExchange = await OptionsExchange.deployed();

    // TODO: remove this later. For now, set the compound Oracle and uniswap Factory addresses here.
    await optionsExchange.setUniswapAndCompound(uniswapFactory.address, compoundOracle.address);

    // Deploy the Options Factory contract and add assets to it
    optionsFactory = await OptionsFactory.deployed();
    await optionsFactory.setOptionsExchange(optionsExchange.address);

    await optionsFactory.addAsset(
      'DAI',
      dai.address
    );
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
      '1577836800'
    );

    let optionsContractAddr = optionsContractResult.logs[0].args[0];
    optionsContracts = [await OptionsContract.at(optionsContractAddr)];

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
      '1'
    );

    const expiredOptionsAddr = optionsContractResult.logs[0].args[0];
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
      '1577836800'
    );

    optionsContractAddr = optionsContractResult.logs[0].args[0];
    const ERC20collateralOptContract = await OptionsContract.at(optionsContractAddr);
    optionsContracts.push(ERC20collateralOptContract);
  });

  describe('#openRepo()', () => {
    it('should open first repo correctly', async () => {
      const result = await optionsContracts[0].openRepo({ from: creatorAddress, gas: '100000' });
      const repoIndex = '0';

      // test getReposByOwner
      const repos = await optionsContracts[0].getReposByOwner(creatorAddress);
      expect(repos).to.be.an('array').with.lengthOf(1);
      expect(repos[0]).to.be.a.bignumber.that.equal('0');

      // test getRepoByIndex
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      expect(repo['0']).to.be.a.bignumber.that.is.zero;
      expect(repo['1']).to.be.a.bignumber.that.is.zero;
      expect(repo['2']).to.equal(creatorAddress);
    });

    it('should open second repo correctly', async () => {

      const result = await optionsContracts[0].openRepo({ from: creatorAddress, gas: '100000' });
      const repoIndex = '1';

      // test getReposByOwner
      const repos = await optionsContracts[0].getReposByOwner(creatorAddress);
      expect(repos).to.be.an('array').with.lengthOf(2);
      expect(repos[0]).to.be.a.bignumber.that.equal('0');
      expect(repos[1]).to.be.a.bignumber.that.equal('1');

      // test getRepoByIndex
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      expect(repo['0']).to.be.a.bignumber.that.is.zero;
      expect(repo['1']).to.be.a.bignumber.that.is.zero;
      expect(repo['2']).to.equal(creatorAddress);
    });

    it('new person should be able to open third repo correctly', async () => {

      const result = await optionsContracts[0].openRepo({ from: firstOwnerAddress, gas: '100000' });
      const repoIndex = '2';

      // test getReposByOwner
      const repos = await optionsContracts[0].getReposByOwner(firstOwnerAddress);
      expect(repos).to.be.an('array').with.lengthOf(1);
      expect(repos[0]).to.be.a.bignumber.that.equal('2');

      // test getRepoByIndex
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      expect(repo['0']).to.be.a.bignumber.that.is.zero;
      expect(repo['1']).to.be.a.bignumber.that.is.zero;
      expect(repo['2']).to.equal(firstOwnerAddress);
    });

    it('should check for proper events emitted during all open repo calls', async () => {
      // Opening should Emit an event correctly
      const returnValues = (await optionsContracts[0].getPastEvents('RepoOpened', { fromBlock: 0, toBlock: 'latest' }));
      let repoIndex = returnValues[0].returnValues.repoIndex;
      expect(repoIndex).to.bignumber.equal('0');
      repoIndex = returnValues[1].returnValues.repoIndex;
      expect(repoIndex).to.bignumber.equal('1');
      repoIndex = returnValues[2].returnValues.repoIndex;
      expect(repoIndex).to.bignumber.equal('2');
    });

    it('should not be able to open a repo in an expired options contract', async () => {
      try {
        const result = await optionsContracts[1].openRepo({ from: firstOwnerAddress, gas: '100000' });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');
    });

  });

  describe('#addETHCollateral()', () => {


    it('should add ETH collateral successfully', async () => {
      const repoNum = 1;
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
    });

    it('anyone should be able to add ETH collateral to any repo', async () => {
      const repoNum = 1;
      const msgValue = '10000000';
      const result = await optionsContracts[0].addETHCollateral(repoNum, {
        from: firstOwnerAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the repo's balances have been updated.
      const repo = await optionsContracts[0].getRepoByIndex(repoNum);
      const expectedRepo = {
        '0': '20000000',
        '1': '0',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);
    });

    it('add ETH events should be emitted', async () => {
      // Adding ETH should emit an event correctly
      const returnValues = (await optionsContracts[0].getPastEvents('ETHCollateralAdded', {
        fromBlock: 0,
        toBlock: 'latest'
      }));
      let repoIndex1 = returnValues[0].returnValues.repoIndex;
      let amount = returnValues[0].returnValues.amount;
      expect(repoIndex1).to.bignumber.equal('1');
      expect(amount).to.bignumber.equal('10000000');

      repoIndex1 = returnValues[1].returnValues.repoIndex;
      amount = returnValues[1].returnValues.amount;
      expect(repoIndex1).to.bignumber.equal('1');
      expect(amount).to.bignumber.equal('10000000');
    });

    it('should not be able to add ETH collateral to an expired options contract', async () => {
      try {
        const repoNum = 1;
        const msgValue = '10000000';
        const result = await optionsContracts[1].addETHCollateral(repoNum, {
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
      const result = await optionsContracts[2].openRepo({ from: creatorAddress, gas: '100000' });
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
      const result = await optionsContracts[2].addERC20Collateral(repoNum, msgValue, {
        from: creatorAddress,
        gas: '1000000'
      });

      // Adding ETH should emit an event correctly
      const returnValues = (await optionsContracts[2].getPastEvents('ERC20CollateralAdded', {
        fromBlock: 0,
        toBlock: 'latest'
      }))[0].returnValues;
      const repoIndex1 = returnValues.repoIndex;
      const amount = returnValues.amount;
      expect(repoIndex1).to.bignumber.equal('0');
      expect(amount).to.bignumber.equal(msgValue);

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
        const result = await optionsContracts[0].addERC20Collateral(repoNum, {
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
        const result = await optionsContracts[2].addETHCollateral(repoNum, {
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

      const result = await optionsContracts[0].issueOptionTokens(repoIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens).to.bignumber.equal(numTokens);
    });

    it('should emit events correctly', async () => {
      const returnValues = (await optionsContracts[0].getPastEvents('IssuedOptionTokens', {
        fromBlock: 0,
        toBlock: 'latest'
      }))[0].returnValues;
      const personIssuedTo = returnValues.issuedTo;
      expect(personIssuedTo).to.equal(creatorAddress);
    });

    it('only owner should of repo should be able to mint', async () => {
      const repoIndex = '1';
      const numTokens = '100';
      try {
        const result = await optionsContracts[0].issueOptionTokens(repoIndex, numTokens, {
          from: firstOwnerAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');

      // the balance of the contract caller should be 0. They should not have gotten tokens.
      const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
      console.log(amtPTokens);
      expect(amtPTokens).to.bignumber.equal('0');

    });

    it('should only allow you to mint tokens if you have sufficient collateral', async () => {
      const repoIndex = '1';
      const numTokens = '2';
      try {
        const result = await optionsContracts[0].issueOptionTokens(repoIndex, numTokens, {
          from: creatorAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');

      // the balance of the contract caller should be 0. They should not have gotten tokens.
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens).to.bignumber.equal('138888');
    });
    it('should not be able to issue tokens after expiry', async () => {

    });

  });

  describe('#burnPutTokens()', () => {
    it('should be able to burn put tokens', async () => {
      const repoIndex = '1';
      const numTokens = '10';

      const result = await optionsContracts[0].burnPutTokens(repoIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens).to.bignumber.equal('138878');
    });

    it('correct events should be emitted');

    it('only owner should be able to burn tokens', async () => {
      const transferred = await optionsContracts[0].transfer(firstOwnerAddress, '10', {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens).to.bignumber.equal('10');

      const repoIndex = '1';
      const numTokens = '10';

      try {
        const result = await optionsContracts[0].burnPutTokens(repoIndex, numTokens, {
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

      const result = await optionsContracts[0].removeCollateral(repoIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });

      // Check the contract correctly updated the repo
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '19999000',
        '1': '138878',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);

      // Check that the owner correctly got their collateral back.
    });

    it('only owner should be able to remove collateral', async () => {

      try {
        const result = await optionsContracts[0].removeCollateral(repoIndex, '10', {
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

      const result = await optionsContracts[0].removeCollateral(repoIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });

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
      try {
        const result = await optionsContracts[0].removeCollateral(repoIndex, '5', {
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
        '0': '19999000',
        '1': '138878',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);
    });

    it('should not be able to remove collateral after expiry');

  });

  describe('#exercise', () => {
    describe('during expiry window', () => {
      it('should be able to call exercise', async () => {
        const amtToExercise = '10';

        // ensure the person has enough oTokens
        await optionsContracts[0].transfer(secondOwnerAddress, amtToExercise, { from: creatorAddress, gas: '100000' });
        const amtPTokens = await optionsContracts[0].balanceOf(secondOwnerAddress);
        expect(amtPTokens).to.bignumber.equal(amtToExercise);

        // ensure the person has enough underyling
        const ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
        expect(ownerDaiBal.toString()).to.bignumber.equal('0');
        await dai.mint('100000', { from: secondOwnerAddress });
        await dai.approve(optionsContracts[0].address, '10000000000000000000000', { from: secondOwnerAddress });

        // call exercise
        // ensure you approve before burn
        await optionsContracts[0].approve(optionsContracts[0].address, '10000000000000000', { from: secondOwnerAddress });
        await optionsContracts[0].exercise(amtToExercise, { from: secondOwnerAddress, gas: '1000000' });

      });

      it('check the calculations for the events emitted', async () => {
        // check the calculations on amount of collateral paid out and underlying transferred is correct
        const returnValues = (await optionsContracts[0].getPastEvents('Exercise', { fromBlock: 0, toBlock: 'latest' }));
        const amtUnderlying = returnValues[0].returnValues.amtUnderlyingToPay;
        expect(amtUnderlying).to.bignumber.equal('100000');
        const amtCollateral = returnValues[0].returnValues.amtCollateralToPay;
        expect(amtCollateral).to.bignumber.equal('450');
      });

      it('check that the underlying and oTokens were transferred', async () => {
        // The balances of the person should be 0
        amtPTokens = await optionsContracts[0].balanceOf(secondOwnerAddress);
        expect(amtPTokens).to.bignumber.equal('0');
        const ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
        expect(ownerDaiBal).to.bignumber.equal('0');

        // The underlying balances of the contract should have increased
        const contractDaiBal = await dai.balanceOf(optionsContracts[0].options.address);
        expect(contractDaiBal).to.bignumber.equal('100000');

        // check the supply of oTokens has changed
        const totalSupply = await optionsContracts[0].totalSupply();
        expect(totalSupply).to.bignumber.equal('34990');

        // TODO: check that the person gets the right amount of ETH back
      });

    });

    describe('after expiry window', () => {
      it('first person should be able to collect their share of collateral', async () => {
        const repoIndex = '1';
        await optionsContracts[0].claimCollateral(repoIndex, { from: creatorAddress, gas: '1000000' });

        // check the calculations on amount of collateral paid out and underlying transferred is correct
        const returnValues = (await optionsContracts[0].getPastEvents('ClaimedCollateral', {
          fromBlock: 0,
          toBlock: 'latest'
        }));
        const amtCollateral = returnValues[0].returnValues.amtCollateralClaimed;
        expect(amtCollateral).to.bignumber.equal('19999700');
        const amtUnderlying = returnValues[0].returnValues.amtUnderlyingClaimed;
        expect(amtUnderlying).to.bignumber.equal('66666');

        // TODO: check the person's collateral balance went up

        // check the person's underlying balance increased
        const ownerDaiBal = await dai.balanceOf(creatorAddress);
        expect(ownerDaiBal.toString()).to.bignumber.equal('66666');

      });

      it('only the owner of the repo should be able to collect collateral', async () => {
        const repoIndex = '2';

        try {
          await optionsContracts[0].claimCollateral(repoIndex, { from: creatorAddress, gas: '1000000' });
        } catch (err) {
          return;
        }

        truffleAssert.fails('should throw err');
      });

      it('once collateral has been collected, should not be able to collect again');

      it('the second person should be able to collect their share of collateral', async () => {
        const repoIndex = '2';
        await optionsContracts[0].claimCollateral(repoIndex, { from: firstOwnerAddress, gas: '1000000' });

        // check the calculations on amount of collateral paid out and underlying transferred is correct
        const returnValues = (await optionsContracts[0].getPastEvents('ClaimedCollateral', {
          fromBlock: 0,
          toBlock: 'latest'
        }));
        const amtCollateral = returnValues[1].returnValues.amtCollateralClaimed;
        expect(amtCollateral).to.bignumber.equal('9999850');

        const ownerDaiBal = await dai.balanceOf(firstOwnerAddress);
        expect(ownerDaiBal.toString()).to.bignumber.equal('33333');
      });
    });
  });


  describe('#liquidate()', () => {
    it('repo should be unsafe when the price drops', async () => {
      // Make sure Repo is safe before price drop
      await optionsContracts[0].isUnsafe('1');
      const returnValues1 = (await optionsContracts[0].getPastEvents('unsafeCalled', {
        fromBlock: 0,
        toBlock: 'latest'
      }));
      expect(returnValues1[0].returnValues.isUnsafe).to.be.false;

      // change the oracle price:
      await compoundOracle.updatePrice('100');

      // Make sure repo is unsafe after price drop
      const unsafeAgain = await optionsContracts[0].isUnsafe('1');
      const returnValues2 = (await optionsContracts[0].getPastEvents('unsafeCalled', {
        fromBlock: 0,
        toBlock: 'latest'
      }));
      expect(returnValues2[1].returnValues.isUnsafe).to.be.true;
    });

    it('should not be able to liquidate more than collateral factor when the price drops', async () => {
      // Try to liquidate the repo
      try {
        await optionsContracts[0].liquidate('1', '11001105', { from: firstOwnerAddress, gas: '100000' });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw err');
    });

    it('should be able to liquidate when the price drops', async () => {
      const repoIndex = '1';
      //Liquidator first needs oTokens
      await optionsContracts[0].transfer(firstOwnerAddress, '11001100', { from: creatorAddress, gas: '100000' });
      const amtPTokens1 = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens1).to.bignumber.equal('11001110');

      // Approve before burn
      await optionsContracts[0].approve(optionsContracts[0].options.address, '10000000000000000', { from: firstOwnerAddress });

      // Try to liquidate the repo
      await optionsContracts[0].liquidate(repoIndex, '11001100', { from: firstOwnerAddress, gas: '100000' });

      // Check that the correct liquidate events are emitted
      const returnValues = (await optionsContracts[0].getPastEvents('Liquidate', { fromBlock: 0, toBlock: 'latest' }));
      expect(returnValues[0].returnValues.amtCollateralToPay).to.bignumber.equal('9999999');

      // check that the repo balances have changed
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '10000001',
        '1': '16776667',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);

      // check that the liquidator balances have changed
      const amtPTokens2 = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens2).to.bignumber.equal('10');
      // TODO: how to check that collateral has increased?

    });

    it('should be able to liquidate if still undercollateralized', async () => {
      const repoIndex = '1';
      //Liquidator first needs oTokens
      await optionsContracts[0].transfer(firstOwnerAddress, '1000', { from: creatorAddress, gas: '100000' });
      const amtPTokens1 = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens1).to.bignumber.equal('1010');

      // Approve before burn
      await optionsContracts[0].approve(optionsContracts[0].address, '10000000000000000', { from: firstOwnerAddress });

      // Try to liquidate the repo
      await optionsContracts[0].liquidate(repoIndex, '1000', { from: firstOwnerAddress, gas: '100000' });

      // Check that the correct liquidate events are emitted
      const returnValues = (await optionsContracts[0].getPastEvents('Liquidate', { fromBlock: 0, toBlock: 'latest' }));
      expect(returnValues[1].returnValues.amtCollateralToPay).to.bignumber.equal('909');

      // check that the repo balances have changed
      const repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '9999092',
        '1': '16775667',
        '2': creatorAddress
      };
      checkRepo(repo, expectedRepo);

      // check that the liquidator balances have changed
      const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens).to.bignumber.equal('10');
      // TODO: how to check that collateral has increased?

    });

    it('should not be able to liquidate if safe');
  });


});