pragma solidity 0.5.10;

import "./lib/CompoundOracleInterface.sol";
import "./OptionsUtils.sol";
import "./lib/UniswapFactoryInterface.sol";
import "./lib/UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract OptionsExchange {

    uint256 constant LARGE_BLOCK_SIZE = 1651753129000;

    UniswapFactoryInterface public UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    constructor (address _uniswapFactory) public {
        UNISWAP_FACTORY = UniswapFactoryInterface(_uniswapFactory);
    }

    /**
    * @notice This function sells oTokens on Uniswap and sends back payoutTokens to the receiver
    * @param receiver The address to send the payout tokens back to
    * @param oTokenAddress The address of the oToken to sell
    * @param payoutTokenAddress The address of the token to receive the premiums in
    * @param oTokensToSell The number of oTokens to sell
    */
    function sellOTokens(address payable receiver, address oTokenAddress, address payoutTokenAddress, uint256 oTokensToSell) public {
        // @note: first need to bootstrap the uniswap exchange to get the address.
        IERC20 oToken = IERC20(oTokenAddress);
        IERC20 payoutToken = IERC20(payoutTokenAddress);
        oToken.transferFrom(msg.sender, address(this), oTokensToSell);
        uniswapSellOToken(oToken, payoutToken, oTokensToSell, receiver);
    }

    // function premiumReceived(
    //     address payable receiver,
    //     address oTokenAddress,
    //     address payoutTokenAddress,
    //     uint256 oTokensToSell)
    //     public view returns (uint256) {
    //     UniswapExchangeInterface oTokenExchange = getExchange(oTokenAddress);
    //     uint256 ETHToTokenPrice = oTokenExchange.getTokenToEthInputPrice()

    // }

    /**
    * @notice This function buys oTokens on Uniswap and using paymentTokens from the receiver
    * @param receiver The address to send the oTokens back to
    * @param oTokenAddress The address of the oToken to buy
    * @param oTokensToBuy The number of oTokens to buy
    * @param paymentTokenAddress The address of the token to pay the premiums in
    */
    function buyOTokens(address payable receiver, address oTokenAddress, uint256 oTokensToBuy, address paymentTokenAddress) public payable {
        IERC20 oToken = IERC20(oTokenAddress);
        IERC20 paymentToken = IERC20(paymentTokenAddress);
        uniswapBuyOToken(paymentToken, oToken, oTokensToBuy, receiver);
    }

    function premiumToPay(address oTokenAddress, uint256 oTokensToBuy, address paymentTokenAddress) public view returns (uint256) {
        UniswapExchangeInterface oTokenExchange = getExchange(oTokenAddress);
        uint256 EthToOTokenPrice = oTokenExchange.getEthToTokenOutputPrice(oTokensToBuy);

        if(!isETH(IERC20(paymentTokenAddress))) {
            UniswapExchangeInterface paymentTokenExchange = getExchange(paymentTokenAddress);
            return paymentTokenExchange.getTokenToEthOutputPrice(EthToOTokenPrice);
        }

        return EthToOTokenPrice;
    }

    function uniswapSellOToken(
        IERC20 oToken,
        IERC20 payoutToken,
        uint256 _amt,
        address payable _transferTo
    )
        internal
        returns (uint256)
    {
        require(!isETH(oToken), "Can only sell oTokens");
        UniswapExchangeInterface exchange = getExchange(address(oToken));

        if(isETH(payoutToken)) {
            //Token to ETH
            oToken.approve(address(exchange), _amt);
            return exchange.tokenToEthTransferInput(_amt, 1, LARGE_BLOCK_SIZE, _transferTo);
        } else {
            //Token to Token
            oToken.approve(address(exchange), _amt);
            return exchange.tokenToTokenTransferInput(
                _amt,
                1,
                1,
                LARGE_BLOCK_SIZE,
                _transferTo,
                address(payoutToken)
            );
        }
    }

     function uniswapBuyOToken(
            IERC20 paymentToken,
            IERC20 oToken,
            uint256 _amt,
            address payable _transferTo
        )
            public
            returns (uint256)
    {
        require(!isETH(oToken), "Can only buy oTokens");

        if (!isETH(paymentToken)) {
            UniswapExchangeInterface exchange = getExchange(address(paymentToken));

            uint256 premiumToPay = premiumToPay(address(oToken), _amt, address(paymentToken));
            paymentToken.transferFrom(msg.sender, address(this), premiumToPay);

            // Token to Token
            paymentToken.approve(address(exchange), 10 ** 30);
            return exchange.tokenToTokenTransferInput(
                    premiumToPay,
                    1,
                    1,
                    LARGE_BLOCK_SIZE,
                    _transferTo,
                    address(oToken)
            );
        } else {
            // ETH to Token
            UniswapExchangeInterface exchange = UniswapExchangeInterface(
                UNISWAP_FACTORY.getExchange(address(oToken))
            );

            uint256 ethToTransfer = exchange.getEthToTokenOutputPrice(_amt);
            return exchange.ethToTokenTransferOutput.value(ethToTransfer)(
                _amt,
                LARGE_BLOCK_SIZE,
                _transferTo
            );
        }
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
