pragma solidity 0.5.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./OptionsFactory.sol";

contract OptionsContract is ERC20 {
    struct Repo {
        uint256 collateral;
        uint256 debt;
        address payable owner;
    }

    Repo[] repos;

    uint256 constant strikePrice; //depending on underlying type need to be able to handle decimal places
    uint256 constant totalCollateral; // denominated in collateralType, depending on underlying type need to be able to handle decimal places
    uint256 constant totalUnderlying; // denominated in underlyingType, depending on underlying type need to be able to handle decimal places
    uint32 constant penaltyFee; //(need 4 decimal places → egs. 45.55% needs to be storable)
    uint128 constant numRepos;
    mapping (address exerciser => uint256 amtExercised) amtExercised
    bool constant optionType: // 1 is American / 0 is European
    uint256 constant windowSize // amt of seconds before expiry tht a person has to exercise
    uint256 amtOptionsExercised??!!

    uint16 collateralizationRatio public = 1.6; //(need to be able have 1 decimal place)

    IERC20 public collateral;
    IERC20 public underlying;
    uint256 public strikePrice;
    IERC20 public strikeAsset;
    IERC20 public payout;
    uint256 public constant expiry;

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

    getRepos(address owner) public view returns uint[]

    isEthCollateral () publc view returns bool {
        return !collateralType;
    }



}
