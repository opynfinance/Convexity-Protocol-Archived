
// File: contracts/CompoundOracleInterface.sol

pragma solidity ^0.5.0;
// AT MAINNET ADDRESS: 0x02557a5E05DeFeFFD4cAe6D83eA3d173B272c904
contract CompoundOracleInterface {
    // returns asset:eth -- to get USDC:eth, have to do 10**24/result,

    /**
  * @notice retrieves price of an asset
  * @dev function to get price for an asset
  * @param asset Asset for which to get the price
  * @return uint mantissa of asset price (scaled by 1e18) or zero if unset or contract paused
  */
    function getPrice(address asset) public view returns (uint);

}

// File: contracts/UniswapExchangeInterface.sol

pragma solidity 0.5.10;


// Solidity Interface
contract UniswapExchangeInterface {
    // Address of ERC20 token sold on this exchange
    function tokenAddress() external view returns (address token);
    // Address of Uniswap Factory
    function factoryAddress() external view returns (address factory);
    // Provide Liquidity
    function addLiquidity(uint256 min_liquidity, uint256 max_tokens, uint256 deadline) external payable returns (uint256);
    function removeLiquidity(uint256 amount, uint256 min_eth, uint256 min_tokens, uint256 deadline) external returns (uint256, uint256);
    // Get Prices
    function getEthToTokenInputPrice(uint256 eth_sold) external view returns (uint256 tokens_bought);
    function getEthToTokenOutputPrice(uint256 tokens_bought) external view returns (uint256 eth_sold);
    function getTokenToEthInputPrice(uint256 tokens_sold) external view returns (uint256 eth_bought);
    function getTokenToEthOutputPrice(uint256 eth_bought) external view returns (uint256 tokens_sold);
    // Trade ETH to ERC20
    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline) external payable returns (uint256  tokens_bought);
    function ethToTokenTransferInput(uint256 min_tokens, uint256 deadline, address recipient) external payable returns (uint256  tokens_bought);
    function ethToTokenSwapOutput(uint256 tokens_bought, uint256 deadline) external payable returns (uint256  eth_sold);
    function ethToTokenTransferOutput(uint256 tokens_bought, uint256 deadline, address recipient) external payable returns (uint256  eth_sold);
    // Trade ERC20 to ETH
    function tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline) external returns (uint256  eth_bought);
    function tokenToEthTransferInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline, address recipient) external returns (uint256  eth_bought);
    function tokenToEthSwapOutput(uint256 eth_bought, uint256 max_tokens, uint256 deadline) external returns (uint256  tokens_sold);
    function tokenToEthTransferOutput(uint256 eth_bought, uint256 max_tokens, uint256 deadline, address recipient) external returns (uint256  tokens_sold);
    // Trade ERC20 to ERC20
    function tokenToTokenSwapInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address token_addr) external returns (uint256  tokens_bought);
    function tokenToTokenTransferInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address recipient, address token_addr) external returns (uint256  tokens_bought);
    function tokenToTokenSwapOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address token_addr) external returns (uint256  tokens_sold);
    function tokenToTokenTransferOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address recipient, address token_addr) external returns (uint256  tokens_sold);
    // Trade ERC20 to Custom Pool
    function tokenToExchangeSwapInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address exchange_addr) external returns (uint256  tokens_bought);
    function tokenToExchangeTransferInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address recipient, address exchange_addr) external returns (uint256  tokens_bought);
    function tokenToExchangeSwapOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address exchange_addr) external returns (uint256  tokens_sold);
    function tokenToExchangeTransferOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address recipient, address exchange_addr) external returns (uint256  tokens_sold);
    // ERC20 comaptibility for liquidity tokens
    bytes32 public name;
    bytes32 public symbol;
    uint256 public decimals;
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function balanceOf(address _owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    // Never use
    function setup(address token_addr) external;
}

// File: contracts/UniswapFactoryInterface.sol

pragma solidity 0.5.10;


// Solidity Interface
contract UniswapFactoryInterface {
    // Public Variables
    address public exchangeTemplate;
    uint256 public tokenCount;
    // Create Exchange
    function createExchange(address token) external returns (address exchange);
    // Get Exchange and Token Info
    function getExchange(address token) external view returns (address exchange);
    function getToken(address exchange) external view returns (address token);
    function getTokenWithId(uint256 tokenId) external view returns (address token);
    // Never use
    function initializeFactory(address template) external;
}

// File: @openzeppelin/contracts/token/ERC20/IERC20.sol

pragma solidity ^0.5.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see {ERC20Detailed}.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: contracts/OptionsUtils.sol

pragma solidity 0.5.10;





contract OptionsUtils {
    UniswapFactoryInterface constant public UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    CompoundOracleInterface constant COMPOUND_ORACLE = CompoundOracleInterface(
        0x02557a5E05DeFeFFD4cAe6D83eA3d173B272c904
    );

    function getUniswapExchange(address _token) public view returns (UniswapExchangeInterface) {
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
}

// File: contracts/OptionsExchange.sol

pragma solidity 0.5.10;






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
