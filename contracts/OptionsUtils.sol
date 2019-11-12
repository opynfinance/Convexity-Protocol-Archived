pragma solidity 0.5.10;

import "./CompoundOracleInterface.sol";
import "./UniswapExchangeInterface.sol";
import "./UniswapFactoryInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OptionsUtils {
    // defauls are for mainnet
    UniswapFactoryInterface public UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    CompoundOracleInterface public COMPOUND_ORACLE = CompoundOracleInterface(
        0x02557a5E05DeFeFFD4cAe6D83eA3d173B272c904
    );

    // TODO: accept this in constructor and remove the setter method.
    // constructor(address _uniswapFactory, address _compoundOracle) public {
    //     UNISWAP_FACTORY =  UniswapFactoryInterface(_uniswapFactory);
    //     COMPOUND_ORACLE = CompoundOracleInterface(_compoundOracle);
    // }
    constructor () public {
    }

// TODO: for now gets Uniswap, later update to get other exchanges
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
}
