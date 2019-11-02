pragma solidity 0.5.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract OptionsContract {
    IERC20 public collateral;
    IERC20 public underlying;
    uint256 public strikePrice;
    IERC20 public strikeAsset;
    IERC20 public payout;
    uint256 public expiry;

    constructor(
        IERC20 _collateral,
        IERC20 _underlying,
        uint256 _strikePrice,
        IERC20 _strikeAsset,
        IERC20 _payout,
        uint256 _expiry
    )
        public
    {
        collateral = _collateral;
        underlying = _underlying;
        strikePrice = _strikePrice;
        strikeAsset = _strikeAsset;
        payout = _payout;
        expiry = _expiry;
    }

}
