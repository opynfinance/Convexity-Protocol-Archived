import { expect } from 'chai';
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

function checkVault(
  vault: any,
  {
    '0': expectedCollateral,
    '1': expectedPutsOutstanding,
    '2': expectedOwner
  }: { '0': string; '1': string; '2': string }
) {
  expect(vault['0'].toString()).to.equal(expectedCollateral);
  expect(vault['1'].toString()).to.equal(expectedPutsOutstanding);
  expect(vault['2']).to.equal(expectedOwner);
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
  const creatorAddress = accounts[0];
  const firstOwnerAddress = accounts[1];

  const optionsContracts: oTokenInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;

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
      '1577836800',
      '1577836800',
      { from: creatorAddress, gas: '4000000' }
    );

    let optionsContractAddr = optionsContractResult.logs[1].args[0];
    optionsContracts.push(await oToken.at(optionsContractAddr));

    // create the expired options contract
    optionsContractResult = await optionsFactory.createOptionsContract(
      'ETH',
      -'18',
      'DAI',
      -'18',
      -'17',
      '90',
      -'18',
      'ETH',
      '1',
      '1',
      { from: creatorAddress, gas: '4000000' }
    );

    const expiredOptionsAddr = optionsContractResult.logs[1].args[0];
    const expiredOptionsContract = await oToken.at(expiredOptionsAddr);
    optionsContracts.push(expiredOptionsContract);

    optionsContractResult = await optionsFactory.createOptionsContract(
      'USDC',
      -'18',
      'DAI',
      -'18',
      -'17',
      '90',
      -'18',
      'USDC',
      '1577836800',
      '1577836800',
      { from: creatorAddress, gas: '4000000' }
    );

    optionsContractAddr = optionsContractResult.logs[1].args[0];
    const ERC20collateralOptContract = await oToken.at(optionsContractAddr);
    optionsContracts.push(ERC20collateralOptContract);
  });

  describe('#openVault()', () => {
    it('should open first vault correctly', async () => {
      const result = await optionsContracts[0].openVault({
        from: creatorAddress,
        gas: '100000'
      });
      const vaultIndex = '0';

      // test getVaultsByOwner
      const vaults = await optionsContracts[0].getVaultsByOwner(creatorAddress);
      expect(vaults)
        .to.be.an('array')
        .with.lengthOf(1);
      expect(vaults[0].toString()).to.equal('0');

      // test getVaultByIndex
      const vault = await optionsContracts[0].getVaultByIndex(vaultIndex);
      expect(vault['0'].toString()).to.equal('0');
      expect(vault['1'].toString()).to.equal('0');
      expect(vault['2']).to.equal(creatorAddress);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('VaultOpened');
      expect(result.logs[0].args.vaultIndex.toString()).to.equal('0');
    });

    it('should open second vault correctly', async () => {
      const result = await optionsContracts[0].openVault({
        from: creatorAddress,
        gas: '100000'
      });
      const vaultIndex = '1';

      // test getVaultsByOwner
      const vaults = await optionsContracts[0].getVaultsByOwner(creatorAddress);
      expect(vaults)
        .to.be.an('array')
        .with.lengthOf(2);
      expect(vaults[0].toString()).to.equal('0');
      expect(vaults[1].toString()).to.equal('1');

      // test getVaultByIndex
      const vault = await optionsContracts[0].getVaultByIndex(vaultIndex);
      expect(vault['0'].toString()).to.equal('0');
      expect(vault['1'].toString()).to.equal('0');
      expect(vault['2']).to.equal(creatorAddress);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('VaultOpened');
      expect(result.logs[0].args.vaultIndex.toString()).to.equal('1');
    });

    it('new person should be able to open third vault correctly', async () => {
      const result = await optionsContracts[0].openVault({
        from: firstOwnerAddress,
        gas: '100000'
      });
      const vaultIndex = '2';

      // test getVaultsByOwner
      const vaults = await optionsContracts[0].getVaultsByOwner(
        firstOwnerAddress
      );
      expect(vaults)
        .to.be.an('array')
        .with.lengthOf(1);
      expect(vaults[0].toString()).to.equal('2');

      // test getVaultByIndex
      const vault = await optionsContracts[0].getVaultByIndex(vaultIndex);
      expect(vault['0'].toString()).to.equal('0');
      expect(vault['1'].toString()).to.equal('0');
      expect(vault['2']).to.equal(firstOwnerAddress);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('VaultOpened');
      expect(result.logs[0].args.vaultIndex.toString()).to.equal('2');
    });

    it('should not be able to open a vault in an expired options contract', async () => {
      try {
        await optionsContracts[1].openVault({
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
      const vaultNum = '1';
      const msgValue = '10000000';
      const result = await optionsContracts[0].addETHCollateral(vaultNum, {
        from: creatorAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the vault's balances have been updated.
      const vault = await optionsContracts[0].getVaultByIndex(vaultNum);
      const expectedVault = {
        '0': '10000000',
        '1': '0',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);

      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.vaultIndex.toString()).to.equal(vaultNum);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);
    });

    it('anyone should be able to add ETH collateral to any vault', async () => {
      const vaultNum = '1';
      const msgValue = '10000000';
      let result = await optionsContracts[0].addETHCollateral(vaultNum, {
        from: firstOwnerAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the vault's balances have been updated.
      let vault = await optionsContracts[0].getVaultByIndex(vaultNum);
      let expectedVault = {
        '0': '20000000',
        '1': '0',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);
      // check proper events emitted
      expect(result.logs[0].event).to.equal('ETHCollateralAdded');
      expect(result.logs[0].args.vaultIndex.toString()).to.equal(vaultNum);
      expect(result.logs[0].args.amount.toString()).to.equal(msgValue);

      result = await optionsContracts[0].addETHCollateral(2, {
        from: creatorAddress,
        gas: '100000',
        value: msgValue
      });

      // test that the vault's balances have been updated.
      vault = await optionsContracts[0].getVaultByIndex(2);
      expectedVault = {
        '0': '10000000',
        '1': '0',
        '2': firstOwnerAddress
      };
      checkVault(vault, expectedVault);
    });

    // TODO: first have an opened vault in an expired contract, then check this.
    xit('should not be able to add ETH collateral to an expired options contract', async () => {
      try {
        const vaultNum = 1;
        const msgValue = '10000000';
        await optionsContracts[1].addETHCollateral(vaultNum, {
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
    it('should open ERC20 vault correctly', async () => {
      await optionsContracts[2].openVault({
        from: creatorAddress,
        gas: '100000'
      });
      const vaultIndex = '0';

      // test getVaultsByOwner
      const vaults = await optionsContracts[2].getVaultsByOwner(creatorAddress);
      const expectedVaults = ['0'];
      checkVaultOwners(vaults, expectedVaults);

      // test getVaultByIndex
      const vault = await optionsContracts[2].getVaultByIndex(vaultIndex);
      const expectedVault = {
        '0': '0',
        '1': '0',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);
    });

    it('should add ERC20 collateral successfully', async () => {
      const vaultNum = 0;
      const msgValue = '10000000';
      await usdc.approve(optionsContracts[2].address, '10000000000000000');
      const result = await optionsContracts[2].addERC20Collateral(
        vaultNum,
        msgValue,
        {
          from: creatorAddress,
          gas: '1000000'
        }
      );

      // Adding ETH should emit an event correctly
      expect(result.logs[2].event).to.equal('ERC20CollateralAdded');
      expect(result.logs[2].args.vaultIndex.toString()).to.equal('0');
      expect(result.logs[2].args.amount.toString()).to.equal(msgValue);

      // test that the vault's balances have been updated.
      const vault = await optionsContracts[2].getVaultByIndex('0');
      const expectedVault = {
        '0': msgValue,
        '1': '0',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);
    });

    it('should not be able to add ERC20 collateral to non-ERC20 collateralized options contract', async () => {
      try {
        const vaultNum = 1;
        const msgValue = '10000000';
        await optionsContracts[0].addERC20Collateral(vaultNum, '0', {
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
        const vaultNum = 0;
        const msgValue = '10000000';
        await optionsContracts[2].addETHCollateral(vaultNum, {
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
      const vaultIndex = '1';
      const numTokens = '138888';

      const result = await optionsContracts[0].issueOTokens(
        vaultIndex,
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
      expect(result.logs[1].event).to.equal('IssuedOTokens');
      expect(result.logs[1].args.issuedTo).to.equal(creatorAddress);
    });

    it('only owner should of vault should be able to mint', async () => {
      const vaultIndex = '1';
      const numTokens = '100';
      try {
        await optionsContracts[0].issueOTokens(
          vaultIndex,
          numTokens,
          firstOwnerAddress,
          {
            from: firstOwnerAddress,
            gas: '100000'
          }
        );
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');

      // the balance of the contract caller should be 0. They should not have gotten tokens.
      const amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
      expect(amtPTokens.toString()).to.equal('0');
    });

    it('should only allow you to mint tokens if you have sufficient collateral', async () => {
      const vaultIndex = '1';
      const numTokens = '2';
      try {
        await optionsContracts[0].issueOTokens(
          vaultIndex,
          numTokens,
          creatorAddress,
          {
            from: creatorAddress,
            gas: '100000'
          }
        );
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

    it('should be able to issue options in the erc20 contract', async () => {
      const vaultIndex = '0';
      const numTokens = '10';

      await optionsContracts[2].issueOTokens(
        vaultIndex,
        numTokens,
        creatorAddress,
        {
          from: creatorAddress,
          gas: '100000'
        }
      );
      const amtPTokens = await optionsContracts[2].balanceOf(creatorAddress);
      expect(amtPTokens.toString()).to.equal(numTokens);
    });
  });

  describe('#burnOTokens()', () => {
    it('should be able to burn put tokens', async () => {
      const vaultIndex = '1';
      const numTokens = '10';

      await optionsContracts[0].burnOTokens(vaultIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });
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

      const vaultIndex = '1';
      const numTokens = '10';

      try {
        await optionsContracts[0].burnOTokens(vaultIndex, numTokens, {
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
      const vaultIndex = '1';
      const numTokens = '1000';

      await optionsContracts[0].removeCollateral(vaultIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });

      // Check the contract correctly updated the vault
      const vault = await optionsContracts[0].getVaultByIndex(vaultIndex);
      const expectedVault = {
        '0': '19999000',
        '1': '138878',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);

      // TODO: Check that the owner correctly got their collateral back.
      // TODO: check event emitted
    });

    it('only owner should be able to remove collateral', async () => {
      const vaultIndex = '0';
      const numTokens = '10';
      try {
        await optionsContracts[0].removeCollateral(vaultIndex, numTokens, {
          from: firstOwnerAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');
    });

    it('should be able to remove more collateral if sufficient collateral', async () => {
      const vaultIndex = '1';
      const numTokens = '500';

      await optionsContracts[0].removeCollateral(vaultIndex, numTokens, {
        from: creatorAddress,
        gas: '100000'
      });

      // TODO: Check correct event emitted

      // Check the contract correctly updated the vault
      const vault = await optionsContracts[0].getVaultByIndex(vaultIndex);
      const expectedVault = {
        '0': '19998500',
        '1': '138878',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);
    });

    it('should not be able to remove collateral if not sufficient collateral', async () => {
      const vaultIndex = '1';
      const numTokens = '70';

      try {
        await optionsContracts[0].removeCollateral(vaultIndex, numTokens, {
          from: creatorAddress,
          gas: '100000'
        });
      } catch (err) {
        return;
      }

      truffleAssert.fails('should throw error');

      // check that the collateral in the vault remains the same
      const vault = await optionsContracts[0].getVaultByIndex(vaultIndex);
      const expectedVault = {
        '0': '19998500',
        '1': '138878',
        '2': creatorAddress
      };
      checkVault(vault, expectedVault);
    });

    it('should not be able to remove collateral after expiry');
  });

  describe('#createOptions()', () => {
    it('should be able to create new ETH options in a new vault', async () => {
      const numOptions = '138888';
      const collateral = '20000000';
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
    });
    it('should be able to create new ERC20 options in a new vault', async () => {
      const numOptions = '100';
      const collateral = '20000000';
      await usdc.mint(creatorAddress, '20000000');
      await usdc.approve(optionsContracts[2].address, '10000000000000000');
      const result = await optionsContracts[2].createERC20CollateralOption(
        numOptions,
        collateral,
        creatorAddress,
        {
          from: creatorAddress
        }
      );
    });
  });
});
