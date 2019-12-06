import { expect } from 'chai';
import {
  OptionsFactoryInstance,
  MockCompoundOracleInstance
} from '../build/types/truffle-types';

const Web3Utils = require('web3-utils');
const OptionsFactory = artifacts.require('OptionsFactory');
const MockCompoundOracle = artifacts.require('MockCompoundOracle');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const OptionsContract = artifacts.require('OptionsContract');
const truffleAssert = require('truffle-assertions');

contract('OptionsFactory', accounts => {
  const creatorAddress = accounts[0];
  const firstOwnerAddress = accounts[1];

  let optionsFactory: OptionsFactoryInstance;
  let compoundOracle: MockCompoundOracleInstance;

  before(async () => {
    optionsFactory = await OptionsFactory.deployed();
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    compoundOracle = await MockCompoundOracle.deployed();

    // 2. Deploy our contracts
    // deploys the Options Exhange contract

    // Deploy the Options Factory contract and add assets to it
    optionsFactory = await OptionsFactory.deployed();
  });

  describe('#addAsset()', () => {
    it('should add an asset correctly', async () => {
      // Add the asset
      const result = await optionsFactory.addAsset(
        'DAI',
        '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
      );
      // check for proper event emitted
      truffleAssert.eventEmitted(result, 'AssetAdded', (ev: any) => {
        return (
          ev.asset === Web3Utils.keccak256('DAI') &&
          ev.addr === '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
        );
      });
      // check the supports Asset function
      const supported = await optionsFactory.supportsAsset('DAI');

      expect(supported).to.be.true;
    });

    it('should not add ETH', async () => {
      try {
        const result = await optionsFactory.addAsset(
          'ETH',
          '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
        );
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });

    it('fails if anyone but owner tries to add asset', async () => {
      try {
        await optionsFactory.addAsset(
          'BAT',
          '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
          { from: firstOwnerAddress }
        );
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });

    it('fails if an asset is added twice', async () => {
      try {
        // await util.setBlockNumberForward(8);
        await optionsFactory.addAsset(
          'DAI',
          '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
        );
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });

    it('should add a second asset correctly', async () => {
      // Add the asset
      const result = await optionsFactory.addAsset(
        'BAT',
        '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
      );
      // check for proper event emitted
      truffleAssert.eventEmitted(result, 'AssetAdded', (ev: any) => {
        return (
          ev.asset === Web3Utils.keccak256('BAT') &&
          ev.addr === '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
        );
      });
      // check the supports Asset function
      const supported = await optionsFactory.supportsAsset('BAT');

      expect(supported).to.be.true;
    });
  });
  describe('#changeAsset()', () => {
    it('should change an asset that exists correctly', async () => {
      const result = await optionsFactory.changeAsset(
        'BAT',
        '0xEd1af8c036fcAEbc5be8FcbF4a85d08F67Ce5Fa1'
      );
      // check for proper event emitted
      truffleAssert.eventEmitted(result, 'AssetChanged', (ev: any) => {
        return (
          ev.asset === Web3Utils.keccak256('BAT') &&
          ev.addr === '0xEd1af8c036fcAEbc5be8FcbF4a85d08F67Ce5Fa1'
        );
      });
    });

    it("fails if asset doesn't exist", async () => {
      try {
        const result = await optionsFactory.changeAsset(
          'ZRX',
          '0xEd1af8c036fcAEbc5be8FcbF4a85d08F67Ce5Fa1'
        );
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });

    it('fails if anyone but owner tries to change asset', async () => {
      try {
        await optionsFactory.changeAsset(
          'BAT',
          '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
          { from: firstOwnerAddress }
        );
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });
  });

  describe('#deleteAsset()', () => {
    it('should delete an asset that exists correctly', async () => {
      const result = await optionsFactory.deleteAsset('BAT');
      // check for proper event emitted
      truffleAssert.eventEmitted(result, 'AssetDeleted', (ev: any) => {
        return ev.asset === Web3Utils.keccak256('BAT');
      });
    });

    it("fails if asset doesn't exist", async () => {
      try {
        const result = await optionsFactory.deleteAsset('ZRX');
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });

    it('fails if anyone but owner tries to delete asset', async () => {
      try {
        await optionsFactory.deleteAsset('BAT', { from: firstOwnerAddress });
      } catch (err) {
        return;
      }
      truffleAssert.fails('should throw error');
    });
  });

  describe('#createOptionsContract()', () => {
    it('should create a new options contract correctly', async () => {
      const result = await optionsFactory.createOptionsContract(
        'ETH',
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

      // Test that the Factory stores addresses of any new options contract added.
      const index = (
        await optionsFactory.getNumberOfOptionsContracts()
      ).toNumber();
      const lastAdded = await optionsFactory.optionsContracts(index - 1);

      truffleAssert.eventEmitted(result, 'OptionContractCreated', (ev: any) => {
        return ev.addr === lastAdded;
      });
    });
    it('anyone else should be able to create a second options contract correctly', async () => {
      const result = await optionsFactory.createOptionsContract(
        'ETH',
        -'18',
        'ETH',
        -'17',
        '90',
        -'18',
        'ETH',
        '1577836800',
        '1577836800',
        { from: firstOwnerAddress, gas: '4000000' }
      );

      // Test that the Factory stores addresses of any new options contract added.
      const index = (
        await optionsFactory.getNumberOfOptionsContracts()
      ).toNumber();
      const lastAdded = await optionsFactory.optionsContracts(index - 1);

      truffleAssert.eventEmitted(result, 'OptionContractCreated', (ev: any) => {
        return ev.addr === lastAdded;
      });

      // Check the ownership
      const ownerFactory = await optionsFactory.owner();
      expect(ownerFactory).to.equal(creatorAddress);

      // TODO: check that the ownership of the options contract is the creator address
      const optionsContractAddr = result.logs[1].args[0];
      const optionContract = await OptionsContract.at(optionsContractAddr);

      const optionContractOwner = await optionContract.owner();
      expect(optionContractOwner).to.equal(creatorAddress);
    });
  });
});
