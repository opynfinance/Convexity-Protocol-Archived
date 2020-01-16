import {expect} from 'chai';
import {
  ERC20MintableInstance,
  OptionsFactoryInstance,
  oTokenInstance
} from '../build/types/truffle-types';

const oToken = artifacts.require('oToken');
const OptionsFactory = artifacts.require('OptionsFactory');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MintableToken = artifacts.require('ERC20Mintable');

const truffleAssert = require('truffle-assertions');

import Reverter from './utils/reverter';

import {getUnixTime, addMonths} from 'date-fns';

const {time, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

function checkVault(
  vault: any,
  {
    '0': expectedCollateral,
    '1': expectedPutsOutstanding
  }: {'0': string; '1': string}
) {
  expect(vault['0'].toString()).to.equal(expectedCollateral);
  expect(vault['1'].toString()).to.equal(expectedPutsOutstanding);
}

function checkVaultOwners(vaults: any, expected: string[]) {
  expect(vaults)
    .to.be.an('array')
    .with.length(expected.length);
  for (let i = 0; i < vaults.length; i++) {
    expect(vaults[i].toString()).to.equal(expected[i]);
  }
}

// Initialize the Options Factory, Options Exchange and other mock contracts
contract('OptionsContract', accounts => {
  const reverter = new Reverter(web3);

  const creatorAddress = accounts[0];
  const firstOwnerAddress = accounts[1];
  const nonOwnerAddress = accounts[2];

  const optionsContracts: oTokenInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;

  const now = Date.now();
  const expiry = getUnixTime(addMonths(now, 3));
  const windowSize = expiry;

  before('set up contracts', async () => {
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    await MockCompoundOracle.deployed();

    // 1.2 Mock Dai contract
    dai = await MintableToken.new();
    await dai.mint(creatorAddress, '10000000');

    // 1.3 Mock USDC contract
    usdc = await MintableToken.new();
    await usdc.mint(creatorAddress, '10000000');
    await usdc.mint(nonOwnerAddress, '10000000');

    // 2. Deploy our contracts
    // deploys the Options Exhange contract

    // Deploy the Options Factory contract and add assets to it
    optionsFactory = await OptionsFactory.deployed();

    await optionsFactory.addAsset('DAI', dai.address);
    await optionsFactory.addAsset('USDC', usdc.address);

    // Create the unexpired options contract
    let optionsContractResult = await optionsFactory.createOptionsContract(
      'ETH',
      -'18',
      'DAI',
      -'18',
      -'17',
      '90',
      -'18',
      'ETH',
      expiry,
      windowSize,
      {from: creatorAddress, gas: '4000000'}
    );

    let optionsContractAddr = optionsContractResult.logs[1].args[0];
    optionsContracts.push(await oToken.at(optionsContractAddr));

    optionsContractResult = await optionsFactory.createOptionsContract(
      'USDC',
      -'18',
      'DAI',
      -'18',
      -'17',
      '90',
      -'18',
      'USDC',
      expiry,
      windowSize,
      {from: creatorAddress, gas: '4000000'}
    );

    optionsContractAddr = optionsContractResult.logs[1].args[0];
    const ERC20collateralOptContract = await oToken.at(optionsContractAddr);
    optionsContracts.push(ERC20collateralOptContract);

    await reverter.snapshot();
  });

  describe('#openVault()', () => {
    it('should open first vault correctly', async () => {
      const result = await optionsContracts[0].openVault({
        from: creatorAddress,
        gas: '100000'
      });

      // test getVault
      const vault = await optionsContracts[0].getVault(creatorAddress);
      expect(vault['0'].toString()).to.equal('0');
      expect(vault['1'].toString()).to.equal('0');
      expect(vault['2'].toString()).to.equal('0');
      expect(vault['3']).to.equal(true);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('VaultOpened');
    });

    it("shouldn't allow to open second vault correctly", async () => {
      await expectRevert(
        optionsContracts[0].openVault({
          from: creatorAddress,
          gas: '100000'
        }),
        'Vault already created'
      );
    });

    it('new person should be able to open third vault correctly', async () => {
      const result = await optionsContracts[0].openVault({
        from: firstOwnerAddress,
        gas: '100000'
      });

      // test getVault
      const vault = await optionsContracts[0].getVault(firstOwnerAddress);
      expect(vault['0'].toString()).to.equal('0');
      expect(vault['1'].toString()).to.equal('0');
      expect(vault['2'].toString()).to.equal('0');
      expect(vault['3']).to.equal(true);
    });
  });

  describe('#addETHCollateral()', () => {
    it("shouldn't be able to add ETH collateral to a 0x0 address", async () => {
      const msgValue = '10000000';
      await expectRevert(
        optionsContracts[0].addETHCollateral(
          '0x0000000000000000000000000000000000000000',
          {
            from: creatorAddress,
            gas: '100000',
            value: msgValue
          }
        ),
        'Vault does not exist'
      );
    });

    it('should add ETH collateral successfully', async () => {
      const msgValue = '10000000';
      const result = await optionsContracts[0].addETHCollateral(
        creatorAddress,
        {
          from: creatorAddress,
          gas: '100000',
          value: msgValue
        }
      );

      // test that the vault's balances have been updated.
      const vault = await optionsContracts[0].getVault(creatorAddress);
      const expectedVault = {
        '0': '10000000',
        '1': '0'
      };
      checkVault(vault, expectedVault);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.vaultOwner).to.equal(creatorAddress);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);
    });

    it('anyone should be able to add ETH collateral to any vault', async () => {
      const msgValue = '10000000';
      let result = await optionsContracts[0].addETHCollateral(creatorAddress, {
        from: firstOwnerAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the vault's balances have been updated.
      let vault = await optionsContracts[0].getVault(creatorAddress);
      let expectedVault = {
        '0': '20000000',
        '1': '0'
      };
      checkVault(vault, expectedVault);
      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.vaultOwner).to.equal(creatorAddress);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);
      expect(result.logs[0].args.payer).to.equal(firstOwnerAddress);

      result = await optionsContracts[0].addETHCollateral(firstOwnerAddress, {
        from: creatorAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the vault's balances have been updated.
      vault = await optionsContracts[0].getVault(firstOwnerAddress);
      expectedVault = {
        '0': '10000000',
        '1': '0'
      };
      checkVault(vault, expectedVault);
    });
  });

  describe('#addERC20Collateral()', () => {
    it('should open ERC20 vault correctly', async () => {
      await optionsContracts[1].openVault({
        from: creatorAddress,
        gas: '100000'
      });

      const vault = await optionsContracts[1].getVault(creatorAddress);
      const expectedVault = {
        '0': '0',
        '1': '0'
      };
      checkVault(vault, expectedVault);
    });

    it('should add ERC20 collateral successfully', async () => {
      const msgValue = '10000000';
      await usdc.approve(optionsContracts[1].address, '10000000000000000');
      const result = await optionsContracts[1].addERC20Collateral(
        creatorAddress,
        msgValue,
        {
          from: creatorAddress,
          gas: '1000000'
        }
      );

      // Adding ETH should emit an event correctly
      expectEvent(result, 'ERC20CollateralAdded', {
        vaultOwner: creatorAddress,
        amount: msgValue
      });

      // test that the vault's balances have been updated.
      const vault = await optionsContracts[1].getVault(creatorAddress);
      const expectedVault = {
        '0': msgValue,
        '1': '0'
      };
      checkVault(vault, expectedVault);
    });

    it("shouldn't be able to add ERC20 collateral to a 0x0 address", async () => {
      await usdc.approve(optionsContracts[1].address, '10000000000000000', {
        from: nonOwnerAddress,
        gas: '1000000'
      });
      const msgValue = '10000000';
      await expectRevert(
        optionsContracts[1].addERC20Collateral(
          '0x0000000000000000000000000000000000000000',
          msgValue,
          {
            from: nonOwnerAddress,
            gas: '100000'
          }
        ),
        'Vault does not exist'
      );
    });

    it('should not be able to add ERC20 collateral to non-ERC20 collateralized options contract', async () => {
      try {
        const msgValue = '10000000';
        await optionsContracts[0].addERC20Collateral(firstOwnerAddress, '0', {
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
        const msgValue = '10000000';

        await optionsContracts[1].addETHCollateral(creatorAddress, {
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
      const numTokens = '138888';

      const result = await optionsContracts[0].issueOTokens(
        numTokens,
        creatorAddress,
        {
          from: creatorAddress,
          gas: '100000'
        }
      );

      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal(numTokens);

      // Minting oTokens should emit an event correctly
      expectEvent(result, 'IssuedOTokens', {
        issuedTo: creatorAddress,
        oTokensIssued: numTokens,
        vaultOwner: creatorAddress
      });
    });

    it('only owner should of a vault should be able to mint', async () => {
      const numTokens = '100';
      await expectRevert(
        optionsContracts[0].issueOTokens(numTokens, firstOwnerAddress, {
          from: nonOwnerAddress,
          gas: '100000'
        }),
        'Vault does not exist'
      );
    });

    it('should only allow you to mint tokens if you have sufficient collateral', async () => {
      const numTokens = '2';
      try {
        await optionsContracts[0].issueOTokens(numTokens, creatorAddress, {
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

    it('should be able to issue options in the erc20 contract', async () => {
      const numTokens = '10';
      await optionsContracts[1].issueOTokens(numTokens, creatorAddress, {
        from: creatorAddress,
        gas: '100000'
      });

      const amtPTokens = await optionsContracts[1].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal(numTokens);
    });
  });

  describe('#burnOTokens()', () => {
    it('should be able to burn oTokens', async () => {
      const numTokens = '10';

      const result = await optionsContracts[0].burnOTokens(numTokens, {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal('138878');

      expectEvent(result, 'BurnOTokens', {
        vaultOwner: creatorAddress,
        oTokensBurned: numTokens
      });
    });

    it('only owner should be able to burn oTokens', async () => {
      await optionsContracts[0].transfer(nonOwnerAddress, '10', {
        from: creatorAddress,
        gas: '100000'
      });
      const amtPTokens = await optionsContracts[0].balanceOf(nonOwnerAddress);
      expect(amtPTokens.toString()).to.equal('10');

      const numTokens = '10';

      await expectRevert(
        optionsContracts[0].burnOTokens(numTokens, {
          from: nonOwnerAddress,
          gas: '100000'
        }),
        'Vault does not exist'
      );
    });
  });

  describe('#removeCollateral()', () => {
    it('should revert when trying to remove 0 collateral', async () => {
      await expectRevert(
        optionsContracts[0].removeCollateral(0, {
          from: creatorAddress,
          gas: '100000'
        }),
        'Cannot remove 0 collateral'
      );
    });

    it('should be able to remove collateral if sufficiently collateralized', async () => {
      const numTokens = '1000';

      const result = await optionsContracts[0].removeCollateral(numTokens, {
        from: firstOwnerAddress,
        gas: '100000'
      });

      const vault = await optionsContracts[0].getVault(firstOwnerAddress);
      const expectedVault = {
        '0': '9999000',
        '1': '0'
      };
      checkVault(vault, expectedVault);

      // TODO: Check that the owner correctly got their collateral back.
      expectEvent(result, 'RemoveCollateral', {
        amtRemoved: numTokens,
        vaultOwner: firstOwnerAddress
      });
    });

    it('only owner should be able to remove collateral', async () => {
      const numTokens = '10';
      await expectRevert(
        optionsContracts[0].removeCollateral(numTokens, {
          from: nonOwnerAddress,
          gas: '100000'
        }),
        'Vault does not exist'
      );
    });

    it('should be able to remove more collateral if sufficient collateral', async () => {
      const numTokens = '500';

      const result = await optionsContracts[0].removeCollateral(numTokens, {
        from: creatorAddress,
        gas: '100000'
      });

      expectEvent(result, 'RemoveCollateral', {
        amtRemoved: numTokens,
        vaultOwner: creatorAddress
      });

      // Check the contract correctly updated the vault
      const vault = await optionsContracts[0].getVault(creatorAddress);
      const expectedVault = {
        '0': '19999500',
        '1': '138878'
      };
      checkVault(vault, expectedVault);
    });

    it('should not be able to remove collateral if not sufficient collateral', async () => {
      const numTokens = '7000';

      try {
        await optionsContracts[0].removeCollateral(numTokens, {
          from: creatorAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');

      // check that the collateral in the vault remains the same
      const vault = await optionsContracts[0].getVault(creatorAddress);
      const expectedVault = {
        '0': '19999500',
        '1': '138878'
      };
      checkVault(vault, expectedVault);
    });
  });

  describe('#createOptions()', () => {
    it('should be able to create a new Vault, add ETH collateral and issue oTokens', async () => {
      const numOptions = '138888';
      const collateral = '20000000';

      const result = await optionsContracts[0].createETHCollateralOption(
        numOptions,
        nonOwnerAddress,
        {
          from: nonOwnerAddress,
          value: collateral
        }
      );

      expectEvent(result, 'VaultOpened', {
        vaultOwner: nonOwnerAddress
      });

      expectEvent(result, 'ETHCollateralAdded', {
        vaultOwner: nonOwnerAddress,
        amount: collateral,
        payer: nonOwnerAddress
      });

      expectEvent(result, 'IssuedOTokens', {
        issuedTo: nonOwnerAddress,
        oTokensIssued: numOptions,
        vaultOwner: nonOwnerAddress
      });
    });

    it('should be able to create a new Vault, add ERC20 collateral and issue oTokens', async () => {
      const numOptions = '100';
      const collateral = '20000000';

      await usdc.mint(nonOwnerAddress, '20000000');
      await usdc.approve(optionsContracts[1].address, '10000000000000000', {
        from: nonOwnerAddress,
        gas: '4000000'
      });

      const result = await optionsContracts[1].createERC20CollateralOption(
        numOptions,
        collateral,
        nonOwnerAddress,
        {
          from: nonOwnerAddress
        }
      );

      expectEvent(result, 'VaultOpened', {
        vaultOwner: nonOwnerAddress
      });

      expectEvent(result, 'ERC20CollateralAdded', {
        vaultOwner: nonOwnerAddress,
        amount: collateral,
        payer: nonOwnerAddress
      });

      expectEvent(result, 'IssuedOTokens', {
        issuedTo: nonOwnerAddress,
        oTokensIssued: numOptions,
        vaultOwner: nonOwnerAddress
      });
    });
  });

  describe('#transferVaultOwnership()', () => {
    it('should revert when trying to transferVaultOwnership to current owner', async () => {
      await expectRevert(
        optionsContracts[0].transferVaultOwnership(creatorAddress, {
          from: creatorAddress,
          gas: '100000'
        }),
        'New owner already has a vault'
      );
    });

    it('should revert when trying to transferVaultOwnership to current 0x0 address', async () => {
      await expectRevert(
        optionsContracts[0].transferVaultOwnership(
          '0x0000000000000000000000000000000000000000',
          {
            from: creatorAddress,
            gas: '100000'
          }
        ),
        'Invalid new owner address'
      );
    });
  });

  describe('expired OptionContract', () => {
    before(async () => {
      await reverter.revert();

      await optionsContracts[0].openVault({
        from: creatorAddress,
        gas: '100000'
      });

      await time.increaseTo(expiry + 2);
    });

    it('should not be able to open a vault in an expired options contract', async () => {
      await expectRevert(
        optionsContracts[0].openVault({
          from: creatorAddress,
          gas: '100000'
        }),
        'Options contract expired'
      );
    });

    it('should not be able to add ETH collateral to an expired options contract', async () => {
      await expectRevert(
        optionsContracts[0].addETHCollateral(firstOwnerAddress, {
          from: firstOwnerAddress,
          gas: '100000',
          value: '10000000'
        }),
        'Options contract expired'
      );
    });

    it('should not be able to add ERC20 collateral to an expired options contract', async () => {
      await expectRevert(
        optionsContracts[1].addETHCollateral(creatorAddress, {
          from: creatorAddress,
          gas: '100000',
          value: '10000000'
        }),
        'Options contract expired'
      );
    });
  });
});
