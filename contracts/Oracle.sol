pragma solidity 0.5.10;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./lib/CompoundOracleInterface.sol";
import "./lib/CTokenInterface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Oracle {
    using SafeMath for uint256;

    mapping(address => bool) isCToken;
    mapping(address => address) assetToCTokens;
    address cETH;

    // The Oracle used for the contract
    CompoundOracleInterface public PriceOracle;
    constructor(address _oracleAddress) public {
        PriceOracle = CompoundOracleInterface(_oracleAddress);
        // TODO: change these addresses for mainnet
        isCToken[0xEBf1A11532b93a529b5bC942B4bAA98647913002] = true;
        isCToken[0x6D7F0754FFeb405d23C51CE938289d4835bE3b14] = true;
        isCToken[0xd6801a1DfFCd0a410336Ef88DeF4320D6DF1883e] = true;
        isCToken[0xEBe09eB3411D18F4FF8D859e096C533CAC5c6B60] = true;
        isCToken[0x5B281A6DdA0B271e91ae35DE655Ad301C976edb1] = true;
        isCToken[0x0014F450B8Ae7708593F4A46F8fa6E5D50620F96] = true;
        isCToken[0x52201ff1720134bBbBB2f6BC97Bf3715490EC19B] = true;

        cETH = 0xd6801a1DfFCd0a410336Ef88DeF4320D6DF1883e;

        assetToCTokens[0xbF7A7169562078c96f0eC1A8aFD6aE50f12e5A99] = 0xEBf1A11532b93a529b5bC942B4bAA98647913002;
        assetToCTokens[0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa] = 0x6D7F0754FFeb405d23C51CE938289d4835bE3b14;
        assetToCTokens[0x6e894660985207feb7cf89Faf048998c71E8EE89] = 0xEBe09eB3411D18F4FF8D859e096C533CAC5c6B60;
        assetToCTokens[0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b] = 0x5B281A6DdA0B271e91ae35DE655Ad301C976edb1;
        assetToCTokens[0x577D296678535e4903D59A4C929B718e1D575e0A] = 0x0014F450B8Ae7708593F4A46F8fa6E5D50620F96;
        assetToCTokens[0xddea378A6dDC8AfeC82C36E9b0078826bf9e68B6] = 0x52201ff1720134bBbBB2f6BC97Bf3715490EC19B;
    }

    function getPrice(address asset) public view returns (uint256) {
        if (asset == address(0)) {
            return (10**18);
        } else {
            if (isCToken[asset]) {
                // 1. cTokens
                CTokenInterface cToken = CTokenInterface(asset);
                uint256 exchangeRate = cToken.exchangeRateStored();

                if (asset == cETH) {
                    uint256 numerator = 10**46;
                    return numerator.div(exchangeRate);
                }

                address underlyingAddress = cToken.underlying();
                uint256 decimalsOfUnderlying = ERC20Detailed(underlyingAddress)
                    .decimals();
                uint256 maxExponent = 10;
                uint256 exponent = maxExponent.add(decimalsOfUnderlying);

                // cTokenPriceInETH = underlying price in ETH * (cToken : underlying exchange rate)
                return
                    getPriceUnderlying(underlyingAddress).mul(exchangeRate).div(
                        10**exponent
                    );

            } else if (assetToCTokens[asset] != address(0)) {
                //2. Underlying Tokens that Compound lists
                return getPriceUnderlying(asset);
            }
            return 0;
        }
    }

    function getPriceUnderlying(address asset) internal view returns (uint256) {
        uint256 EthToAssetPrice = PriceOracle.getUnderlyingPrice(
            ERC20(assetToCTokens[asset])
        );
        uint256 decimalsOfAsset = ERC20Detailed(asset).decimals();
        uint256 maxExponent = 18;
        uint256 exponent = maxExponent.sub(decimalsOfAsset);
        return EthToAssetPrice.div(10**exponent);
    }
}
