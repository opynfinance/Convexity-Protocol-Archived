// import { expect } from 'chai';
// import {
//   ERC20MintableInstance,
//   OptionsContractInstance,
//   OptionsFactoryInstance,
//   OptionsExchangeInstance,
//   UniswapFactoryInterfaceInstance,
//   UniswapExchangeInterfaceInstance
// } from '../build/types/truffle-types';

// const OptionsContract = artifacts.require('OptionsContract');
// const OptionsFactory = artifacts.require('OptionsFactory');
// const MintableToken = artifacts.require('ERC20Mintable');
// const UniswapFactory = artifacts.require('UniswapFactoryInterface');
// const UniswapExchange = artifacts.require('UniswapExchangeInterface');
// const OptionsExchange = artifacts.require('OptionsExchange.sol');

// const {
//   BN,
//   constants,
//   balance,
//   time,
//   expectEvent,
//   expectRevert
// } = require('@openzeppelin/test-helpers');

// contract('OptionsContract', accounts => {
//   const creatorAddress = accounts[0];
//   const firstRepoOwnerAddress = accounts[1];
//   const secondRepoOwnerAddress = accounts[2];

//   const optionsFactoryAddress = "0x2CeaF7Fa83eB6Cc5F28041234a2f46889A7CaA52";
//   const optionsContractAddress = "0x23606bbb96EE18f0c80af33aA2CD1188Db33de4D";
//   const uniswapFactoryAddress = "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36";

//   const optionsContracts: OptionsContractInstance[] = [];
//   let optionsFactory: OptionsFactoryInstance;
//   let dai: ERC20MintableInstance;
//   let usdc: ERC20MintableInstance;
//   let uniswapFactory: UniswapFactoryInterfaceInstance;
//   let optionsExchange: OptionsExchangeInstance;

//   const windowSize = 1577836800;

//   before('set up contracts', async () => {
//     // // 1.2 Mock Dai contract
//     // dai = await MintableToken.new();
//     // await dai.mint(creatorAddress, '10000000');
//     // // 1.3 Mock Dai contract
//     // usdc = await MintableToken.new();
//     // await usdc.mint(creatorAddress, '10000000');

//     // 2. Deploy our contracts
//     // // Deploy the Options Factory contract and add assets to it
//     // optionsFactory = await OptionsFactory.deployed();
//     optionsFactory = await OptionsFactory.at(optionsFactoryAddress);

//     // await optionsFactory.addAsset('DAI', dai.address);
//     // // TODO: deploy a mock USDC and get its address
//     // await optionsFactory.addAsset('USDC', usdc.address);

//     optionsExchange = await OptionsExchange.deployed();
//     // Create the unexpired options contract
//     // const optionsContractResult = await optionsFactory.createOptionsContract(
//     //   'ETH',
//     //   -'18',
//     //   'DAI',
//     //   -'14',
//     //   '9',
//     //   -'15',
//     //   'USDC',
//     //   '1577836800',
//     //   windowSize,
//     //   { from: creatorAddress, gas: '4000000' }
//     // );

//     // const optionsContractAddr = optionsContractResult.logs[1].args[0];
//     optionsContracts.push(await OptionsContract.at(optionsFactoryAddress));

//     // instantiate Uniswap Factory
//     uniswapFactory = await UniswapFactory.at(uniswapFactoryAddress);

//   });

//   describe("add liquidity on uniswap", () => {
//       xit("create the uniswap exchange", async() => {
//           await uniswapFactory.createExchange(optionsContracts[0].address);
//       })

//       xit("should be able to create oTokens", async ()=> {
//         const numOptions = '1388888888';
//         const collateral = '200000000000';
//         const result = await optionsContracts[0].createETHCollateralOptionNewRepo(
//             numOptions,
//             creatorAddress,
//             {
//             from: creatorAddress,
//             value: collateral
//             }
//         );

//       // Minting oTokens should emit an event correctly
//       expect(result.logs[3].event).to.equal('IssuedOTokens');
//       expect(result.logs[3].args.issuedTo).to.equal(creatorAddress);
//       })

//       xit("should be able to add liquidity to Uniswap", async () => {
//           var uniswapExchangeAddr =  await uniswapFactory.getExchange(optionsContracts[0].address);
//         //   console.log("Exchange Addr " +  uniswapExchangeAddr);
//         //   console.log("Options Factory " + optionsFactory.address);
//         //   console.log("Options contract " + optionsContracts[0].address);
//           let uniswapExchange : UniswapExchangeInterfaceInstance;
//           uniswapExchange = await UniswapExchange.at(uniswapExchangeAddr);
//           await optionsContracts[0].approve(uniswapExchangeAddr, '10000000000000000');
//           // assuming 1 * 10^-15 USD per oDai, 1000 * oDai * USD-ETH
//           // the minimum value of ETH is 1000000000
//           await uniswapExchange.addLiquidity('1', '1000000000', '1000000000000000000000000',
//           {
//               from: creatorAddress,
//               value: '5000000000'
//           });
//       })

//       it("should be able to create and sell oTokens", async() => {
//         // await optionsContracts[0].approve((optionsExchange.address).toString(), '10000000000000000');
//         console.log(optionsExchange.address);
//         // optionsExchange.sellOTokens(optionsContracts[0].address, "0x0000000000000000000000000000000000000000", 10);
//       })
//   })
// });
