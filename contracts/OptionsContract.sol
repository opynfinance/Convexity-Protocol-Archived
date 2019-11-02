pragma solidity 0.5.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./OptionsFactory.sol";

contract OptionsContract is ERC20 {
    struct Repo {
        uint256 collateral;
        uint256 putsOutstanding;
        address payable owner;
    }

    Repo[] repos;

    uint256 totalCollateral; // denominated in collateralType, depending on underlying type need to be able to handle decimal places
    uint256 totalUnderlying; // denominated in underlyingType, depending on underlying type need to be able to handle decimal places
    uint32 penaltyFee; //(need 4 decimal places → egs. 45.55% needs to be storable)
    uint128 numRepos;
    mapping (address => uint256) amtExercised;
    bool optionType; // 1 is American / 0 is European
    uint256 windowSize; // amt of seconds before expiry tht a person has to exercise
    uint256 amtOptionsExercised;

    uint16 public collateralizationRatio = 1.6; //(need to be able have 1 decimal place)

    IERC20 public collateral;
    IERC20 public underlying;
    uint256 public strikePrice; //depending on underlying type need to be able to handle decimal places
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

    function getRepos(address owner) public view returns (uint[] memory) {
        return repos;
    }

    function isEthCollateral() public view returns (bool) {
        return collateral == IERC20(0);
    }

    function openRepo() public returns (uint) {
        uint repoIndex = repos.push(Repo(0, 0, msg.sender)) - 1 ; //the length
        return repoIndex;
    }

    function addERC20Collateral (amtCollateral, repoNum) {
        return;
    }


    function addETHCollateral(repoNum) payable {
        return;
    }

    function mint(msg.sender, numtokens) public  {
        return;
    }

    function issueOptionTokens (repoNum, numTokens) {

    }





}
