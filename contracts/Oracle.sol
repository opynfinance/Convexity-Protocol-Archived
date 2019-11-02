pragma solidity ^0.5.0;
// AT MAINNET ADDRESS: 0x02557a5E05DeFeFFD4cAe6D83eA3d173B272c904
contract Oracle {
    // returns asset:eth -- to get USDC:eth, have to do 10**24/result
    function assetPrices(address asset) public view returns (uint);
}
