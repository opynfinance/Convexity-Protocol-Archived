var expect = require('expect');
var OptionsContract = artifacts.require("../contracts/OptionsContract.sol");
var OptionsFactory = artifacts.require("../contracts/OptionsFactory.sol");
var OptionsExchange = artifacts.require("../contracts/OptionsExchange.sol");
var CompoundOracle = artifacts.require("../contracts/lib/MockCompoundOracle.sol");
var UniswapFactory = artifacts.require("../contracts/lib/MockUniswapFactory.sol");
var daiMock = artifacts.require("../contracts/lib/simpleERC20.sol");
var { ContractCreated }= require('./utils/FactoryEvents.js')

const truffleAssert = require('truffle-assertions');

// Initialize the Options Factory, Options Exchange and other mock contracts
contract('OptionsContract', (accounts) => {
  var creatorAddress = accounts[0];
  var firstOwnerAddress = accounts[1];
  var secondOwnerAddress = accounts[2];
  /* create named accounts for contract roles */

  let optionsContracts;
  let optionsFactory;
  let optionsExchange;
  let dai;
  let compoundOracle;

  before(async () => {
    try {
      // 1. Deploy mock contracts
      // 1.1 Compound Oracle
      compoundOracle = await CompoundOracle.deployed();
      // 1.2 Uniswap Factory
      var uniswapFactory = await UniswapFactory.deployed();
      // 1.3 Mock Dai contract
      dai = await daiMock.deployed();

      // 2. Deploy our contracts
      // deploys the Options Exhange contract
      optionsExchange = await OptionsExchange.deployed();

      // TODO: remove this later. For now, set the compound Oracle and uniswap Factory addresses here.
      await optionsExchange.setUniswapAndCompound(uniswapFactory.address, compoundOracle.address);

      // Deploy the Options Factory contract and add assets to it
      optionsFactory = await OptionsFactory.deployed();
      await optionsFactory.setOptionsExchange(optionsExchange.address);

      await optionsFactory.addAsset(
        "DAI",
        dai.address
      );
      // TODO: deploy a mock USDC and get its address
      await optionsFactory.addAsset(
      "USDC",
      "0xB5D0545dF2649359B1F91679f64812dc70Bfd547"
      );

      // Create the unexpired options contract
      var optionsContractResult = await optionsFactory.createOptionsContract(
        "ETH",
        -"18",
        "DAI",
        -"14",
        "9",
        -"15",
        "USDC",
        "1577836800",
        "1577836800"
      );

      var optionsContractAddr = optionsContractResult.logs[0].args[0];
      optionsContracts = [await OptionsContract.at(optionsContractAddr)]

    } catch (err) {
      console.error(err);
    }

  });

  describe("#openRepo()", () => {
    it("should open first repo correctly", async () => {
      var result = await optionsContracts[0].openRepo({from: creatorAddress, gas: '100000'});
      var repoIndex = "0";

      // test getReposByOwner
      var repos = await optionsContracts[0].getReposByOwner(creatorAddress);
      const expectedRepos =[ '0' ]
      expect(repos).toMatchObject(expectedRepos);

      // test getRepoByIndex
      var repo = await optionsContracts[0].getRepoByIndex(repoIndex);
      const expectedRepo = {
        '0': '0',
        '1': '0',
        '2': creatorAddress }
      expect(repo).toMatchObject(expectedRepo);

    })

    it("should open second repo correctly", async () => {

      var result = await optionsContracts[0].openRepo({from: creatorAddress, gas: '100000'})
      var repoIndex = "1";

       // test getReposByOwner
       var repos = await optionsContracts[0].getReposByOwner(creatorAddress);
       const expectedRepos =[ '0', '1' ]
       expect(repos).toMatchObject(expectedRepos);

       // test getRepoByIndex
       var repo = await optionsContracts[0].getRepoByIndex(repoIndex);
       const expectedRepo = {
         '0': '0',
         '1': '0',
         '2': creatorAddress }
       expect(repo).toMatchObject(expectedRepo);
    })

    it("new person should be able to open third repo correctly", async () => {

      var result = await optionsContracts[0].openRepo({from: firstOwnerAddress, gas: '100000'})
      var repoIndex = "2";

       // test getReposByOwner
       var repos = await optionsContracts[0].getReposByOwner(firstOwnerAddress);
       const expectedRepos =[ '2' ]
       expect(repos).toMatchObject(expectedRepos);

       // test getRepoByIndex
       var repo = await optionsContracts[0].getRepoByIndex(repoIndex);
       const expectedRepo = {
         '0': '0',
         '1': '0',
         '2': firstOwnerAddress }
       expect(repo).toMatchObject(expectedRepo);
    })
  });

  describe("#addETHCollateral()", () => {


    it("should add ETH collateral successfully", async () => {
      const repoNum = 1;
      var msgValue = "10000000";
      var result = await optionsContracts[0].addETHCollateral(repoNum,{from: creatorAddress, gas: '100000', value: msgValue})

      // test that the repo's balances have been updated.
      var repo = await optionsContracts[0].getRepoByIndex(repoNum);
      const expectedRepo = {
        '0': '10000000',
        '1': '0',
        '2': creatorAddress }
      expect(repo).toMatchObject(expectedRepo);

    })

    it("anyone should be able to add ETH collateral to any repo", async()=> {
      const repoNum = 1;
      var msgValue = "10000000";
      var result = await optionsContracts[0].addETHCollateral(repoNum,{from: firstOwnerAddress, gas: '100000', value: msgValue})

      // test that the repo's balances have been updated.
      var repo = await optionsContracts[0].getRepoByIndex(repoNum);
      const expectedRepo = {
        '0': '20000000',
        '1': '0',
        '2': creatorAddress }
      expect(repo).toMatchObject(expectedRepo);
    })

    it("should add ETH collateral successfully", async () => {
        const repoNum = 2;
        var msgValue = "10000000";
        var result = await optionsContracts[0].addETHCollateral(repoNum,{from: secondOwnerAddress, gas: '100000', value: msgValue})

        // test that the repo's balances have been updated.
        var repo = await optionsContracts[0].getRepoByIndex(repoNum);
        const expectedRepo = {
          '0': '10000000',
          '1': '0',
          '2': firstOwnerAddress }
        expect(repo).toMatchObject(expectedRepo);

      })

  });

  describe("#issueOptionTokens()", () => {
    it("should allow you to mint correctly", async () => {

      const repoIndex = "1";
      const numTokens = "25000";

      var result = await optionsContracts[0].issueOptionTokens(repoIndex, numTokens,{from: creatorAddress, gas: '100000'});
      var amtPTokens = await optionsContracts[0].balanceOf(creatorAddress);
      expect(amtPTokens).toBe(numTokens);
    })

    it("should allow you to mint correctly", async () => {

        const repoIndex = "2";
        const numTokens = "10000";

        var result = await optionsContracts[0].issueOptionTokens(repoIndex, numTokens,{from: firstOwnerAddress, gas: '100000'});
        var amtPTokens = await optionsContracts[0].balanceOf(firstOwnerAddress);
        expect(amtPTokens).toBe(numTokens);
      })

      it("check that the supply of the oTokens has increased", async () => {
          var totalSupply = await optionsContracts[0].totalSupply();
          expect(totalSupply).toBe("35000");
      })
  })

// //   describe("#beforeExpriyWindow", {

// //   })
  describe("#duringExpiryWindow", () => {
    it("should be able to call exercise", async () => {
        var amtToExercise = "10";

        // ensure the person has enough oTokens
        await optionsContracts[0].transfer(secondOwnerAddress, amtToExercise,{from: creatorAddress, gas: '100000'});
        var amtPTokens = await optionsContracts[0].balanceOf(secondOwnerAddress);
        expect(amtPTokens).toBe(amtToExercise);

        // ensure the person has enough underyling
        var ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
        expect(ownerDaiBal.toString()).toBe("0")
        await dai.mint("100000", {from: secondOwnerAddress});
        await dai.approve(optionsContracts[0].options.address, "10000000000000000000000", {from: secondOwnerAddress});

        // call exercise
        // ensure you approve before burn
        await optionsContracts[0].approve(optionsContracts[0].options.address, "10000000000000000",{from: secondOwnerAddress});
        await optionsContracts[0].exercise(amtToExercise,{from: secondOwnerAddress, gas: '1000000'});

    })

    it("check the calculations for the events emitted", async () => {
        // check the calculations on amount of collateral paid out and underlying transferred is correct
        var returnValues = (await optionsContracts[0].getPastEvents( 'Exercise', { fromBlock: 0, toBlock: 'latest' } ));
        var amtUnderlying = returnValues[0].returnValues.amtUnderlyingToPay;
        expect(amtUnderlying).toBe("100000");
        var amtCollateral = returnValues[0].returnValues.amtCollateralToPay;
        expect(amtCollateral).toBe("450");
    })

    it("check that the underlying and oTokens were transferred", async () => {
        // The balances of the person should be 0
        amtPTokens = await optionsContracts[0].balanceOf(secondOwnerAddress);
        expect(amtPTokens).toBe("0");
        var ownerDaiBal = await dai.balanceOf(secondOwnerAddress);
        expect(ownerDaiBal.toString()).toBe("0")

        // The underlying balances of the contract should have increased
        var contractDaiBal = await dai.balanceOf(optionsContracts[0].options.address);
        expect(contractDaiBal.toString()).toBe("100000")

        // check the supply of oTokens has changed
        var totalSupply = await optionsContracts[0].totalSupply();
        expect(totalSupply).toBe("34990");

        // TODO: check that the person gets the right amount of ETH back
    })

  })
  describe("#afterExpriyWindow", () => {
      it("first person should be able to collect their share of collateral", async () => {
          const repoIndex = "1"
          await optionsContracts[0].claimCollateral(repoIndex,{from: creatorAddress, gas: '1000000'});

          // check the calculations on amount of collateral paid out and underlying transferred is correct
          var returnValues = (await optionsContracts[0].getPastEvents( 'ClaimedCollateral', { fromBlock: 0, toBlock: 'latest' } ));
          var amtCollateral = returnValues[0].returnValues.amtCollateralClaimed;
          expect(amtCollateral).toBe("19999700");
          var amtUnderlying = returnValues[0].returnValues.amtUnderlyingClaimed;
          expect(amtUnderlying).toBe("66666");

          // TODO: check the person's collateral balance went up

          // check the person's underlying balance increased
          var ownerDaiBal = await dai.balanceOf(creatorAddress);
          expect(ownerDaiBal.toString()).toBe("66666")

      })

      it("only the owner of the repo should be able to collect collateral", async () => {
        const repoIndex = "2"

        try {
            await optionsContracts[0].claimCollateral(repoIndex, {from: creatorAddress, gas: '1000000'});
        } catch (err) {
            return;
        }

        truffleAssert.fails("should throw err");
      })

      it ("once collateral has been collected, should not be able to collect again")

      it ("the second person should be able to collect their share of collateral", async () => {
        const repoIndex = "2"
        await optionsContracts[0].claimCollateral(repoIndex,{from: firstOwnerAddress, gas: '1000000'});

        // check the calculations on amount of collateral paid out and underlying transferred is correct
        var returnValues = (await optionsContracts[0].getPastEvents( 'ClaimedCollateral', { fromBlock: 0, toBlock: 'latest' } ));
        var amtCollateral = returnValues[1].returnValues.amtCollateralClaimed;
        expect(amtCollateral).toBe("9999850");

        var ownerDaiBal = await dai.balanceOf(firstOwnerAddress);
        expect(ownerDaiBal.toString()).toBe("33333")
      })
  })
})
