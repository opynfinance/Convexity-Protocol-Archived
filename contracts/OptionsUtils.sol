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
