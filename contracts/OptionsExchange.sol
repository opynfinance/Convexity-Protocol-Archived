pragma solidity 0.5.10;

import "./lib/CompoundOracleInterface.sol";
import "./OptionsUtils.sol";
import "./lib/UniswapFactoryInterface.sol";
import "./lib/UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract OptionsExchange {

    uint256 constant LARGE_BLOCK_SIZE = 1651753129000;

    UniswapFactoryInterface public UNISWAP_FACTORY;

    constructor (address _uniswapFactory) public {
        UNISWAP_FACTORY = UniswapFactoryInterface(_uniswapFactory);
    }

    // TODO: write these functions later
    function sellOTokens(address payable receiver, address _oTokenAddr, address _payoutTokenAddress, uint256 _oTokens) public {
        // @note: first need to boot strap the uniswap exchange to get the address.
        // uniswap transfer input _pTokens to payoutTokens
        IERC20 oToken = IERC20(_oTokenAddr);
        IERC20 payoutToken = IERC20(_payoutTokenAddress);
        oToken.transferFrom(msg.sender, address(this), _oTokens);
        exchangeAndTransferInput(oToken, payoutToken, _oTokens, receiver);
    }

    // TODO: write these functions later
    function buyPTokens(uint256 _pTokens, address paymentTokenAddress) public payable {
        // uniswap transfer output. This transfer enough paymentToken to get desired pTokens.
    }

    function exchangeAndTransferInput(
        IERC20 _inputToken,
        IERC20 _outputToken,
        uint256 _amt,
        address payable _transferTo
    )
        internal
        returns (uint256)
    {
        if (!isETH(_inputToken)) {
            UniswapExchangeInterface exchange = getExchange(address(_inputToken));

            if(isETH(_outputToken)) {
                //Token to ETH
                _inputToken.approve(address(exchange), _amt);
                return exchange.tokenToEthTransferInput(_amt, 1, LARGE_BLOCK_SIZE, _transferTo);
            } else {
                //Token to Token
                 _inputToken.approve(address(exchange), _amt);
                return exchange.tokenToTokenTransferInput(
                    _amt,
                    1,
                    1,
                    LARGE_BLOCK_SIZE,
                    _transferTo,
                    address(_outputToken)
                );
            }
        } else {
            // ETH to Token
            if(!isETH(_outputToken)) {
                UniswapExchangeInterface exchange = getExchange(address(_outputToken));

                return exchange.ethToTokenTransferInput.value(_amt)(
                    1,
                    LARGE_BLOCK_SIZE,
                    _transferTo
                );
            }

            // both args are ETH
            revert("Trying to exchange ETH for ETH");
        }
        return 0;
    }

     function exchangeAndTransferOutput(
            IERC20 _inputToken,
            IERC20 _outputToken,
            uint256 _amt,
            address payable _transferTo
        )
            external
            returns (uint256)
        {
            return 5;
        // TODO: uncomment below and test on testnet
        //     if (!isETH(_inputToken)) {
        //         UniswapExchangeInterface exchange = getExchange(address(_inputToken));

        //         if(isETH(_outputToken)) {
        //             /// Token to ETH
        //             _inputToken.approve(address(exchange), 10 ** 30);
        //             return exchange.tokenToEthTransferOutput(
        //                 _amt,
        //                 10 ** 30,
        //                 LARGE_BLOCK_SIZE,
        //                 _transferTo
        //             );
        //         } else {
        //             /// Token to Token
        //             _inputToken.approve(address(exchange), 10 ** 30);
        //             return exchange.tokenToTokenTransferOutput(
        //                 _amt,
        //                 10 ** 30,
        //                 10 ** 30,
        //                 LARGE_BLOCK_SIZE,
        //                 _transferTo,
        //                 address(_outputToken)
        //             );
        //         }
        // } else {
        //     // ETH to Token
        //     if(!isETH(_outputToken)) {
        //         UniswapExchangeInterface exchange = UniswapExchangeInterface(
        //             UNISWAP_FACTORY.getExchange(address(_outputToken))
        //         );

        //         uint256 ethToTransfer = exchange.getEthToTokenOutputPrice(_amt);
        //         return exchange.ethToTokenTransferOutput.value(ethToTransfer)(
        //             _amt,
        //             LARGE_BLOCK_SIZE,
        //             _transferTo
        //         );
        //     }

        //     revert("Trying to exchange ETH for ETH");
        // }
    }

    function getExchange(address _token) public view returns (UniswapExchangeInterface) {
        UniswapExchangeInterface exchange = UniswapExchangeInterface(
            UNISWAP_FACTORY.getExchange(_token)
        );

        if (address(exchange) == address(0)) {
            revert("No payout exchange");
        }

        return exchange;
    }

    function isETH(IERC20 _ierc20) public pure returns (bool) {
        return _ierc20 == IERC20(0);
    }

    function() external payable {
        // to get ether from uniswap exchanges
    }

}
