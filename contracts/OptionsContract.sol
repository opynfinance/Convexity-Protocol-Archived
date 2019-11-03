pragma solidity 0.5.10;

import "./CompoundOracleInterface.sol";
import "./OptionsExchange.sol";
import "./OptionsFactory.sol";
import "./OptionsUtils.sol";
import "./UniswapFactoryInterface.sol";
import "./UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract OptionsContract is OptionsUtils, ERC20 {
    using SafeMath for uint256;
    struct Repo {
        uint256 collateral;
        uint256 putsOutstanding;
        address payable owner;
    }

    // TODO: PROPERLY INITIALIZE
    OptionsExchange constant OPTIONS_EXCHANGE = OptionsExchange(0);

    Repo[] public repos;

    uint256 totalCollateral; // denominated in collateralType, depending on underlying type need to be able to handle decimal places
    uint256 totalUnderlying; // denominated in underlyingType, depending on underlying type need to be able to handle decimal places
    uint32 penaltyFee; //(need 4 decimal places → egs. 45.55% needs to be storable)
    uint32 transactionFee; // needs 4 decimal places -> egs. 10.02%
    uint128 numRepos;
    bool optionType; // 1 is American / 0 is European
    uint256 windowSize; // amt of seconds before expiry tht a person has to exercise
    uint256 totalExercised; // total collateral withdrawn from contract balance
    uint256 totalStrikePool; // total amount of strikeAssets, gets incremented on liquidations

    uint16 public collateralizationRatio = 16; //(need to be able have 1 decimal place)

    IERC20 public collateral;
    UniswapExchangeInterface public collateralExchange;
    IERC20 public underlying;
    uint256 public strikePrice; //depending on underlying type need to be able to handle decimal places
    IERC20 public strikeAsset;
    IERC20 public payout;
    UniswapExchangeInterface public payoutExchange;
    uint256 public expiry;

    constructor(
        IERC20 _collateral,
        IERC20 _underlying,
        uint256 _strikePrice,
        IERC20 _strikeAsset,
        IERC20 _payout,
        uint256 _expiry
    )
        public
    {
        collateral = _collateral;
        if (!isETH(collateral)) {
            // go to Uniswap for the appropriate exchange
            collateralExchange = getUniswapExchange(address(collateral));
        }

        underlying = _underlying;
        strikePrice = _strikePrice;
        strikeAsset = _strikeAsset;
        payout = _payout;
        if (!isETH(payout)) {
            // same as above for collateral
            payoutExchange = getUniswapExchange(address(payout));
        }

        expiry = _expiry;
    }

    function openRepo() public returns (uint) {
        require(now < expiry, "Options contract expired");
        repos.push(Repo(0, 0, msg.sender));
        return repos.length - 1;
    }

    function addETHCollateral(uint256 _repoNum) public payable returns (uint256) {
        return _addCollateral(_repoNum, msg.value);
    }

    function addERC20Collateral(uint256 _repoNum, uint256 _amt) public returns (uint256) {
        require(
            collateral.transferFrom(msg.sender, address(this), _amt),
            "Could not transfer in collateral tokens"
        );

        return _addCollateral(_repoNum, _amt);
    }

/// TODO: look up pToken to underlying ratio. rn 1:1.
/// TODO: add fees
    function exercise(uint256 _pTokens) public payable {
        // 1. before exercise window: revert
        require(now >= expiry - windowSize, "Too early to exercise");
        require(now < expiry, "Beyond exercise time");

        // 2. during exercise window: exercise
        /// 2.1 ensure person calling has enough pTokens
        require(balanceOf(msg.sender) >= _pTokens, "Not enough pTokens");

        /// 2.2 check they have corresponding number of underlying (and transfer in)
        if (isETH(collateral)) {
            require(msg.value == _pTokens, "Incorrect msg.value");
        } else {
            require(
                collateral.transferFrom(msg.sender, address(this), _pTokens),
                "Could not transfer in tokens"
            );
        }

        /// 2.3 transfer in pTokens
        _burnFrom(msg.sender, _pTokens);

        /// 2.4 sell enough collateral to get strikePrice * pTokens number of payoutTokens

        /// 2.4.0 first sell from the strikeAsset pool
        uint256 amtOwed = strikePrice.mul(_pTokens);
        /// 2.4.0.1. strikeAssetPool is big enough
        if (totalStrikePool >= amtOwed) {
            totalStrikePool = totalStrikePool.sub(amtOwed);

            if(strikeAsset != payout) {
                OPTIONS_EXCHANGE.exchangeAndTransferInput(strikeAsset, payout, amtOwed, msg.sender);
            } else {
                transferCollateral(msg.sender, amtOwed);
            }
        }
        // 2.4.0.2 strikeAsset + normal pool
        else {

            _pTokens = _pTokens.sub((totalStrikePool.div(strikePrice)));

            if(strikeAsset != payout) {
                OPTIONS_EXCHANGE.exchangeAndTransferInput(strikeAsset, payout, totalStrikePool, msg.sender);
            } else {
                transferCollateral(msg.sender, totalStrikePool);
            }
            totalStrikePool = 0;
        }
        /// TODO: decimal places of different assets.
        /// 2.4.1 if collateral = strike = payout, send strikePrice * pTokens number of collateral.
        if (collateral == strikeAsset && strikeAsset == payout) {
            uint256 amtToSend = strikePrice.mul(_pTokens);
            transferCollateral(msg.sender, amtToSend);
            totalExercised = totalExercised.add(amtToSend);
        }

        /* TODO: In the long term, need to first calculate how many payoutTokens you can get based
        on only oracle prices, not with uniswap slippage. Then call the uniswap transfer output on the payOutTokens. */
        /* 2.4.2 if collateral = strike != payout,
        uniswap transfer input. This transfers in strikePrice * pTokens collateral for how many ever payoutTokens you can get. */
        else if(collateral == strikeAsset && strikeAsset != payout) {
            uint256 amtToSend = strikePrice.mul(_pTokens);
            OPTIONS_EXCHANGE.exchangeAndTransferInput(collateral, payout, amtToSend, msg.sender);
            totalExercised = totalExercised.add(amtToSend);
        }
        /* 2.4.3 if collateral != strike = payout. uniswap transfer output. This transfers in as much
        collateral as will get you strikePrice * payout payoutTokens. */
        else if (collateral != strikeAsset && strikeAsset == payout) {
            uint256 amtToPayout = strikePrice.mul(_pTokens);
            uint256 amtSent = OPTIONS_EXCHANGE.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
            totalExercised = totalExercised.add(amtSent);
        }

        /* 2.4.4 if collateral = payout != strike. strikeToCollateralPrice = amt of collateral 1 strikeToken can get you.
         Payout strikeToCollateralPrice * strikePrice * pTokens worth of payoutTokens. */
         else if (collateral == payout && payout != strikeAsset) {
            //TODO: first check if either are ETH so we don't have to call oracle
            uint256 ethToCollateralPrice = getPrice(address(collateral));
            uint256 ethToStrikePrice = getPrice(address(strikeAsset));
            uint256 strikeToCollateralPrice = ethToStrikePrice / ethToCollateralPrice;
            uint256 amtToPayout = strikePrice.mul(_pTokens).mul(strikeToCollateralPrice);
            transferCollateral(msg.sender, amtToPayout);
            totalExercised = totalExercised.add(amtToPayout);

         }

         /* 2.4.5, collateral != strike != payout. Uniswap transfer output. This sells
         enough collateral to get strikePrice * pTokens * strikeToPayoutPrice payoutTokens. */
         else {
            //TODO: first check if either are ETH so we don't have to call oracle
            uint256 ethToPayoutPrice = getPrice(address(payout));
            uint256 ethToStrikePrice = getPrice(address(strikeAsset));
            uint256 strikeToPayoutPrice = ethToStrikePrice / ethToPayoutPrice;
            uint256 amtToPayout = strikePrice.mul(_pTokens).mul(strikeToPayoutPrice);
            uint256 amtSent = OPTIONS_EXCHANGE.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
            totalExercised = totalExercised.add(amtSent);
         }
        // 3. after: TBD (but don't allow exercise)
    }

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

    //strikeToCollateralPrice = amt of strikeTokens 1 collateralToken can give you.
    function issueOptionTokens (uint256 repoIndex, uint256 numTokens) public {
        //check that we're properly collateralized to mint this number, then call _mint(address account, uint256 amount)
        require(now < expiry, "Options contract expired");
        // TODO: get the price from Oracle
        uint256 ethToCollateralPrice = getPrice(address(collateral));
        uint256 ethToStrikePrice = getPrice(address(strikeAsset));
        //TODO: why are we using strikeToCollateralPrice here but collateralToStrikePrice elsewhere
        uint256 collateralToStrikePrice =  ethToCollateralPrice / ethToStrikePrice;
        Repo storage repo = repos[repoIndex];
        require(numTokens.mul(collateralizationRatio).mul(strikePrice) <= repo.collateral.mul(collateralToStrikePrice), "unsafe to mint");
        _mint(msg.sender, numTokens);
        return;
    }

    //this function opens a repo, adds ETH collateral, and mints new putTokens in one step, returing the repoIndex
    function createOptionETHCollateral(uint256 amtToCreate) payable external returns (uint256) {
        require(isETH(collateral), "cannot add ETH as collateral to an ERC20 collateralized option");
        uint256 repoIndex = openRepo();
        //TODO: can ETH be passed around payables like this?
        createOptionETHCollateral(amtToCreate, repoIndex);
        return repoIndex;
    }

    //this function adds ETH collateral to an existing repo and mints new tokens in one step
    function createOptionETHCollateral(uint256 amtToCreate, uint256 repoIndex) payable public {
        require(isETH(collateral), "cannot add ETH as collateral to an ERC20 collateralized option");
        require(repos[repoIndex].owner == msg.sender, "trying to createOption on a repo that is not yours");
        //TODO: can ETH be passed around payables like this?
        addETHCollateral(repoIndex);
        issueOptionTokens(repoIndex, amtToCreate);
    }

    //this function opens a repo, adds ERC20 collateral to that repo and mints new tokens in one step, returning the repoIndex
    function createOptionERC20Collateral(uint256 amtToCreate, uint256 amtCollateral) external returns (uint256) {
        //TODO: was it okay to remove the require here?
        uint256 repoIndex = openRepo();
        createOptionERC20Collateral(repoIndex, amtToCreate, amtCollateral);
        return repoIndex;
    }

    //this function adds ERC20 collateral to an existing repo and mints new tokens in one step
    function createOptionERC20Collateral(uint256 amtToCreate, uint256 amtCollateral, uint256 repoIndex) public {
        require(!isETH(collateral), "cannot add ERC20 collateral to an ETH collateralized option");
        require(repos[repoIndex].owner == msg.sender, "trying to createOption on a repo that is not yours");
        addERC20Collateral(repoIndex, amtCollateral);
        issueOptionTokens(repoIndex, amtToCreate);
    }

    function createAndSellOption(uint256 repoIndex, uint256 amtToBurn) public {
        //TODO: write this
    }

    function  burnPutTokens(uint256 repoIndex, uint256 amtToBurn) public {
        Repo storage repo = repos[repoIndex];
        require(repo.owner == msg.sender, "Not the owner of this repo");
        repo.putsOutstanding = repo.putsOutstanding.sub(amtToBurn);
        _burn(msg.sender, amtToBurn);
    }

    function transferRepoOwnership(uint256 repoIndex, address payable newOwner) public {
        require(repos[repoIndex].owner == msg.sender, "Cannot transferRepoOwnership as non owner");
        repos[repoIndex].owner = newOwner;
    }

    function removeCollateral(uint256 repoIndex, uint256 amtToRemove) public {
        //TODO: check that we are well collateralized enough to remove this amount of collateral
    }
    // TODO: look at compound docs and improve how it is built
    function liquidate(uint256 repoNum) public returns (uint256) {
        require(now < expiry, "Options contract expired");

       // TODO: get price from Oracle
        uint256 collateralToStrikePrice = 1;
        Repo storage repo = repos[repoNum];

        require(repo.putsOutstanding.mul(collateralizationRatio).mul(strikePrice) > repo.collateral.mul(collateralToStrikePrice), "Repo is safe");

        uint256 debtOwed = strikePrice.mul(repo.putsOutstanding);

        uint256 collateralTaken = OPTIONS_EXCHANGE.exchangeAndTransferOutput(collateral, strikeAsset, debtOwed, address(this));

        uint256 feeAmount = repo.collateral.mul(penaltyFee);

        transferCollateral(msg.sender, feeAmount);

        repo.collateral = repo.collateral.sub(feeAmount.add(collateralTaken));

        repo.putsOutstanding = 0;
    }

    function transferCollateral(address payable _addr, uint256 _amt) internal {
        if (isETH(collateral)){
            msg.sender.transfer(_amt);
        } else {
            collateral.transfer(msg.sender, _amt);
        }
    }

    function getPrice(address asset) internal view returns (uint256) {
        return COMPOUND_ORACLE.getPrice(asset);
    }

    function() external payable {
        // to get ether from uniswap exchanges
    }
}
