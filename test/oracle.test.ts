// import {expect} from 'chai';
// import {CompoundOracleInterfaceInstance} from '../build/types/truffle-types';

// const Oracle = artifacts.require('Oracle.sol');

// contract('OptionsContract', accounts => {
//   const creatorAddress = accounts[0];
//   const firstRepoOwnerAddress = accounts[1];
//   const secondRepoOwnerAddress = accounts[2];

//   // Rinkeby Addresses
//   const batAddress = '0xbF7A7169562078c96f0eC1A8aFD6aE50f12e5A99';
//   const daiAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
//   const repAddress = '0x6e894660985207feb7cf89Faf048998c71E8EE89';
//   const usdcAddress = '0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b';
//   const wbtcAddress = '0x577D296678535e4903D59A4C929B718e1D575e0A';
//   const zrxAddress = '0xddea378A6dDC8AfeC82C36E9b0078826bf9e68B6';

//   const cBATAddress = '0xEBf1A11532b93a529b5bC942B4bAA98647913002';
//   const cDaiAddress = '0x6D7F0754FFeb405d23C51CE938289d4835bE3b14';
//   const cETHAddress = '0xd6801a1DfFCd0a410336Ef88DeF4320D6DF1883e';
//   const cREPAddress = '0xEBe09eB3411D18F4FF8D859e096C533CAC5c6B60';
//   const cUSDCAddress = '0x5B281A6DdA0B271e91ae35DE655Ad301C976edb1';
//   const cWBTCAddress = '0x0014F450B8Ae7708593F4A46F8fa6E5D50620F96';
//   const cZRXAddress = '0x52201ff1720134bBbBB2f6BC97Bf3715490EC19B';

//   const oracleAddress = '0x1C29BdD4cC95FADa49086515F235F39cD9Ce5A8b';
//   const isDeployed = true;

//   let oracle: CompoundOracleInterfaceInstance;

//   before('set up contracts', async () => {
//     if (!isDeployed) {
//       oracle = await Oracle.deployed();
//       console.log(oracle.address);
//     } else {
//       oracle = await Oracle.at(oracleAddress);
//     }
//   });

//   describe('test the prices', async () => {
//     xit('test all the underlying token prices', async () => {
//       console.log(
//         'BAT Price ' + (await oracle.getPrice(batAddress)).toString()
//       );
//       console.log(
//         'Dai Price ' + (await oracle.getPrice(daiAddress)).toString()
//       );
//       console.log(
//         'Rep Price ' + (await oracle.getPrice(repAddress)).toString()
//       );
//       console.log(
//         'USDC Price ' + (await oracle.getPrice(usdcAddress)).toString()
//       );
//       console.log(
//         'wBTC Price ' + (await oracle.getPrice(wbtcAddress)).toString()
//       );
//       console.log(
//         'ZRX Price ' + (await oracle.getPrice(zrxAddress)).toString()
//       );
//     });

//     xit('test all the cToken prices', async () => {
//       console.log(
//         'cBAT Price ' + (await oracle.getPrice(cBATAddress)).toString()
//       );
//       console.log(
//         'cDai Price ' + (await oracle.getPrice(cDaiAddress)).toString()
//       );
//       console.log(
//         'cRep Price ' + (await oracle.getPrice(cREPAddress)).toString()
//       );
//       console.log(
//         'cUSDC Price ' + (await oracle.getPrice(cUSDCAddress)).toString()
//       );
//       console.log(
//         'cwBTC Price ' + (await oracle.getPrice(cWBTCAddress)).toString()
//       );
//       console.log(
//         'cZRX Price ' + (await oracle.getPrice(cZRXAddress)).toString()
//       );
//       console.log(
//         'cETH Price ' + (await oracle.getPrice(cETHAddress)).toString()
//       );
//     });
//   });
// });
