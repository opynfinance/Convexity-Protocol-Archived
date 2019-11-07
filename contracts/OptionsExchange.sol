pragma solidity 0.5.10;

import "./CompoundOracleInterface.sol";
import "./OptionsUtils.sol";
import "./UniswapFactoryInterface.sol";
import "./UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract OptionsExchange is OptionsUtils {

    uint256 constant LARGE_BLOCK_SIZE = 1651753129000;

    function sellPTokens(uint256 _pTokens, address payoutTokenAddress) public {
        // TODO: first need to boot strap the uniswap exchange to get the address.
        // uniswap transfer input _pTokens to payoutTokens

    }

    function buyPTokens(uint256 _pTokens, address paymentTokenAddress) public payable {
        // uniswap transfer output. This transfer enough paymentToken to get desired pTokens.
    }

    function exchangeAndTransferInput(
        IERC20 _inputToken,
        IERC20 _outputToken,
        uint256 _amt,
        address payable _transferTo
    )
        external
        returns (uint256)
    {
        if (!isETH(_inputToken)) {
            UniswapExchangeInterface exchange = getUniswapExchange(address(_inputToken));

            if(isETH(_outputToken)) {
                /// Token to ETH
                _inputToken.approve(address(exchange), _amt);
                return exchange.tokenToEthTransferInput(_amt, 1, LARGE_BLOCK_SIZE, _transferTo);
            } else {
                /// Token to Token
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
                UniswapExchangeInterface exchange = getUniswapExchange(address(_outputToken));

                return exchange.ethToTokenTransferInput.value(_amt)(
                    1,
                    LARGE_BLOCK_SIZE,
                    _transferTo
                );
            }

            // both args are ETH
            revert("Trying to exchange ETH for ETH");
        }
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
            if (!isETH(_inputToken)) {
                UniswapExchangeInterface exchange = getUniswapExchange(address(_inputToken));

                if(isETH(_outputToken)) {
                    /// Token to ETH
                    _inputToken.approve(address(exchange), 10 ** 30);
                    return exchange.tokenToEthTransferOutput(
                        _amt,
                        10 ** 30,
                        LARGE_BLOCK_SIZE,
                        _transferTo
                    );
                } else {
                    /// Token to Token
                    _inputToken.approve(address(exchange), 10 ** 30);
                    return exchange.tokenToTokenTransferOutput(
                        _amt,
                        10 ** 30,
                        10 ** 30,
                        LARGE_BLOCK_SIZE,
                        _transferTo,
                        address(_outputToken)
                    );
                }
        } else {
            // ETH to Token
            if(!isETH(_outputToken)) {
                UniswapExchangeInterface exchange = UniswapExchangeInterface(
                    UNISWAP_FACTORY.getExchange(address(_outputToken))
                );

                uint256 ethToTransfer = exchange.getEthToTokenOutputPrice(_amt);
                return exchange.ethToTokenTransferOutput.value(ethToTransfer)(
                    _amt,
                    LARGE_BLOCK_SIZE,
                    _transferTo
                );
            }

            revert("Trying to exchange ETH for ETH");
        }
    }

}
