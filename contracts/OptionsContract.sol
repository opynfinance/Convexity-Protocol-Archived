pragma solidity 0.5.10;

import "./lib/CompoundOracleInterface.sol";
import "./OptionsExchange.sol";
import "./OptionsUtils.sol";
import "./lib/UniswapFactoryInterface.sol";
import "./lib/UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract OptionsContract is OptionsUtils, ERC20 {
    using SafeMath for uint256;

    struct Number {
        uint256 value;
        int32 exponent; 
    }

    struct Repo {
        uint256 collateral; // 10 ^ -18
        uint256 putsOutstanding;
        address payable owner;
    }

    OptionsExchange public optionsExchange;

    Repo[] public repos;

    uint256 totalCollateral; // denominated in collateralType, depending on underlying type need to be able to handle decimal places
    uint256 totalUnderlying; // denominated in underlyingType, depending on underlying type need to be able to handle decimal places
    Number liquidationIncentive = Number(1010, -3); // need 3 decimal places → egs. 1.054 is 5.4% needs to be storable
    Number transactionFee; // needs 2 decimal places -> egs. 10.02%
    Number liquidationFactor = Number(500, -3); // need 2 decimal places → egs. 500 is 50.0% needs to be storable. Max amt a repo can be liquidated by i.e. max collateral that can be taken in a time period. 
    Number liquidationFee = Number(1000, -3); // need 3 decimal places → egs. 1.054 is 5.4% needs to be storable. The fees paid to our protocol every time a liquidation happens
    Number numRepos; 
    uint256 windowSize; // amt of seconds before expiry tht a person has to exercise
    uint256 totalExercised; // total collateral withdrawn from contract balance
    uint256 totalStrikePool; // total amount of strikeAssets, gets incremented on liquidations

    Number public collateralizationRatio = Number(16, -1); //(scaled by 10). 16 means 1.6

    IERC20 public collateral;
    int32 collateralExp = -18;
    IERC20 public underlying;
    Number public strikePrice; // number of strike tokens given out per oToken. 
    IERC20 public strikeAsset;
    IERC20 public payout;
    uint256 public expiry;

    // TODO: include windowsize, collateralizationRatio, liquidationFactor, liquidationFee, liquidationIncentive in constructor. 
    // TODO: do we need to be able to change any of the above
    /* @notice: constructor
        @param _collateral: The collateral asset
        @param _underlying: The asset that is being protected
        @param _strikePrice: The amount of strike asset that will be paid out
        @param _strikeAsset: The asset in which i
        @param _payout: The asset in which insurance is paid out
        @param _expiry: The time at which the insurance expires
        @param OptionsExchange: The contract which interfaces with the exchange */
    constructor(
        IERC20 _collateral,
        IERC20 _underlying,
        uint256 _strikePrice,
        IERC20 _strikeAsset,
        IERC20 _payout,
        uint256 _expiry,
        OptionsExchange _optionsExchange
    )
        OptionsUtils(
            //  address(_optionsExchange.UNISWAP_FACTORY())
            // address(_optionsExchange.UNISWAP_FACTORY()), address(_optionsExchange.COMPOUND_ORACLE())
        )
        public
    {
        collateral = _collateral;

        underlying = _underlying;
        /* NOTE: the precision of strikePrice has to be less than precision of underlying. 
        if 1oToken protects 10^-18 Dai and gives you 9 * 10^-19, then if Dai only has 18 digits of precision, 
        the oToken can only protect against 10^-17 Dai. */ 
        // TODO: accept precision. 
        strikePrice = Number(_strikePrice, -18);
        strikeAsset = _strikeAsset;
        payout = _payout;

        expiry = _expiry;
        optionsExchange = _optionsExchange;

        // TODO: remove this later. 
        setUniswapAndCompound(address(_optionsExchange.UNISWAP_FACTORY()), address(_optionsExchange.COMPOUND_ORACLE()));
    }

    event RepoOpened(uint256 repoIndex);
    event ETHCollateralAdded(uint256 repoIndex, uint256 amount);
    event ERC20CollateralAdded(uint256 repoIndex, uint256 amount);
    event IssuedOptionTokens(address issuedTo);
    // TODO: remove safe + unsafe called once testing is done
    event safe(uint256 leftVal, uint256 rightVal, int32 leftExp, int32 rightExp, bool isSafe);
    event unsafeCalled(bool isUnsafe);
    event Liquidate (uint256 amtCollateralToPay);

    function openRepo() public returns (uint) {
        require(now < expiry, "Options contract expired");
        repos.push(Repo(0, 0, msg.sender));
        uint256 repoIndex = repos.length - 1;
        emit RepoOpened(repoIndex);
        return repoIndex;
    }

    function addETHCollateral(uint256 _repoNum) public payable returns (uint256) {
        //TODO: do we need to have require checks? do we need require msg.value > 0 ?
        //TODO: does it make sense to have the event emitted here or should it be in the helper function?
        require(isETH(collateral), "ETH is not the specified collateral type");
        emit ETHCollateralAdded(_repoNum, msg.value);
        return _addCollateral(_repoNum, msg.value);
    }

    function addERC20Collateral(uint256 _repoNum, uint256 _amt) public returns (uint256) {
        require(
            collateral.transferFrom(msg.sender, address(this), _amt),
            "Could not transfer in collateral tokens"
        );

        emit ERC20CollateralAdded(_repoNum, _amt);
        return _addCollateral(_repoNum, _amt);
    }

/// TODO: look up pToken to underlying ratio. rn 1:1.
/// TODO: add fees
    // function exercise(uint256 _pTokens) public payable {
    //     // 1. before exercise window: revert
    //     require(now >= expiry - windowSize, "Too early to exercise");
    //     require(now < expiry, "Beyond exercise time");

    //     // 2. during exercise window: exercise
    //     /// 2.1 ensure person calling has enough pTokens
    //     require(balanceOf(msg.sender) >= _pTokens, "Not enough pTokens");

    //     /// 2.2 check they have corresponding number of underlying (and transfer in)
    //     if (isETH(collateral)) {
    //         require(msg.value == _pTokens, "Incorrect msg.value");
    //     } else {
    //         require(
    //             collateral.transferFrom(msg.sender, address(this), _pTokens),
    //             "Could not transfer in tokens"
    //         );
    //     }
    //     totalUnderlying = totalUnderlying.add(_pTokens);
    //     /// 2.3 transfer in pTokens
    //     _burnFrom(msg.sender, _pTokens);

    //     /// 2.4 sell enough collateral to get strikePrice * pTokens number of payoutTokens

    //     /// 2.4.0 first sell from the strikeAsset pool
    //     uint256 amtOwed = strikePrice.mul(_pTokens);
    //     /// 2.4.0.1. strikeAssetPool is big enough
    //     if (totalStrikePool >= amtOwed) {
    //         totalStrikePool = totalStrikePool.sub(amtOwed);

    //         if(strikeAsset != payout) {
    //             optionsExchange.exchangeAndTransferInput(strikeAsset, payout, amtOwed, msg.sender);
    //         } else {
    //             transferCollateral(msg.sender, amtOwed);
    //         }
    //     }
    //     // 2.4.0.2 strikeAsset + normal pool
    //     else {

    //         _pTokens = _pTokens.sub((totalStrikePool.div(strikePrice)));

    //         if(strikeAsset != payout) {
    //             optionsExchange.exchangeAndTransferInput(strikeAsset, payout, totalStrikePool, msg.sender);
    //         } else {
    //             transferCollateral(msg.sender, totalStrikePool);
    //         }
    //         totalStrikePool = 0;
    //     }
    //     /// TODO: decimal places of different assets.
    //     /// 2.4.1 if collateral = strike = payout, send strikePrice * pTokens number of collateral.
    //     if (collateral == strikeAsset && strikeAsset == payout) {
    //         uint256 amtToSend = strikePrice.mul(_pTokens);
    //         transferCollateral(msg.sender, amtToSend);
    //         totalExercised = totalExercised.add(amtToSend);
    //     }

    //     /* TODO: In the long term, need to first calculate how many payoutTokens you can get based
    //     on only oracle prices, not with uniswap slippage. Then call the uniswap transfer output on the payOutTokens. */
    //     /* 2.4.2 if collateral = strike != payout,
    //     uniswap transfer input. This transfers in strikePrice * pTokens collateral for how many ever payoutTokens you can get. */
    //     else if(collateral == strikeAsset && strikeAsset != payout) {
    //         uint256 amtToSend = strikePrice.mul(_pTokens);
    //         optionsExchange.exchangeAndTransferInput(collateral, payout, amtToSend, msg.sender);
    //         totalExercised = totalExercised.add(amtToSend);
    //     }
    //     /* 2.4.3 if collateral != strike = payout. uniswap transfer output. This transfers in as much
    //     collateral as will get you strikePrice * payout payoutTokens. */
    //     else if (collateral != strikeAsset && strikeAsset == payout) {
    //         uint256 amtToPayout = strikePrice.mul(_pTokens);
    //         uint256 amtSent = optionsExchange.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
    //         totalExercised = totalExercised.add(amtSent);
    //     }

    //     /* 2.4.4 if collateral = payout != strike. strikeToCollateralPrice = amt of collateral 1 strikeToken can get you.
    //      Payout strikeToCollateralPrice * strikePrice * pTokens worth of payoutTokens. */
    //      else if (collateral == payout && payout != strikeAsset) {
    //         //TODO: first check if either are ETH so we don't have to call oracle
    //         uint256 ethToCollateralPrice = getPrice(address(collateral));
    //         uint256 ethToStrikePrice = getPrice(address(strikeAsset));
    //         uint256 strikeToCollateralPrice = ethToStrikePrice / ethToCollateralPrice;
    //         uint256 amtToPayout = strikePrice.mul(_pTokens).mul(strikeToCollateralPrice);
    //         transferCollateral(msg.sender, amtToPayout);
    //         totalExercised = totalExercised.add(amtToPayout);

    //      }

    //      /* 2.4.5, collateral != strike != payout. Uniswap transfer output. This sells
    //      enough collateral to get strikePrice * pTokens * strikeToPayoutPrice payoutTokens. */
    //      else {
    //         //TODO: first check if either are ETH so we don't have to call oracle
    //         uint256 ethToPayoutPrice = getPrice(address(payout));
    //         uint256 ethToStrikePrice = getPrice(address(strikeAsset));
    //         uint256 strikeToPayoutPrice = ethToStrikePrice / ethToPayoutPrice;
    //         uint256 amtToPayout = strikePrice.mul(_pTokens).mul(strikeToPayoutPrice);
    //         uint256 amtSent = optionsExchange.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
    //         totalExercised = totalExercised.add(amtSent);
    //      }
    //     // 3. after: TBD (but don't allow exercise)
    // }

    function getReposByOwner(address _owner) public view returns (uint[] memory) {
        uint[] memory reposOwned;
        uint256 count = 0;
        uint index = 0;

        // get length necessary for returned array
        for (uint256 i = 0; i < repos.length; i++) {
            if(repos[i].owner == _owner){
                count += 1;
            }
        }

        reposOwned = new uint[](count);

        // get each index of each repo owned by given address
        for (uint256 i = 0; i < repos.length; i++) {
            if(repos[i].owner == _owner) {
                reposOwned[index++] = i;
            }
        }

       return reposOwned;
    }

    function getRepoByIndex(uint256 repoIndex) public view returns (uint256, uint256, address) {
        Repo storage repo = repos[repoIndex];

        return (
            repo.collateral,
            repo.putsOutstanding,
            repo.owner
        );
    }

    function isETH(IERC20 _ierc20) public pure returns (bool) {
        return _ierc20 == IERC20(0);
    }

    function _addCollateral(uint256 _repoNum, uint256 _amt) private returns (uint256) {
        require(now < expiry, "Options contract expired");

        Repo storage repo = repos[_repoNum];

        repo.collateral = repo.collateral.add(_amt);

        totalCollateral = totalCollateral.add(_amt);

        return repo.collateral;
    }

    /*
    @notice: This function is called to issue the option tokens
    @dev: The owner of a repo should only be able to have a max of 
    floor(Collateral * collateralToStrike / (minCollateralizationRatio * strikePrice)) tokens issued. 
    @param repoIndex : The index of the repo to issue tokens from
    @param numTokens : The number of tokens to issue
    */
    function issueOptionTokens (uint256 repoIndex, uint256 numTokens) public {
        //check that we're properly collateralized to mint this number, then call _mint(address account, uint256 amount)
        require(now < expiry, "Options contract expired");

        Repo storage repo = repos[repoIndex];
        require(msg.sender == repo.owner, "Only owner can issue options");
    
        // checks that the repo is sufficiently collateralized 
        uint256 newNumTokens = repo.putsOutstanding.add(numTokens);
        require(isSafe(repo.collateral, newNumTokens), "unsafe to mint");
        _mint(msg.sender, numTokens);
        repo.putsOutstanding = newNumTokens;

        // TODO: figure out proper events:
        emit IssuedOptionTokens(msg.sender);
        return;
    }

    // this function opens a repo, adds ETH collateral, and mints new putTokens in one step, returing the repoIndex
    // function createOptionETHCollateral(uint256 amtToCreate) payable external returns (uint256) {
    //     require(isETH(collateral), "cannot add ETH as collateral to an ERC20 collateralized option");
    //     uint256 repoIndex = openRepo();
    //     //TODO: can ETH be passed around payables like this?
    //     createOptionETHCollateral(amtToCreate, repoIndex);
    //     return repoIndex;
    // }

    // //this function adds ETH collateral to an existing repo and mints new tokens in one step
    // function createOptionETHCollateral(uint256 amtToCreate, uint256 repoIndex) public payable {
    //     require(isETH(collateral), "cannot add ETH as collateral to an ERC20 collateralized option");
    //     require(repos[repoIndex].owner == msg.sender, "trying to createOption on a repo that is not yours");
    //     //TODO: can ETH be passed around payables like this?
    //     addETHCollateral(repoIndex);
    //     issueOptionTokens(repoIndex, amtToCreate);
    // }

    // //this function opens a repo, adds ERC20 collateral to that repo and mints new tokens in one step, returning the repoIndex
    // function createOptionERC20Collateral(uint256 amtToCreate, uint256 amtCollateral) external returns (uint256) {
    //     //TODO: was it okay to remove the require here?
    //     uint256 repoIndex = openRepo();
    //     createOptionERC20Collateral(repoIndex, amtToCreate, amtCollateral);
    //     return repoIndex;
    // }

    // //this function adds ERC20 collateral to an existing repo and mints new tokens in one step
    // function createOptionERC20Collateral(uint256 amtToCreate, uint256 amtCollateral, uint256 repoIndex) public {
    //     require(!isETH(collateral), "cannot add ERC20 collateral to an ETH collateralized option");
    //     require(repos[repoIndex].owner == msg.sender, "trying to createOption on a repo that is not yours");
    //     addERC20Collateral(repoIndex, amtCollateral);
    //     issueOptionTokens(repoIndex, amtToCreate);
    // }

    // function createAndSellOption(uint256 repoIndex, uint256 amtToBurn) public {
    //     //TODO: write this
    // }

    /* @notice: allows the owner to burn their put Tokens
    @param repoIndex: Index of the repo to burn putTokens
    @param amtToBurn: number of pTokens to burn
    @dev: only want to call this function before expiry. After expiry, 
    no benefit to calling it.
    */
    function burnPutTokens(uint256 repoIndex, uint256 amtToBurn) public {
        Repo storage repo = repos[repoIndex];
        require(repo.owner == msg.sender, "Not the owner of this repo");
        repo.putsOutstanding = repo.putsOutstanding.sub(amtToBurn);
        _burn(msg.sender, amtToBurn);
    }

    function transferRepoOwnership(uint256 repoIndex, address payable newOwner) public {
        require(repos[repoIndex].owner == msg.sender, "Cannot transferRepoOwnership as non owner");
        repos[repoIndex].owner = newOwner;
    }

    /* @notice: allows the owner to remove excess collateral from the repo before expiry. 
    @param repoIndex: Index of the repo to burn putTokens
    @param amtToRemove: Amount of collateral to remove in 10^-18. 
    */ 
    function removeCollateral(uint256 repoIndex, uint256 amtToRemove) public {

        require(now < expiry, "Can only call remove collateral before expiry");
        // check that we are well collateralized enough to remove this amount of collateral
        Repo storage repo = repos[repoIndex];
        require(msg.sender == repo.owner, "Only owner can remove collateral");
        require(amtToRemove <= repo.collateral, "Can't remove more collateral than owned");
        uint256 newRepoCollateralAmt = repo.collateral.sub(amtToRemove);

        require(isSafe(newRepoCollateralAmt, repo.putsOutstanding), "Repo is unsafe");

        repo.collateral = newRepoCollateralAmt;
        transferCollateral(msg.sender, amtToRemove);
        totalCollateral = totalCollateral.sub(amtToRemove);
    }

    function claimCollateral (uint256 repoIndex) public {
        require(now >= expiry, "Can't collect collateral until expiry");
        // pay out people proportional
        Repo storage repo = repos[repoIndex];
        uint256 collateralToTransfer = repo.collateral.div(totalCollateral);
        uint256 underlyingToTransfer = repo.collateral.div(totalUnderlying);
        transferCollateral(msg.sender, collateralToTransfer);
        transferUnderlying(msg.sender, underlyingToTransfer);
        repo.collateral = 0;
    }

    /* @notice: checks if a repo is unsafe. If so, it can be liquidated 
    @param repoIndex: The number of the repo to check 
    @return: true or false */
    function isUnsafe(uint256 repoIndex) public returns (bool) {
        Repo storage repo = repos[repoIndex];

        bool isUnsafe = !isSafe(repo.collateral, repo.putsOutstanding);

        emit unsafeCalled(isUnsafe);

        return isUnsafe;
    }

    /* @notice: checks if a repo is unsafe. If so, it can be liquidated 
    @param repoNum: The number of the repo to check 
    @return: true or false */
    function isSafe(uint256 collateralAmt, uint256 putsOutstanding) internal returns (bool) {
        // get price from Oracle
        uint256 ethToCollateralPrice = getPrice(address(collateral));
        uint256 ethToStrikePrice = getPrice(address(strikeAsset));
  
        /* putsOutstanding * collateralizationRatio * strikePrice <= collAmt * collateralToStrikePrice 
         collateralToStrikePrice = ethToStrikePrice.div(ethToCollateralPrice);  */ 

        uint256 leftSideVal = putsOutstanding.mul(collateralizationRatio.value).mul(strikePrice.value);
        int32 leftSideExp = collateralizationRatio.exponent + strikePrice.exponent;

        uint256 rightSideVal = (collateralAmt.mul(ethToStrikePrice)).div(ethToCollateralPrice);
        int32 rightSideExp = collateralExp;

        uint32 exp = 0;
        bool isSafe = false;

        if(rightSideExp < leftSideExp) {
            exp = uint32(leftSideExp - rightSideExp);
            isSafe = leftSideVal.mul(10**exp) <= rightSideVal;
        } else {
            exp = uint32(rightSideExp - leftSideExp);
            isSafe = leftSideVal <= rightSideVal.mul(10 ** exp);
        }
        //TODO: remove after debugging.
        emit safe(leftSideVal, rightSideVal, leftSideExp, rightSideExp, isSafe);
        return isSafe;
    }

    /* Liquidator comes with _oTokens. They get _oTokens * strikePrice * (incentive + fee) 
    amount of collateral out. They can get a max of liquidationFactor * collateral out 
    in one function call. 
    */ 
    function liquidate(uint256 repoNum, uint256 _oTokens) public {
        // can only be called before the options contract expired
        require(now < expiry, "Options contract expired");

        Repo storage repo = repos[repoNum];

        // cannot liquidate a safe repo.
        require(isUnsafe(repoNum), "Repo is safe");

        // Owner can't liquidate themselves
        require(msg.sender != repo.owner, "Owner can't liquidate themselves");

        // TODO: Price oracle + decimal conversions for liqFee etc. 
        // Get price from oracle
        uint256 ethToCollateralPrice = getPrice(address(collateral));
        uint256 ethToStrikePrice = getPrice(address(strikeAsset));
 
        // calculate how much should be paid out        
        uint256 amtCollateralToPayNum = _oTokens.mul(strikePrice.value).mul(liquidationIncentive.value).mul(ethToCollateralPrice);
        int32 amtCollateralToPayExp = strikePrice.exponent + liquidationIncentive.exponent - collateralExp;
        uint256 amtCollateralToPay = 0;
        if(amtCollateralToPayExp > 0) {
            uint32 exp = uint32(amtCollateralToPayExp);
            amtCollateralToPay = amtCollateralToPayNum.mul(10 ** exp).div(ethToStrikePrice);
        } else {
            uint32 exp = uint32(-1 * amtCollateralToPayExp);
            amtCollateralToPay = (amtCollateralToPayNum.div(10 ** exp)).div(ethToStrikePrice);
        }

        // calculate our protocol fees
        // uint256 amtCollateralFeeNum = _oTokens.mul(strikePrice.value).mul(liquidationFee.value).mul(ethToCollateralPrice);
        // int32 amtCollateralFeeExp = strikePrice.exponent + liquidationFee.exponent - collateralExp;
        // if(amtCollateralToPayExp > 0) {
        //     uint32 exp = uint32(amtCollateralFeeExp);
        //     amtCollateralFeeNum = amtCollateralFeeNum.mul(10 ** exp).div(ethToStrikePrice);
        // } else {
        //     uint32 exp = uint32(-1 * amtCollateralFeeExp);
        //     amtCollateralFeeNum = (amtCollateralFeeNum.div(10 ** exp)).div(ethToStrikePrice);
        // }

        emit Liquidate(amtCollateralToPay);

        // calculate the maximum amount of collateral that can be liquidated
        uint256 maxCollateralLiquidatable = repo.collateral.mul(liquidationFactor.value);
        if(liquidationFactor.exponent > 0) {
            maxCollateralLiquidatable = maxCollateralLiquidatable.div(10 ** uint32(liquidationFactor.exponent));
        } else {
            maxCollateralLiquidatable = maxCollateralLiquidatable.div(10 ** uint32(-1 * liquidationFactor.exponent));
        }

        require(amtCollateralToPay <= maxCollateralLiquidatable, 
        "Can only liquidate liquidation factor at any given time");

        // deduct the collateral and putsOutstanding
        repo.collateral = repo.collateral.sub(amtCollateralToPay);
        repo.putsOutstanding = repo.putsOutstanding.sub(_oTokens);

        // // transfer the collateral and burn the _oTokens
         _burn(msg.sender, _oTokens);
         transferCollateral(msg.sender, amtCollateralToPay);
         // TODO: What happens to fees? 

         // TODO: emit event and return something
    }

    function transferCollateral(address payable _addr, uint256 _amt) internal {
        if (isETH(collateral)){
            msg.sender.transfer(_amt);
        } else {
            collateral.transfer(msg.sender, _amt);
        }
    }

    function transferUnderlying(address payable _addr, uint256 _amt) internal {
        if (isETH(underlying)){
            msg.sender.transfer(_amt);
        } else {
            underlying.transfer(msg.sender, _amt);
        }
    }

    function getPrice(address asset) internal view returns (uint256) {

        if(asset == address(0)) {
            return (10 ** 18);
        } else {
            return COMPOUND_ORACLE.getPrice(asset);
        }
    }

    function() external payable {
        // to get ether from uniswap exchanges
    }
}
