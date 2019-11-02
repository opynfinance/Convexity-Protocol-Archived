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

    UniswapFactoryInterface constant UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    CompoundOracleInterface constant COMPOUND_ORACLE = CompoundOracleInterface(
        0x02557a5E05DeFeFFD4cAe6D83eA3d173B272c904
    );

    // TODO: PROPERLY INITIALIZE
    OptionsExchange constant OPTIONS_EXCHANGE = OptionsExchange(0);

    Repo[] repos;


    uint256 totalCollateral; // denominated in collateralType, depending on underlying type need to be able to handle decimal places
    uint256 totalUnderlying; // denominated in underlyingType, depending on underlying type need to be able to handle decimal places
    uint32 penaltyFee; //(need 4 decimal places → egs. 45.55% needs to be storable)
    uint32 transactionFee; // needs 4 decimal places -> egs. 10.02%
    uint128 numRepos;
    bool optionType; // 1 is American / 0 is European
    uint256 windowSize; // amt of seconds before expiry tht a person has to exercise
    uint256 totalExercised; // total collateral withdrawn from contract balance

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

        // TODO: need to keep track of totalCollateralExercised, not pTokens.
        totalExercised = totalExercised.add(_pTokens);

        /// 2.4 sell enough collateral to get strikePrice * pTokens number of payoutTokens
        /// TODO: decimal places of different assets.
        /// 2.4.1 if collateral = strike = payout, send strikePrice * pTokens number of collateral.
        if (collateral == strikeAsset && strikeAsset == payout) {
            uint256 amtToSend = strikePrice.mul(_pTokens);
            if (isETH(collateral)){
                msg.sender.transfer(amtToSend);
            } else {
                collateral.transfer(msg.sender, amtToSend);
            }
        }
        /* TODO: In the long term, need to first calculate how many payoutTokens you can get based
        on only oracle prices, not with uniswap slippage. Then call the uniswap transfer output on the payOutTokens. */
        /* 2.4.2 if collateral = strike != payout,
        uniswap transfer input. This transfers in strikePrice * pTokens collateral for how many ever payoutTokens you can get. */
        else if(collateral == strikeAsset && strikeAsset != payout) {
            uint256 amtToSend = strikePrice.mul(_pTokens);
            OPTIONS_EXCHANGE.exchangeAndTransferInput(collateral, payout, amtToSend, msg.sender);
        }
        /* 2.4.3 if collateral != strike = payout. uniswap transfer output. This transfers in as much
        collateral as will get you strikePrice * payout payoutTokens. */
        else if (collateral != strikeAsset && strikeAsset == payout) {
            uint256 amtToPayout = strikePrice.mul(_pTokens);
            OPTIONS_EXCHANGE.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
        }

        /* 2.4.4 if collateral = payout != strike. strikeToCollateralPrice = amt of collateral 1 strikeToken can give you.
         Payout strikeToCollateralPrice * strikePrice * pTokens worth of payoutTokens. */
         else if (collateral == payout && payout != strikeAsset) {
            //TODO: first check if either are ETH so we don't have to call oracle
            uint256 ethToCollateralPrice = getPrice(address(collateral));
            uint256 ethToStrikePrice = getPrice(address(strikeAsset));
            uint256 strikeToCollateralPrice = ethToStrikePrice / ethToCollateralPrice;
            uint256 amtToPayout = strikePrice.mul(_pTokens).mul(strikeToCollateralPrice);
            if (isETH(collateral)){
                msg.sender.transfer(amtToPayout);
            } else {
                collateral.transfer(msg.sender, amtToPayout);
            }
         }
         /* 2.4.5, collateral != strike != payout. Uniswap transfer output. This sells
         enough collateral to get strikePrice * pTokens * strikeToPayoutPrice payoutTokens. */
         else {
            //TODO: first check if either are ETH so we don't have to call oracle
            uint256 ethToPayoutPrice = getPrice(address(payout));
            uint256 ethToStrikePrice = getPrice(address(strikeAsset));
            uint256 strikeToPayoutPrice = ethToStrikePrice / ethToPayoutPrice;
            uint256 amtToPayout = strikePrice.mul(_pTokens).mul(strikeToPayoutPrice);
            OPTIONS_EXCHANGE.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
         }
        // 3. after: TBD (but don't allow exercise)
    }

    function getReposByOwner(address payable owner) public view returns (uint[] memory) {
        uint[] memory repoNumbersOwned;
        uint index = 0;
       for (uint256 i = 0; i < repos.length; i++){
           if(repos[i].owner == owner){
               repoNumbersOwned[index] = i;
               index += 1;
           }
       }

       return repoNumbersOwned;
    }

    function getReposByIndex(uint256 repoIndex) public view returns (uint256, uint256, address) {
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

    function issueOptionTokens (uint256 repoIndex, uint256 numTokens) public {
        //check that we're properly collateralized to mint this number, then call _mint(address account, uint256 amount)
        require(now < expiry, "Options contract expired");
        // TODO: get the price from Oracle
        uint256 collateralToStrikePrice = 1;
        Repo storage repo = repos[repoIndex];
        require(numTokens.mul(collateralizationRatio).mul(strikePrice) <= repo.collateral.mul(collateralToStrikePrice), "unsafe to mint");
        _mint(msg.sender, numTokens);
        return;
    }

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

    function removeCollateral(uint256 repoIndex, uint256 amtToRemove) public {
        //check that we are well collateralized enough to remove this amount of collateral
    }

    // function liquidate(uint256 repo, )

    function getPrice(address asset) internal view returns (uint256) {
        return COMPOUND_ORACLE.getPrice(asset);
    }
}
