pragma solidity ^0.4.0;

contract Oracle {
    function Oracle(){
        /**
     * @notice Set new oracle, who can set asset prices
     * @dev Admin function to change oracle
     * @param newOracle New oracle address
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setOracle(address newOracle) public returns (uint) {
        // Check caller = admin
    if (msg.sender != admin) {
    return fail(Error.UNAUTHORIZED, FailureInfo.SET_ORACLE_OWNER_CHECK);
    }

        // Verify contract at newOracle address supports assetPrices call.
        // This will revert if it doesn't.
    PriceOracleInterface oracleInterface = PriceOracleInterface(newOracle);
    oracleInterface.assetPrices(address(0));

    address oldOracle = oracle;

        // Store oracle = newOracle
    oracle = newOracle;

    emit NewOracle(oldOracle, newOracle);

    return uint(Error.NO_ERROR);
    }


    }

        /**
             * @dev From Compound: Account allowed to set oracle prices for this contract. Initially set
             *      in constructor, but can be changed by the admin.
       */
        address public oracleEthUSD;

        /**
          * @dev fetches the price of asset from the PriceOracle and converts it to Exp
          * @param asset asset whose price should be fetched
          */
    function fetchAssetPrice(address asset) internal view returns (Error, Exp memory) {
    if (oracle == address(0)) {
    return (Error.ZERO_ORACLE_ADDRESS, Exp({mantissa: 0}));
    }

    PriceOracleInterface oracleInterface = PriceOracleInterface(oracle);
    uint priceMantissa = oracleInterface.assetPrices(asset);

    return (Error.NO_ERROR, Exp({mantissa: priceMantissa}));
    }


        /**
       * @dev Gets the amount of the specified asset given the specified Eth value
       *      ethValue / oraclePrice = assetAmountWei
       *      If there's no oraclePrice, this returns (Error.DIVISION_BY_ZERO, 0)
       */
    function getAssetAmountForValue(address asset, Exp ethValue) internal view returns (Error, uint) {
    Error err;
    Exp memory assetPrice;
    Exp memory assetAmount;

    (err, assetPrice) = fetchAssetPrice(asset);
    if (err != Error.NO_ERROR) {
    return (err, 0);
    }

    (err, assetAmount) = divExp(ethValue, assetPrice);
    if (err != Error.NO_ERROR) {
    return (err, 0);
    }

    return (Error.NO_ERROR, truncate(assetAmount));
    }

        // provide address to oracle
        // oracle_ - address of the oracle contract
    function setOracle(address oracle_) external {
    require(msg.sender == owner);
    oracle = oracle_;
    }

        // get oracle value
    function peek() public view returns (uint r){
    Oracle _oracle = Oracle(oracle);
    r = _oracle.read();
    }
}
