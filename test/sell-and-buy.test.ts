// import {expect} from 'chai';
// import {
//   ERC20MintableInstance,
//   oTokenInstance,
//   OptionsFactoryInstance,
//   OptionsExchangeInstance,
//   UniswapFactoryInterfaceInstance,
//   UniswapExchangeInterfaceInstance,
//   CompoundOracleInterfaceInstance,
//   MockCompoundOracleInstance,
//   OracleInstance
// } from '../build/types/truffle-types';
// import {Address} from 'cluster';

// const OptionsFactory = artifacts.require('OptionsFactory');
// const MintableToken = artifacts.require('ERC20Mintable');
// const UniswapFactory = artifacts.require('UniswapFactoryInterface');
// const UniswapExchange = artifacts.require('UniswapExchangeInterface');
// const OptionsExchange = artifacts.require('OptionsExchange.sol');
// const oToken = artifacts.require('oToken');
// const Oracle = artifacts.require('Oracle.sol');
// // const Oracle = artifacts.require('MockCompoundOracle');

// // Egs. collateral = 200 * 10^-18, strikePrice = 9 * 10^-15.
// // returns number of oTokens
// function calculateMaxOptionsToCreate(
//   collateral: number,
//   strikePrice: number,
//   collateralToStrikePrice: number
// ): number {
//   return Math.floor((collateral * collateralToStrikePrice) / (2 * strikePrice));
// }

// // Egs. oTokensSold = 200 * 10^15, strikePrice = 9 * 10^-15, apr = 2, strikeToCol = 0.01
// // returns collateral to deposit (in wei).
// function calculateETHInUniswapPool(
//   oTokensSold: number,
//   strikePrice: number,
//   apr: number,
//   strikeToCollateralPrice: number
// ): number {
//   return Math.floor(
//     (apr / 100) * strikePrice * strikeToCollateralPrice * oTokensSold * 10 ** 18
//   );
// }

// contract('OptionsContract', accounts => {
//   const creatorAddress = accounts[0];
//   const firstRepoOwnerAddress = accounts[1];
//   const secondRepoOwnerAddress = accounts[2];

//   let daiAddress: string;
//   let usdcAddress: string;
//   let cUSDCAddress: string;
//   let cDaiAddress: string;
//   let uniswapFactoryAddress: string;

//   let optionsExchangeAddress: string;
//   let optionsFactoryAddress: string;
//   let optionsContractAddresses: string[];
//   let oracleAddress: string;

//   const optionsContracts: oTokenInstance[] = [];
//   let optionsFactory: OptionsFactoryInstance;
//   let dai: ERC20MintableInstance;
//   let usdc: ERC20MintableInstance;
//   let uniswapFactory: UniswapFactoryInterfaceInstance;
//   let optionsExchange: OptionsExchangeInstance;
//   let oracle: OracleInstance;

//   const windowSize = 1612915200;
//   const contractsDeployed = true;

//   before('set up contracts', async () => {
//     if ((await web3.eth.net.getId()) == 4) {
//       // Rinkeby Dai Address
//       daiAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
//       usdcAddress = '0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b';
//       cUSDCAddress = '0x5b281a6dda0b271e91ae35de655ad301c976edb1';
//       cDaiAddress = '0x6d7f0754ffeb405d23c51ce938289d4835be3b14';
//       uniswapFactoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36';

//       // Rinkeby Addreesses
//       optionsExchangeAddress = '0x8D4A9aE90ECeFde56f5C2509a261DaDcdDa33CaD';
//       optionsFactoryAddress = '0x90Eab7D251A582Ab85495b0653DDF53a145d1A76';
//       optionsContractAddresses = [
//         '0xB76078e14C490d91eCFfE0F36beCf07F8e1e0ec4',
//         '0x8704Ba8F15D334762f874dD673cFB2d6F2Ec41dc'
//       ];
//       oracleAddress = '0x2E309F1047ceE6DC0ce14EB0a826d282f30C703A';
//     } else if ((await web3.eth.net.getId()) == 42) {
//       // Kovan Addresses
//       daiAddress = '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa';
//       usdcAddress = '0x75B0622Cec14130172EaE9Cf166B92E5C112FaFF';
//       cUSDCAddress = '0xcfC9bB230F00bFFDB560fCe2428b4E05F3442E35';
//       cDaiAddress = '0xe7bc397DBd069fC7d0109C0636d06888bb50668c';
//       uniswapFactoryAddress = '0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30';
//     } else if ((await web3.eth.net.getId()) == 3) {
//       // Ropsten Addresses
//       daiAddress = '0xB5E5D0F8C0cbA267CD3D7035d6AdC8eBA7Df7Cdd';
//       usdcAddress = '0x8a9447df1FB47209D36204e6D56767a33bf20f9f';
//       cUSDCAddress = '0x43a1363afb28235720fcbdf0c2dab7759091f7e0';
//       cDaiAddress = '0x2b536482a01e620ee111747f8334b395a42a555e';
//       uniswapFactoryAddress = '0x0865A608E75FbD2ba087d08A5C7cAabcd977C1aD';
//     } else if ((await web3.eth.net.getId()) == 1) {
//       // Mainnet Addresses
//       daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
//       usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
//       cUSDCAddress = '0x39AA39c021dfbaE8faC545936693aC917d5E7563';
//       cDaiAddress = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
//       uniswapFactoryAddress = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95';

//       optionsExchangeAddress = '0x5778f2824a114F6115dc74d432685d3336216017';
//       optionsFactoryAddress = '0xb529964F86fbf99a6aA67f72a27e59fA3fa4FEaC';
//       optionsContractAddresses = [
//         '0xddaC4AED7c8F73032b388EFe2c778FC194BC81ed',
//         '0x8ED9f862363fFdFD3a07546e618214b6D59F03d4'
//       ];
//       oracleAddress = '0x7054e08461e3eCb7718B63540adDB3c3A1746415';
//     }
//     if (!contractsDeployed) {
//       oracle = await Oracle.deployed();
//       // 1.2 Mock Dai contract
//       dai = await MintableToken.at(daiAddress);
//       // 1.3 USDC contract
//       usdc = await MintableToken.at(usdcAddress);

//       // 2. Deploy our contracts
//       // Deploy the Options Exchange
//       optionsExchange = await OptionsExchange.deployed();

//       // Deploy the Options Factory contract and add assets to it
//       optionsFactory = await OptionsFactory.deployed();

//       // await optionsFactory.addAsset('DAI', dai.address);
//       await optionsFactory.addAsset('USDC', usdc.address);
//       await optionsFactory.addAsset('cDAI', cDaiAddress);
//       await optionsFactory.addAsset('cUSDC', cUSDCAddress);

//       // Create the unexpired options contract
//       let optionsContractResult = await optionsFactory.createOptionsContract(
//         'ETH',
//         -'18',
//         'cDAI',
//         -'8',
//         -'8',
//         '2',
//         -'10',
//         'USDC',
//         '1612915200',
//         windowSize,
//         {from: creatorAddress, gas: '4000000'}
//       );

//       let optionsContractAddr = optionsContractResult.logs[1].args[0];
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
//         '1612915200',
//         windowSize,
//         {from: creatorAddress, gas: '4000000'}
//       );

//       optionsContractAddr = optionsContractResult.logs[1].args[0];
//       optionsContracts.push(await oToken.at(optionsContractAddr));

//       console.log('Options Exchange ' + OptionsExchange.address);
//       console.log('Options Factory ' + optionsFactory.address);
//       console.log('ocDai ' + optionsContracts[0].address);
//       console.log('ocUSDC ' + optionsContracts[1].address);
//       //   console.log('oDai ' + optionsContracts[2].address);
//       console.log('Oracle ' + oracle.address);
//     } else {
//       optionsFactory = await OptionsFactory.at(optionsFactoryAddress);
//       optionsContracts.push(await oToken.at(optionsContractAddresses[0]));
//       optionsContracts.push(await oToken.at(optionsContractAddresses[1]));
//       // optionsContracts.push(await oToken.at(optionsContractAddresses[2]));
//       optionsExchange = await OptionsExchange.at(optionsExchangeAddress);
//       oracle = await Oracle.at(oracleAddress);
//     }

//     // instantiate Uniswap Factory
//     uniswapFactory = await UniswapFactory.at(uniswapFactoryAddress);
//   });

//   describe('set symbol + names', () => {
//     xit('set the symbol, name and test it is non-null', async () => {
//       // if(!contractsDeployed) {
//       let i;
//       const details = [
//         {name: 'Opyn cDai Insurance', symbol: 'ocDai'},
//         {name: 'Opyn cUSDC Insurance', symbol: 'ocUSDC'}
//       ];
//       for (i = 0; i < optionsContracts.length; i++) {
//         optionsContracts[i].setDetails(details[i].name, details[i].symbol);
//       }
//       // }
//     });
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
//         const collateral = '2000000000000000';
//         const strikePrices = [2 * 10 ** -10, 208 * 10 ** -12, 9 * 10 ** -15];
//         const ETHToUSDCPrice =
//           10 ** 18 / Number(await oracle.getPrice(usdcAddress));
//         for (let i = 0; i < optionsContracts.length; i++) {
//           const numOptions = (
//             calculateMaxOptionsToCreate(
//               Number(collateral) * 10 ** -18,
//               strikePrices[i],
//               ETHToUSDCPrice
//             ) - 10000
//           ).toString();
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
//         const strikePrices = [2 * 10 ** -10, 208 * 10 ** -12, 9 * 10 ** -15];
//         const apr = [2, 1];
//         const USDCToETHPrice =
//           Number(await oracle.getPrice(usdcAddress)) / 10 ** 18;

//         for (let i = 0; i < optionsContracts.length; i++) {
//           const uniswapExchangeAddr = await uniswapFactory.getExchange(
//             optionsContracts[i].address
//           );

//           const uniswapExchange = await UniswapExchange.at(uniswapExchangeAddr);
//           await optionsContracts[i].approve(
//             uniswapExchangeAddr,
//             '100000000000000000000000000000'
//           );

//           const oTokens = (
//             await optionsContracts[i].balanceOf(creatorAddress)
//           ).toString();
//           const collateral = calculateETHInUniswapPool(
//             Number(oTokens),
//             strikePrices[i],
//             apr[i],
//             USDCToETHPrice
//           ).toString();
//           // assuming 1 * 10^-15 USD per oDai, 1000 * oDai * USD-ETH
//           // the minimum value of ETH is 1000000000
//           await uniswapExchange.addLiquidity(
//             '1',
//             oTokens,
//             '1000000000000000000000000',
//             {
//               from: creatorAddress,
//               value: collateral
//             }
//           );
//         }
//       }
//     });

//     xit('should be able to create more liquidity', async () => {
//       const collateral = '200000000000000';
//       const strikePrices = [2 * 10 ** -10, 208 * 10 ** -12, 9 * 10 ** -15];
//       const ETHToUSDCPrice =
//         10 ** 18 / Number(await oracle.getPrice(usdcAddress));
//       for (let i = 0; i < optionsContracts.length; i++) {
//         const numOptions = (
//           calculateMaxOptionsToCreate(
//             Number(collateral) * 10 ** -18,
//             strikePrices[i],
//             ETHToUSDCPrice
//           ) - 10000
//         ).toString();
//         await optionsContracts[i].addETHCollateralOption(
//           numOptions,
//           creatorAddress,
//           {
//             from: creatorAddress,
//             value: collateral
//           }
//         );
//       }
//     });

//     it('should be able to calculate premiums', async () => {
//       // 1 Dai ~= 1 USDC, 1 cToken ~= $0.02.
//       // const priceInUSD = [10 ** -14, 0.02 * 10 ** -8, 0.0208 * 10 ** -8];
//       const priceInUSD = [0.02 * 10 ** -8, 0.0208 * 10 ** -8];
//       const ETHToUSDCPrice =
//         10 ** 18 / Number(await oracle.getPrice(usdcAddress));

//       for (let i = 0; i < optionsContracts.length; i++) {
//         const premiumToPay = await optionsExchange.premiumToPay(
//           optionsContracts[i].address,
//           '0x0000000000000000000000000000000000000000',
//           '1'
//         );
//         const insuredAPR =
//           ((Number(premiumToPay) * 10 ** -18) / priceInUSD[i]) *
//           100 *
//           ETHToUSDCPrice;
//         console.log(insuredAPR.toString());
//       }
//     });
//   });

//   describe('Should be able to buy and sell oTokens', async () => {
//     xit('should be able to buy oTokens with ETH', async () => {
//       const premiumToPay = (
//         await optionsExchange.premiumToPay(
//           optionsContracts[0].address,
//           '0x0000000000000000000000000000000000000000',
//           '1'
//         )
//       ).toString();

//       await optionsExchange.buyOTokens(
//         creatorAddress,
//         optionsContracts[0].address,
//         '0x0000000000000000000000000000000000000000',
//         '1',
//         {
//           value: premiumToPay
//         }
//       );
//     });
//     xit('vault should be unsafe when price drops', async () => {
//       // const newETHToUSDPrice = 100;
//       // const newPrice = Math.floor((1 / newETHToUSDPrice) * 10 ** 18).toString();
//       // await oracle.updatePrice(newPrice, {
//       //   from: creatorAddress,
//       //   gas: '1000000'
//       // });
//       // const result = await optionsContracts[0].isUnsafe(creatorAddress);
//       // expect(result).to.be.true;
//     });
//     xit('should be able to sell oTokens for ERC20', async () => {
//       await optionsContracts[0].approve(
//         optionsExchange.address,
//         '1000000000000000000000'
//       );

//       const optionsToSell = (
//         await optionsContracts[0].balanceOf(creatorAddress)
//       ).toString();

//       const payoutTokenAddress = '0x2448eE2641d78CC42D7AD76498917359D961A783';
//       await optionsExchange.sellOTokens(
//         creatorAddress,
//         optionsContracts[0].address,
//         payoutTokenAddress,
//         optionsToSell
//       );
//     });
//     xit('should be able to create and sell oTokens for ETH', async () => {
//       const numOptions = '10000';
//       const collateral = '2000000';
//       console.log(firstRepoOwnerAddress);
//       await optionsContracts[0].createAndSellETHCollateralOption(
//         numOptions,
//         firstRepoOwnerAddress,
//         {
//           from: firstRepoOwnerAddress,
//           value: collateral
//         }
//       );
//     });

//     xit('should be able to create and sell oTokens for ERC20s', async () => {
//       const numOptions = '10000';
//       const collateral = '2000000';
//       await optionsContracts[0].createETHCollateralOption(
//         numOptions,
//         firstRepoOwnerAddress,
//         {
//           from: firstRepoOwnerAddress,
//           value: collateral
//         }
//       );

//       await optionsContracts[0].approve(
//         optionsExchange.address,
//         '1000000000000000000000'
//       );

//       const payoutTokenAddress = '0x2448eE2641d78CC42D7AD76498917359D961A783';
//       await optionsExchange.sellOTokens(
//         firstRepoOwnerAddress,
//         optionsContracts[0].address,
//         payoutTokenAddress,
//         '13888'
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

//   describe('transfer ownership', async () => {
//     xit('should be able to transfer ownership to a new address', async () => {
//       const originalOwner = (await optionsContracts[0].owner()).toString();
//       const newAddress = '0xcD65af218058C3Ec5e41645202513a8d9aAa25e2';
//       await optionsContracts[0].transferOwnership(newAddress);
//       const newOwner = (await optionsContracts[0].owner()).toString();
//       expect(newOwner).to.equal(newAddress);
//       expect(newOwner).to.not.equal(originalOwner);
//     });
//   });
// });
