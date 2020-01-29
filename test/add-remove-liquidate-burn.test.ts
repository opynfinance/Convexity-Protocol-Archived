import {expect} from 'chai';
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

const {
  BN,
  constants,
  balance,
  time,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

contract('OptionsContract', accounts => {
  const creatorAddress = accounts[0];
  const firstVaultOwnerAddress = accounts[1];
  const secondVaultOwnerAddress = accounts[2];

  const tokenHolder = accounts[3];

  const optionsContracts: OptionsContractInstance[] = [];
  let optionsFactory: OptionsFactoryInstance;
  let optionsExchange: OptionsExchangeInstance;
  let compoundOracle: MockCompoundOracleInstance;
  let dai: ERC20MintableInstance;
  let usdc: ERC20MintableInstance;

  const vault1Collateral = '20000000';
  const vault1PutsOutstanding = '250000';

  const vault2Collateral = '10000000';
  const vault2PutsOutstanding = '100000';

  before('set up contracts', async () => {
    // 1. Deploy mock contracts
    // 1.1 Compound Oracle
    compoundOracle = await MockCompoundOracle.deployed();
    // 1.2 Uniswap Factory
    const uniswapFactory = await MockUniswapFactory.new();
    // 1.3 Mock Dai contract
    dai = await MintableToken.new();
    await dai.mint(creatorAddress, '10000000');
    await dai.mint(tokenHolder, '100000', {from: creatorAddress});
    // 1.4 Mock Dai contract
    usdc = await MintableToken.new();
    await usdc.mint(creatorAddress, '10000000');
    // 2. Deploy our contracts
    // deploys the Options Exhange contract
    optionsExchange = await OptionsExchange.deployed();

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
      '1589932800',
      {from: creatorAddress, gas: '4000000'}
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

    await optionsContracts[0].transfer(tokenHolder, '101010', {
      from: firstVaultOwnerAddress,
      gas: '100000'
    });

    // Open vault2, add Collateral and Mint oTokens
    await optionsContracts[0].openVault({
      from: secondVaultOwnerAddress,
      gas: '100000'
    });

    await optionsContracts[0].addETHCollateral(secondVaultOwnerAddress, {
      from: secondVaultOwnerAddress,
      gas: '100000',
      value: vault2Collateral
    });

    await optionsContracts[0].issueOTokens(
      vault2PutsOutstanding,
      secondVaultOwnerAddress,
      {
        from: secondVaultOwnerAddress,
        gas: '100000'
      }
    );

    await optionsContracts[0].transfer(tokenHolder, '1000', {
      from: secondVaultOwnerAddress,
      gas: '100000'
    });
  });

  describe('Scenario: Add + remove collateral + liquidate + burn tokens', () => {
    it('anyone should be able to add ETH collateral to vault 2', async () => {
      let vaultState = await optionsContracts[0].getVault(
        secondVaultOwnerAddress
      );
      const initialCollateral = new BN(vaultState['0'].toString());

      await optionsContracts[0].addETHCollateral(secondVaultOwnerAddress, {
        from: creatorAddress,
        gas: '100000',
        value: vault2Collateral
      });

      vaultState = await optionsContracts[0].getVault(secondVaultOwnerAddress);
      const finalCollateral = new BN(vaultState['0'].toString());

      expect(finalCollateral.toString()).to.equal(
        initialCollateral.add(new BN(vault2Collateral)).toString()
      );
    });

    it('vault 1 should be unsafe after Compund Oracle drops price', async () => {
      const newETHToUSDPrice = 100;
      const newPrice = Math.floor((1 / newETHToUSDPrice) * 10 ** 18).toString();
      await compoundOracle.updatePrice(newPrice, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      expect(result).to.be.true;
    });

    it('vault 2 should be safe after Compund Oracle drops price', async () => {
      const result = await optionsContracts[0].isUnsafe(
        secondVaultOwnerAddress
      );
      expect(result).to.be.false;
    });

    it('vault 1 should be safe after Compund Oracle increases price', async () => {
      const newETHToUSDPrice = 200;
      const newPrice = Math.floor((1 / newETHToUSDPrice) * 10 ** 18).toString();
      await compoundOracle.updatePrice(newPrice, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      expect(result).to.be.false;
    });

    it('secondVaultOwnerAddress should be able to remove collateral', async () => {
      let vaultState = await optionsContracts[0].getVault(
        secondVaultOwnerAddress
      );
      const initialCollateral = new BN(vaultState['0'].toString());
      const initialETH = await balance.current(secondVaultOwnerAddress);
      const txInfo = await optionsContracts[0].removeCollateral(
        vault2Collateral,
        {
          from: secondVaultOwnerAddress,
          gas: '100000'
        }
      );

      const tx = await web3.eth.getTransaction(txInfo.tx);
      const finalETH = await balance.current(secondVaultOwnerAddress);

      vaultState = await optionsContracts[0].getVault(secondVaultOwnerAddress);
      const finalCollateral = new BN(vaultState['0'].toString());

      expect(finalCollateral.toString()).to.equal(
        initialCollateral.sub(new BN(vault2Collateral)).toString()
      );

      const gasUsed = new BN(txInfo.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const expectedEndETHBalance = initialETH
        .sub(gasUsed.mul(gasPrice))
        .add(new BN(vault2Collateral));
      expect(finalETH.toString()).to.equal(expectedEndETHBalance.toString());
    });

    it("firstVaultOwnerAddress shouldn't be able to remove collateral", async () => {
      await expectRevert(
        optionsContracts[0].removeCollateral(vault2Collateral, {
          from: firstVaultOwnerAddress,
          gas: '100000'
        }),
        'Vault is unsafe'
      );
    });

    it('vault 1 should be unsafe after Compund Oracle drops price', async () => {
      const newETHToUSDPrice = 100;
      const newPrice = Math.floor((1 / newETHToUSDPrice) * 10 ** 18).toString();
      await compoundOracle.updatePrice(newPrice, {
        from: creatorAddress,
        gas: '1000000'
      });

      // const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);
      // expect(result).to.be.true;
    });

    it('vault 2 should be unsafe after Compund Oracle drops price', async () => {
      const result = await optionsContracts[0].isUnsafe(
        secondVaultOwnerAddress
      );

      expect(result).to.be.true;
    });

    it('should be able to liquidate some collateral from vault 1', async () => {
      const expectedCollateralToPay = new BN(9181809);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate(
        firstVaultOwnerAddress,
        '101010',
        {
          from: tokenHolder,
          gas: '100000'
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
    });

    it('vault 1 should remain unsafe after Compund Oracle reices price', async () => {
      const newETHToUSDPrice = 150;
      const newPrice = Math.floor((1 / newETHToUSDPrice) * 10 ** 18).toString();
      await compoundOracle.updatePrice(newPrice, {
        from: creatorAddress,
        gas: '1000000'
      });

      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);

      expect(result).to.be.true;
    });

    it('vault 2 should be safe after Compund Oracle reices price', async () => {
      const result = await optionsContracts[0].isUnsafe(
        secondVaultOwnerAddress
      );

      expect(result).to.be.false;
    });

    it('should be able to liquidate some more collateral from vault 1', async () => {
      const expectedCollateralToPay = new BN(6060);
      const initialETH = await balance.current(tokenHolder);

      const txInfo = await optionsContracts[0].liquidate(
        firstVaultOwnerAddress,
        '100',
        {
          from: tokenHolder,
          gas: '100000'
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
    });

    it('vault 1 should remain unsafe after liquidation', async () => {
      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);

      expect(result).to.be.true;
    });

    it('firstVaultOwner should be able to burn some put tokens to turn the vault safe', async () => {
      await optionsContracts[0].burnOTokens('100000', {
        from: firstVaultOwnerAddress,
        gas: '100000'
      });

      const result = await optionsContracts[0].isUnsafe(firstVaultOwnerAddress);

      expect(result).to.be.false;
    });
  });
});
