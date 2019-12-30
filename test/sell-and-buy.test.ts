// import { expect } from 'chai';
// import {
//   ERC20MintableInstance,
//   oTokenInstance,
//   OptionsFactoryInstance,
//   OptionsExchangeInstance,
//   UniswapFactoryInterfaceInstance,
//   UniswapExchangeInterfaceInstance
// } from '../build/types/truffle-types';

// const OptionsFactory = artifacts.require('OptionsFactory');
// const MintableToken = artifacts.require('ERC20Mintable');
// const UniswapFactory = artifacts.require('UniswapFactoryInterface');
// const UniswapExchange = artifacts.require('UniswapExchangeInterface');
// const OptionsExchange = artifacts.require('OptionsExchange.sol');
// const oToken = artifacts.require('oToken');

// contract('OptionsContract', accounts => {
//   const creatorAddress = accounts[0];
//   const firstRepoOwnerAddress = accounts[1];
//   const secondRepoOwnerAddress = accounts[2];

//   const daiAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
//   const usdcAddress = '0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b';

//   const optionsFactoryAddress = '0x34Da8b34c82988e7FF8F98CA35963057fC0ec9bb';
//   const optionsContractAddresses = [
//     '0xE8Cd37379BF7739E5ca0D8E5a7a118cF89f439fD',
//     '0x57cC8708eFEB7f7D42E4d73ab9120BC275f1DB59',
//     '0x59D5652Ac7aE3008f59AE7b71eD66C98edA317d6'
//   ];
//   const uniswapFactoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36';
//   const optionsExchangeAddress = '0x40c471C6B31E752F39Fd0232Ad5daE42240eeD67';

//   const optionsContracts: oTokenInstance[] = [];
//   let optionsFactory: OptionsFactoryInstance;
//   let dai: ERC20MintableInstance;
//   let usdc: ERC20MintableInstance;
//   let uniswapFactory: UniswapFactoryInterfaceInstance;
//   let optionsExchange: OptionsExchangeInstance;

//   const windowSize = 1589976000;
//   const contractsDeployed = true;

//   before('set up contracts', async () => {
//     if (!contractsDeployed) {
//       // 1.2 Mock Dai contract
//       dai = await MintableToken.at(
//         '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
//       );
//       // 1.3 USDC contract
//       usdc = await MintableToken.at(
//         '0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b'
//       );

//       // 2. Deploy our contracts
//       // Deploy the Options Exchange
//       optionsExchange = await OptionsExchange.deployed();

//       // Deploy the Options Factory contract and add assets to it
//       optionsFactory = await OptionsFactory.deployed();

//       await optionsFactory.addAsset('DAI', dai.address);
//       await optionsFactory.addAsset('USDC', usdc.address);
//       await optionsFactory.addAsset(
//         'cDAI',
//         '0x6d7f0754ffeb405d23c51ce938289d4835be3b14'
//       );
//       await optionsFactory.addAsset(
//         'cUSDC',
//         '0x5b281a6dda0b271e91ae35de655ad301c976edb1'
//       );

//       // Create the unexpired options contract
//       let optionsContractResult = await optionsFactory.createOptionsContract(
//         'ETH',
//         -'18',
//         'DAI',
//         -'18',
//         -'14',
//         '9',
//         -'15',
//         'USDC',
//         '1589976000',
//         windowSize,
//         { from: creatorAddress, gas: '4000000' }
//       );

//       let optionsContractAddr = optionsContractResult.logs[1].args[0];
//       optionsContracts.push(await oToken.at(optionsContractAddr));

//       // Create the unexpired options contract
//       optionsContractResult = await optionsFactory.createOptionsContract(
//         'ETH',
//         -'18',
//         'cDAI',
//         -'8',
//         -'8',
//         '2',
//         -'10',
//         'USDC',
//         '1589976000',
//         windowSize,
//         { from: creatorAddress, gas: '4000000' }
//       );

//       optionsContractAddr = optionsContractResult.logs[1].args[0];
//       optionsContracts.push(await oToken.at(optionsContractAddr));

//       // Create the unexpired options contract
//       optionsContractResult = await optionsFactory.createOptionsContract(
//         'ETH',
//         -'18',
//         'cUSDC',
//         -'8',
//         -'8',
//         '208',
//         -'12',
//         'USDC',
//         '1589976000',
//         windowSize,
//         { from: creatorAddress, gas: '4000000' }
//       );

//       optionsContractAddr = optionsContractResult.logs[1].args[0];
//       optionsContracts.push(await oToken.at(optionsContractAddr));

//       console.log('Options Exchange ' + OptionsExchange.address);
//       console.log('Options Factory ' + optionsFactory.address);
//       console.log('oDai' + optionsContracts[0].address);
//       console.log('ocDai ' + optionsContracts[1].address);
//       console.log('ocUSDC' + optionsContracts[2].address);
//     } else {
//       optionsFactory = await OptionsFactory.at(optionsFactoryAddress);
//       optionsContracts.push(await oToken.at(optionsContractAddresses[0]));
//       optionsContracts.push(await oToken.at(optionsContractAddresses[1]));
//       optionsContracts.push(await oToken.at(optionsContractAddresses[2]));
//       optionsExchange = await OptionsExchange.at(optionsExchangeAddress);
//     }

//     // instantiate Uniswap Factory
//     uniswapFactory = await UniswapFactory.at(uniswapFactoryAddress);
//   });

//   describe('add liquidity on uniswap', () => {
//     it('create the uniswap exchange', async () => {
//       if (!contractsDeployed) {
//         let i;
//         for (i = 0; i < optionsContracts.length; i++) {
//           await uniswapFactory.createExchange(optionsContracts[i].address);
//         }
//       }
//     });

//     it('should be able to create oTokens', async () => {
//       if (!contractsDeployed) {
//         const numOptions = '1000000000000';
//         const collateral = '2000000000000000000';
//         for (let i = 1; i < optionsContracts.length; i++) {
//           const result = await optionsContracts[i].createETHCollateralOption(
//             numOptions,
//             creatorAddress,
//             {
//               from: creatorAddress,
//               value: collateral
//             }
//           );

//           // Minting oTokens should emit an event correctly
//           expect(result.logs[3].event).to.equal('IssuedOTokens');
//           expect(result.logs[3].args.issuedTo).to.equal(creatorAddress);
//         }
//       }
//     });

//     it('should be able to add liquidity to Uniswap', async () => {
//       if (!contractsDeployed) {
//         for (let i = 1; i < optionsContracts.length; i++) {
//           const uniswapExchangeAddr = await uniswapFactory.getExchange(
//             optionsContracts[i].address
//           );

//           const uniswapExchange = await UniswapExchange.at(uniswapExchangeAddr);
//           await optionsContracts[i].approve(
//             uniswapExchangeAddr,
//             '100000000000000000000000000000'
//           );

//           // assuming 1 * 10^-15 USD per oDai, 1000 * oDai * USD-ETH
//           // the minimum value of ETH is 1000000000
//           await uniswapExchange.addLiquidity(
//             '1',
//             '1000000000000',
//             '1000000000000000000000000',
//             {
//               from: creatorAddress,
//               value: '2000000000000000000'
//             }
//           );
//         }
//       }
//     });
//   });

//   describe('Should be able to buy and sell oTokens', async () => {
//     xit('should be able to create and sell oTokens for ETH', async () => {
//       const numOptions = '13888';
//       const collateral = '2000000';
//       await optionsContracts[0].createAndSellETHCollateralOption(
//         numOptions,
//         creatorAddress,
//         {
//           from: creatorAddress,
//           value: collateral
//         }
//       );
//     });

//     xit('should be able to create and sell oTokens for ERC20s', async () => {
//       const numOptions = '13888';
//       const collateral = '2000000';
//       await optionsContracts[0].createETHCollateralOption(
//         numOptions,
//         creatorAddress,
//         {
//           from: creatorAddress,
//           value: collateral
//         }
//       );

//       await optionsContracts[0].approve(
//         optionsExchange.address,
//         '1000000000000000000000'
//       );

//       const payoutTokenAddress = '0x2448eE2641d78CC42D7AD76498917359D961A783';
//       await optionsExchange.sellOTokens(
//         creatorAddress,
//         optionsContracts[0].address,
//         payoutTokenAddress,
//         '13888'
//       );
//     });

//     xit('should be able to buy oTokens with ETH', async () => {
//       await optionsExchange.buyOTokens(
//         creatorAddress,
//         optionsContracts[0].address,
//         '0x0000000000000000000000000000000000000000',
//         '1000',
//         {
//           value: '1000000'
//         }
//       );
//     });

//     xit('should be able to buy oTokens with ERC20s', async () => {
//       const paymentTokenAddr = '0x2448eE2641d78CC42D7AD76498917359D961A783';
//       const paymentToken = await MintableToken.at(paymentTokenAddr);
//       // set to optionsCotnracs[0].address
//       const oTokenAddress = optionsContractAddresses[0];
//       await paymentToken.approve(
//         OptionsExchange.address,
//         '10000000000000000000000000'
//       );
//       await optionsExchange.buyOTokens(
//         creatorAddress,
//         oTokenAddress,
//         paymentTokenAddr,
//         '100'
//       );
//     });
//   });
// });
