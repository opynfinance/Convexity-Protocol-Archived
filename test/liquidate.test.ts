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

import Reverter from './utils/reverter';

const {
  BN,
  balance,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

function checkVault(
  vault: any,
  {
    '0': expectedCollateral,
    '1': expectedPutsOutstanding
  }: { '0': string; '1': string }
) {
  expect(vault['0'].toString()).to.equal(expectedCollateral);
  expect(vault['1'].toString()).to.equal(expectedPutsOutstanding);
}

contract('OptionsContract', accounts => {
  const reverter = new Reverter(web3);

  const creatorAddress = accounts[0];
  const firstVaultOwnerAddress = accounts[1];
  const secondVaultOwnerAddress = accounts[2];

  const firstExerciser = accounts[3];
  const secondExerciser = accounts[4];

  const tokenHolder = accounts[5];

  const optionsContracts: OptionsContractInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let compoundOracle: MockCompoundOracleInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;

  const vault1Collateral = '20000000';
  const vault1PutsOutstanding = '250000';

  const vault2Collateral = '10000000';
  const vault2PutsOutstanding = '100000';

  const windowSize = 1589932800;

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
      -'18',
      -'14',
      '9',
      -'15',
      'USDC',
      '1589932800',
      windowSize,
      { from: creatorAddress, gas: '4000000' }
    );

    const optionsContractAddr = optionsContractResult.logs[1].args[0];
    optionsContracts.push(await OptionsContract.at(optionsContractAddr));

    // Open vault1, add Collateral and Mint oTokens
    await optionsContracts[0].openVault({
      from: firstVaultOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].addETHCollateral(firstVaultOwnerAddress, {
      from: firstVaultOwnerAddress,
      gas: '100000',
      value: vault1Collateral
    });

    await optionsContracts[0].issueOTokens(
      vault1PutsOutstanding,
      firstVaultOwnerAddress,
      {
        from: firstVaultOwnerAddress,
        gas: '100000'
      }
    );

    await optionsContracts[0].transfer(firstExerciser, '10', {
      from: firstVaultOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].transfer(tokenHolder, '101030', {
      from: firstVaultOwnerAddress,
      gas: '100000'
    });

    await reverter.snapshot();
  });

  describe('#liquidate()', () => {
    it('vault should be unsafe when the price drops', async () => {
      let result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      expect(result).to.be.false;

      await compoundOracle.updatePrice(100, {
        from: creatorAddress,
        gas: '1000000'
      });

      result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      expect(result).to.be.true;
    });

    it('should not be able to liquidate more than collateral factor when the price drops', async () => {
      // Try to liquidate the vault
      await expectRevert(
        optionsContracts[0].liquidate(firstVaultOwnerAddress, '1010100', {
          from: tokenHolder,
          gas: '100000'
        }),
        'Can only liquidate liquidation factor at any given time'
      );
    });

    it('should be able to liquidate when the price drops', async () => {
      const expectedCollateralToPay = new BN(9181809);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate(
        firstVaultOwnerAddress,
        '101010',
        {
          from: tokenHolder,
          gas: '200000'
        }
      );

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

      // check that the vault balances have changed
      const vault = await optionsContracts[0].getVault(firstVaultOwnerAddress);
      const expectedVault = {
        '0': '10818191',
        '1': '148990'
      };
      checkVault(vault, expectedVault);

      // check that the liquidator balances have changed
      const amtPTokens2 = await optionsContracts[0].balanceOf(tokenHolder);
      expect(amtPTokens2.toString()).to.equal('20');
    });

    it('should be able to liquidate if still undercollateralized', async () => {
      // check that vault is still unsafe
      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      expect(result).to.be.true;

      const expectedCollateralToPay = new BN(909);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate(
        firstVaultOwnerAddress,
        '10',
        {
          from: tokenHolder,
          gas: '200000'
        }
      );

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

      // check that the vault balances have changed
      const vault = await optionsContracts[0].getVault(firstVaultOwnerAddress);
      const expectedVault = {
        '0': '10817282',
        '1': '148980'
      };
      checkVault(vault, expectedVault);

      // check that the liquidator balances have changed
      const amtPTokens2 = await optionsContracts[0].balanceOf(tokenHolder);
      expect(amtPTokens2.toString()).to.equal('10');
    });

    it('should not be able to liquidate if safe', async () => {
      await compoundOracle.updatePrice(200, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      expect(result).to.be.false;

      // Try to liquidate the vault
      await expectRevert(
        optionsContracts[0].liquidate(firstVaultOwnerAddress, '10', {
          from: tokenHolder,
          gas: '100000'
        }),
        'Vault is safe'
      );
    });
  });
});
