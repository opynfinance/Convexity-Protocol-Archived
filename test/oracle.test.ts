import {expect} from 'chai';
import {OracleInstance} from '../build/types/truffle-types';

const Oracle = artifacts.require('Oracle.sol');

contract('OptionsContract', accounts => {
  const creatorAddress = accounts[0];
  const firstRepoOwnerAddress = accounts[1];
  const secondRepoOwnerAddress = accounts[2];

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

  // // Kovan Addresses
  // const cBATAddress = '0xd5ff020f970462816fDD31a603Cb7D120E48376E';
  // const cDaiAddress = '0xe7bc397DBd069fC7d0109C0636d06888bb50668c';
  // const cETHAddress = '0xf92FbE0D3C0dcDAE407923b2Ac17eC223b1084E4';
  // const cREPAddress = '0xFd874BE7e6733bDc6Dca9c7CDd97c225ec235D39';
  // const cUSDCAddress = '0xcfC9bB230F00bFFDB560fCe2428b4E05F3442E35';
  // const cWBTCAddress = '0x3659728876EfB2780f498Ce829C5b076e496E0e3';
  // const cZRXAddress = '0xC014DC10A57aC78350C5fddB26Bb66f1Cb0960a0';

  // const batAddress = '0x9dDB308C14f700d397bB26F584Ac2E303cdc7365';
  // const daiAddress = '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa';
  // const repAddress = '0x4E5cB5A0CAca30d1ad27D8CD8200a907854FB518';
  // const usdcAddress = '0x75B0622Cec14130172EaE9Cf166B92E5C112FaFF';
  // const wbtcAddress = '0xA0A5aD2296b38Bd3e3Eb59AAEAF1589E8d9a29A9';
  // const zrxAddress = '0x29eb28bAF3B296b9F14e5e858C52269b57b4dF6E';

  // Mainnet Addresses
  const cBATAddress = '0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E';
  const cDaiAddress = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
  const cETHAddress = '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5';
  const cREPAddress = '0x158079Ee67Fce2f58472A96584A73C7Ab9AC95c1';
  const cUSDCAddress = '0x39AA39c021dfbaE8faC545936693aC917d5E7563';
  const cWBTCAddress = '0xC11b1268C1A384e55C48c2391d8d480264A3A7F4';
  const cZRXAddress = '0xB3319f5D18Bc0D84dD1b4825Dcde5d5f7266d407';

  const batAddress = '0x0D8775F648430679A709E98d2b0Cb6250d2887EF';
  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const repAddress = '0x1985365e9f78359a9B6AD760e32412f4a445E862';
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const wbtcAddress = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
  const zrxAddress = '0xE41d2489571d322189246DaFA5ebDe1F4699F498';

  const oracleAddress = '0x0B844c32E21b47C9C03351D604d362B5201955E7';
  const isDeployed = true;

  let oracle: OracleInstance;

  before('set up contracts', async () => {
    if (!isDeployed) {
      oracle = await Oracle.deployed();
      console.log(oracle.address);
    } else {
      oracle = await Oracle.at(oracleAddress);
    }
  });

  describe('test the prices', async () => {
    it('test all the underlying token prices', async () => {
      console.log(
        'BAT Price ' + (await oracle.getPrice(batAddress)).toString()
      );
      console.log(
        'Dai Price ' + (await oracle.getPrice(daiAddress)).toString()
      );
      console.log(
        'Rep Price ' + (await oracle.getPrice(repAddress)).toString()
      );
      console.log(
        'USDC Price ' + (await oracle.getPrice(usdcAddress)).toString()
      );
      console.log(
        'wBTC Price ' + (await oracle.getPrice(wbtcAddress)).toString()
      );
      console.log(
        'ZRX Price ' + (await oracle.getPrice(zrxAddress)).toString()
      );
    });

    it('test all the cToken prices', async () => {
      console.log(
        'cBAT Price ' + (await oracle.getPrice(cBATAddress)).toString()
      );
      console.log(
        'cDai Price ' + (await oracle.getPrice(cDaiAddress)).toString()
      );
      console.log(
        'cRep Price ' + (await oracle.getPrice(cREPAddress)).toString()
      );
      console.log(
        'cUSDC Price ' + (await oracle.getPrice(cUSDCAddress)).toString()
      );
      console.log(
        'cwBTC Price ' + (await oracle.getPrice(cWBTCAddress)).toString()
      );
      console.log(
        'cZRX Price ' + (await oracle.getPrice(cZRXAddress)).toString()
      );
      console.log(
        'cETH Price ' + (await oracle.getPrice(cETHAddress)).toString()
      );
    });
  });
});
