pragma solidity 0.5.10;

import "./OptionsFactory.sol";
import "./UniswapFactoryInterface.sol";
import "./UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OptionsContract is ERC20 {
    struct Repo {
        uint256 collateral;
        uint256 debt;
        address payable owner;
    }

    UniswapFactoryInterface constant UNISWAP_FACTORY = UniswapFactoryInterface(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    Repo[] repos;

    uint256 totalCollateral; // denominated in collateralType, depending on underlying type need to be able to handle decimal places
    uint256 totalUnderlying; // denominated in underlyingType, depending on underlying type need to be able to handle decimal places
    uint32 penaltyFee; //(need 4 decimal places → egs. 45.55% needs to be storable)
    uint128 numRepos;
    mapping (address => uint256) amtExercised;
    bool optionType; // 1 is American / 0 is European
    uint256 windowSize; // amt of seconds before expiry tht a person has to exercise
    uint256 amtOptionsExercised;

    uint16 public collateralizationRatio = 16; //(need to be able have 1 decimal place)

    IERC20 public collateral;
    UniswapExchangeInterface public collateralExchange;
    IERC20 public underlying;
    uint256 public strikePrice; //depending on underlying type need to be able to handle decimal places
    IERC20 public strikeAsset;
    IERC20 public payout;
    UniswapExchangeInterface public payoutExchange;
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
        if (!isETH(collateral)) {
            UNISWAP_FACTORY.getExchange(address(collateral));
        }
        underlying = _underlying;
        strikePrice = _strikePrice;
        strikeAsset = _strikeAsset;
        payout = _payout;
        expiry = _expiry;
    }

    // function getRepos(address owner) public view returns (uint[] memory);


    function exercise(uint256 _amtToExercise) public {
        // 1. before exercise window: revert
        require(now >= expiry - windowSize, "Too early to exercise");
        require(now < expiry, "Beyond exercise time");


        // 2. during exercise window: exercise


        // 3. after: TBD (but don't allow exercise)

    }

    function isETH(IERC20 _ierc20) public pure returns (bool) {
        return _ierc20 == IERC20(0);
    }

}
