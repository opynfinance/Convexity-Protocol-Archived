pragma solidity 0.5.10;

import "./OptionsUtils.sol";
import "./UniswapExchangeInterface.sol";
import "./UniswapFactoryInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OptionsUtils {
    UniswapFactoryInterface constant public UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
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
