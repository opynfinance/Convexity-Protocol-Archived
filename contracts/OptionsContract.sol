pragma solidity 0.5.10;

import "./OptionsFactory.sol";
import "./UniswapFactoryInterface.sol";
import "./UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract OptionsContract is ERC20 {
    using SafeMath for uint256;
    struct Repo {
        uint256 collateral;
        uint256 putsOutstanding;
        address payable owner;
    }

    UniswapFactoryInterface constant UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

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
            collateralExchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(collateral))
            );

            // if address(0), uniswap doesn't have an exchange
            if (address(collateralExchange) == address(0)) {
                revert("No collateral exchange");
            }
        }

        underlying = _underlying;
        strikePrice = _strikePrice;
        strikeAsset = _strikeAsset;
        payout = _payout;
        if (!isETH(payout)) {
            // same as above for collateral
            payoutExchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(payout))
            );

            if (address(payoutExchange) == address(0)) {
                revert("No payout exchange");
            }
        }

        expiry = _expiry;
    }

    function addETHCollateral(uint256 _repoNum) public payable returns (uint256) {
        return _addCollateral(_repoNum, msg.value);
    }

    function addERC20Collateral(uint256 _repoNum, uint256 _amt) public returns (uint256) {
        require(collateral.transferFrom(msg.sender, address(this), _amt));

        return _addCollateral(_repoNum, _amt);
    }

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
            uint256 amtToSend = strikePrice * _pTokens/ (10 ** 18);
            if (isETH(collateral)){
                (msg.sender).send(amtToSend);
            } else {
                collateral.approve(msg.sender, amtToSend);
                collateral.transfer(msg.sender, amtToSend);
            }
        } 
        /* TODO: In the long term, need to first calculate how many payoutTokens you can get based 
        on only oracle prices, not with uniswap slippage. Then call the uniswap transfer output on the payOutTokens. */
        /* 2.4.2 if collateral = strike != payout, 
        uniswap transfer input. This transfers in strikePrice * pTokens collateral for how many ever payoutTokens you can get. */
        else if(collateral == strikeAsset && strikeAsset != payout) {
            uint256 amtToSend = strikePrice * _pTokens/ (10 ** 18);
            exchangeAndTransferInput(collateral, payout, amtToSend, msg.sender);
        }
        /* 2.4.3 if collateral != strike = payout. uniswap transfer output. This transfers in as much 
        collateral as will get you strikePrice * payout payoutTokens. */ 
        else if (collateral != strikeAsset && strikeAsset == payout) {
            uint256 amtToPayout = strikePrice * _pTokens/ (10 ** 18);
            exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
        }

        /* 2.4.4 if collateral = payout != strike. strikeToCollateralPrice = amt of collateral 1 strikeToken can give you.
         Payout strikeToCollateralPrice * strikePrice * pTokens worth of payoutTokens. */
         else if (collateral == payout && payout != strikeAsset) {
             // TODO: get price from oracle
             uint256 strikeToCollateralPrice = 1;
             uint256 amtToPayout = strikePrice * _pTokens * strikeToCollateralPrice / (10 ** 18);
            if (isETH(collateral)){
                (msg.sender).send(amtToPayout);
            } else {
                collateral.approve(msg.sender, amtToPayout);
                collateral.transfer(msg.sender, amtToPayout);
            }
         }
         /* 2.4.5, collateral != strike != payout. Uniswap transfer output. This sells 
         enough collateral to get strikePrice * pTokens * strikeToPayoutPrice payoutTokens. */
         else {
            // TODO: get price from oracle
             uint256 strikeToPayoutPrice = 1;
             uint256 amtToPayout = strikePrice * _pTokens * strikeToPayoutPrice / (10 ** 18);
             exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
         }
        // 3. after: TBD (but don't allow exercise)
    }

    /// TODO: move ths to the Options Exchange contract later. 
    function exchangeAndTransferInput(IERC20 _inputToken, IERC20 _outputToken, uint256 _amt, address _transferTo) internal returns (uint256) {
        if (!isETH(_inputToken)) {
            UniswapExchangeInterface exchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(_inputToken))
            );

            if (address(exchange) == address(0)) {
                revert("No payout exchange");
            }

            /// Token to ETH
            if(isETH(_outputToken)) {
                _inputToken.approve(address(exchange), _amt);
                return exchange.tokenToEthTransferInput(_amt, 1, 1651753129000, _transferTo);
            } else {
            /// Token to Token
                 _inputToken.approve(address(exchange), _amt);
                return exchange.tokenToTokenTransferInput(_amt, 1, 1, 1651753129000,_transferTo, address(_outputToken));
            }
        } else {
            // ETH to Token
            if(!isETH(_outputToken)) {
            UniswapExchangeInterface exchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(_outputToken))
            );

            return exchange.ethToTokenTransferInput.value(_amt)(1, 1651753129000, _transferTo);
            } 

            return 0;
        }
    }

    function exchangeAndTransferOutput(IERC20 _inputToken, IERC20 _outputToken, uint256 _amt, address _transferTo) public returns (uint256) {
        if (!isETH(_inputToken)) {
            UniswapExchangeInterface exchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(_inputToken))
            );

            if (address(exchange) == address(0)) {
                revert("No payout exchange");
            }

            /// Token to ETH
            if(isETH(_outputToken)) {
                 _inputToken.approve(address(exchange), (10 ** 30));
                return exchange.tokenToEthTransferOutput(_amt, (10 ** 30), 1651753129000, _transferTo);
            } else {
            /// Token to Token
                 _inputToken.approve(address(exchange), (10 ** 30));
                return exchange.tokenToTokenTransferOutput(_amt, (10 ** 30), (10 ** 30), 1651753129000,_transferTo, address(_outputToken));
            }
        } else {
            // ETH to Token
            if(!isETH(_outputToken)) {
            UniswapExchangeInterface exchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(_outputToken))
            );

            uint256 ethToTransfer = exchange.getEthToTokenOutputPrice(_amt);
            return exchange.ethToTokenTransferOutput.value(ethToTransfer)(_amt, 1651753129000, _transferTo);
            } 

            return 0;
        }
    }

    // function getReposByOwner(address owner) public view returns (uint[] memory) {
    //     //how to write this in a gas efficient way lol
    // }

    // function getRepos() public view returns (uint[] memory) {
    //     //how to write this in a gas efficient way lol
    //     return repos;
    // }

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
    function openRepo() public returns (uint) {
        uint repoIndex = repos.push(Repo(0, 0, msg.sender)) - 1; //the length
        return repoIndex;
    }

    function issueOptionTokens (uint256 repoIndex, uint256 numTokens) public {
        //check that we're properly collateralized to mint this number, then call _mint(address account, uint256 amount)
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




}
