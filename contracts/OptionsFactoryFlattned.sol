
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
    // defauls are for mainnet
    UniswapFactoryInterface public UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    CompoundOracleInterface public COMPOUND_ORACLE = CompoundOracleInterface(
        0x02557a5E05DeFeFFD4cAe6D83eA3d173B272c904
    );

    constructor(UniswapFactoryInterface _uniswapFactory, CompoundOracleInterface _compoundOracle) public {
        UNISWAP_FACTORY = _uniswapFactory;
        COMPOUND_ORACLE = _compoundOracle;
    }

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

    constructor(UniswapFactoryInterface _uniswapFactory, CompoundOracleInterface _compoundOracle) OptionsUtils(_uniswapFactory, _compoundOracle) public {

    }

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

// File: @openzeppelin/contracts/GSN/Context.sol

pragma solidity ^0.5.0;

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
contract Context {
    // Empty internal constructor, to prevent people from mistakenly deploying
    // an instance of this contract, which should be used via inheritance.
    constructor () internal { }
    // solhint-disable-previous-line no-empty-blocks

    function _msgSender() internal view returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

// File: @openzeppelin/contracts/math/SafeMath.sol

pragma solidity ^0.5.0;

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     *
     * _Available since v2.4.0._
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

// File: @openzeppelin/contracts/token/ERC20/ERC20.sol

pragma solidity ^0.5.0;




/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20Mintable}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin guidelines: functions revert instead
 * of returning `false` on failure. This behavior is nonetheless conventional
 * and does not conflict with the expectations of ERC20 applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ERC20 is Context, IERC20 {
    using SafeMath for uint256;

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private _totalSupply;

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20};
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for `sender`'s tokens of at least
     * `amount`.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

     /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner`s tokens.
     *
     * This is internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`.`amount` is then deducted
     * from the caller's allowance.
     *
     * See {_burn} and {_approve}.
     */
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(account, _msgSender(), _allowances[account][_msgSender()].sub(amount, "ERC20: burn amount exceeds allowance"));
    }
}

// File: contracts/OptionsContract.sol

pragma solidity 0.5.10;









contract OptionsContract is OptionsUtils, ERC20 {
    using SafeMath for uint256;
    struct Repo {
        uint256 collateral;
        uint256 putsOutstanding;
        address payable owner;
    }

    OptionsExchange public optionsExchange;

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
        uint256 _expiry,
        OptionsExchange _optionsExchange
    )
        OptionsUtils(
            _optionsExchange.UNISWAP_FACTORY(), _optionsExchange.COMPOUND_ORACLE()
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
        optionsExchange = _optionsExchange;
    }

    event RepoOpened(uint256 repoIndex);

    function openRepo() public returns (uint) {
        require(now < expiry, "Options contract expired");
        repos.push(Repo(0, 0, msg.sender));
        uint256 repoIndex = repos.length - 1;
        emit RepoOpened(repoIndex);
        return repoIndex;
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
        totalUnderlying = totalUnderlying.add(_pTokens);
        /// 2.3 transfer in pTokens
        _burnFrom(msg.sender, _pTokens);

        /// 2.4 sell enough collateral to get strikePrice * pTokens number of payoutTokens

        /// 2.4.0 first sell from the strikeAsset pool
        uint256 amtOwed = strikePrice.mul(_pTokens);
        /// 2.4.0.1. strikeAssetPool is big enough
        if (totalStrikePool >= amtOwed) {
            totalStrikePool = totalStrikePool.sub(amtOwed);

            if(strikeAsset != payout) {
                optionsExchange.exchangeAndTransferInput(strikeAsset, payout, amtOwed, msg.sender);
            } else {
                transferCollateral(msg.sender, amtOwed);
            }
        }
        // 2.4.0.2 strikeAsset + normal pool
        else {

            _pTokens = _pTokens.sub((totalStrikePool.div(strikePrice)));

            if(strikeAsset != payout) {
                optionsExchange.exchangeAndTransferInput(strikeAsset, payout, totalStrikePool, msg.sender);
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
            optionsExchange.exchangeAndTransferInput(collateral, payout, amtToSend, msg.sender);
            totalExercised = totalExercised.add(amtToSend);
        }
        /* 2.4.3 if collateral != strike = payout. uniswap transfer output. This transfers in as much
        collateral as will get you strikePrice * payout payoutTokens. */
        else if (collateral != strikeAsset && strikeAsset == payout) {
            uint256 amtToPayout = strikePrice.mul(_pTokens);
            uint256 amtSent = optionsExchange.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
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
            uint256 amtSent = optionsExchange.exchangeAndTransferOutput(collateral, payout, amtToPayout, msg.sender);
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
        uint256 collateralToStrikePrice = ethToCollateralPrice / ethToStrikePrice;
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
    function createOptionETHCollateral(uint256 amtToCreate, uint256 repoIndex) public payable {
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
        if(now < expiry) {
            // check that we are well collateralized enough to remove this amount of collateral
            Repo storage repo = repos[repoIndex];
            require(msg.sender == repo.owner, "Only owner can remove collateral");
            require(amtToRemove <= repo.collateral, "Can't remove more collateral than owned");
            uint256 newRepoCollateralAmt = repo.collateral.sub(amtToRemove);
             // TODO: get the price from Oracle
            uint256 collateralToStrikePrice = 1;
            require(repo.putsOutstanding.mul(collateralizationRatio).mul(strikePrice) <=
                     newRepoCollateralAmt.mul(collateralToStrikePrice), "Repo is unsafe");
            repo.collateral = newRepoCollateralAmt;
            transferCollateral(msg.sender, amtToRemove);
            totalCollateral = totalCollateral.sub(amtToRemove);

        } else {
            // pay out people proportional
            Repo storage repo = repos[repoIndex];
            uint256 collateralToTransfer = repo.collateral.div(totalCollateral);
            uint256 underlyingToTransfer = repo.collateral.div(totalUnderlying);
            transferCollateral(msg.sender, collateralToTransfer);
            transferUnderlying(msg.sender, underlyingToTransfer);
            repo.collateral = 0;
        }
    }

    // TODO: look at compound docs and improve how it is built
    function liquidate(uint256 repoNum) public {
        require(now < expiry, "Options contract expired");

       // TODO: get price from Oracle
        uint256 collateralToStrikePrice = 1;
        Repo storage repo = repos[repoNum];

        require(repo.putsOutstanding.mul(collateralizationRatio).mul(strikePrice) > repo.collateral.mul(collateralToStrikePrice), "Repo is safe");

        // determine how much collateral has to be deducted
        uint256 debtOwed = strikePrice.mul(repo.putsOutstanding);
        uint256 collateralTaken = optionsExchange.exchangeAndTransferOutput(collateral, strikeAsset, debtOwed, address(this));
        totalStrikePool = totalStrikePool.add(debtOwed);
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

    function transferUnderlying(address payable _addr, uint256 _amt) internal {
        if (isETH(underlying)){
            msg.sender.transfer(_amt);
        } else {
            underlying.transfer(msg.sender, _amt);
        }
    }

    function getPrice(address asset) internal view returns (uint256) {
        return COMPOUND_ORACLE.getPrice(asset);
    }

    function() external payable {
        // to get ether from uniswap exchanges
    }
}

// File: contracts/StringComparator.sol

pragma solidity 0.5.10;

library StringComparator {
    function compareStrings (string memory a, string memory b) public pure
       returns (bool) {
        return keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b)));
    }
}

// File: @openzeppelin/contracts/ownership/Ownable.sol

pragma solidity ^0.5.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () internal {
        _owner = _msgSender();
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return _msgSender() == _owner;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// File: contracts/OptionsFactory.sol

pragma solidity 0.5.10;






contract OptionsFactory is Ownable {
    using StringComparator for string;

    // keys saved in front-end -- look at the docs if needed
    mapping (string => IERC20) public tokens;

    OptionsExchange public optionsExchange;

    event ContractCreated(address addr);
    event AssetAdded(string indexed asset, address indexed addr);
    event AssetChanged(string indexed asset, address indexed addr);
    event AssetDeleted(string indexed asset);

    constructor(OptionsExchange _optionsExchange) public {
        optionsExchange = _optionsExchange;
    }

    function createOptionsContract(
        string memory _collateralType,
        string memory _underlyingType,
        uint256 _strikePrice,
        string memory _strikeAsset,
        string memory _payoutType,
        uint256 _expiry
    )
        public
        returns (address)
    {
        require(supportsAsset(_collateralType), "Collateral type not supported");
        require(supportsAsset(_underlyingType), "Underlying type not supported");
        require(supportsAsset(_strikeAsset), "Strike asset type not supported");
        require(supportsAsset(_payoutType), "Payout type not supported");

        OptionsContract optionsContract = new OptionsContract(
            tokens[_collateralType],
            tokens[_underlyingType],
            _strikePrice,
            tokens[_strikeAsset],
            tokens[_payoutType],
            _expiry,
            optionsExchange
        );

        emit ContractCreated(address(optionsContract));
        return address(optionsContract);
    }

    function addAsset(string memory _asset, address _addr) public onlyOwner {
        require(tokens[_asset] == IERC20(0), "Asset already added");
        require(_addr != address(0), "Cannot set to address(0)");

        tokens[_asset] = IERC20(_addr);
        emit AssetAdded(_asset, _addr);
    }

    function changeAsset(string memory _asset, address _addr) public onlyOwner {
        require(tokens[_asset] != IERC20(0), "Trying to replace a non-existent asset");
        require(_addr != address(0), "Cannot set to address(0)");

        tokens[_asset] = IERC20(_addr);
        emit AssetChanged(_asset, _addr);
    }

    function deleteAsset(string memory _asset) public onlyOwner {
        require(tokens[_asset] != IERC20(0), "Trying to delete a non-existent asset");

        tokens[_asset] = IERC20(0);
        emit AssetDeleted(_asset);
    }

    function supportsAsset(string memory _collateralType) public view returns (bool) {
        if (_collateralType.compareStrings("ETH")) {
            return true;
        }

        return tokens[_collateralType] != IERC20(0);
    }
}
