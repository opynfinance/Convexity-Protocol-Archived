pragma solidity 0.5.10;

contract OptionsExchange {

    function sellPTokens(uint256 _pTokens, address payoutTokenAddress) public {
        // TODO: first need to boot strap the uniswap exchange to get the address. 
        // uniswap transfer input _pTokens to payoutTokens

    }

    function buyPTokens(uint256 _pTokens, address paymentTokenAddress) public payable {
        // uniswap transfer output. This transfer enough paymentToken to get desired pTokens.
    }

    // function tokenToTokenTransferInput(address inputToken, address outputToken, uint256 _amt, address transferTo) public {

    // }

    // function tokenToTokenTransferOutput(address inputToken, address outputToken, uint256 _amt, address transferTo) public {
        
    // }
}