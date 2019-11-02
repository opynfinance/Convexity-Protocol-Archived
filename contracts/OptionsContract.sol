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

    function getReposByOwner(address owner) public view returns (uint[] memory) {
        //how to write this in a gas efficient way lol
    }

    function getRepos() public view returns (uint[] memory) {
        //how to write this in a gas efficient way lol
        return repos;
    }

    function getReposByIndex(uint256 repoIndex) public view returns (Repo) {
        return repos[repoIndex];
    }

    function isEthCollateral() public view returns (bool) {
        return collateral == IERC20(0);
    }

    function openRepo() public returns (uint) {
        uint repoIndex = repos.push(Repo(0, 0, msg.sender)) - 1 ; //the length
        return repoIndex;
    }

    function addETHCollateral(uint256 repoIndex) payable {
        require(isEthCollateral());
        repos[repoIndex].collateral += msg.value;
        return;
    }

    function addERC20Collateral (uint256 repoIndex, uint256 amtCollateral) {
        require(!isEthCollateral());
        return;
    }

    function issueOptionTokens (uint256 repoIndex, uint256 numTokens) {
        //check that we're properly collateralized to mint this number, then call _mint(address account, uint256 amount)
        return;
    }

    function burnPutTokens(uint256 repoIndex, uint256 amtToBurn) {
        _burn(amtToBurn);
        repos[repoIndex].putsOutstanding -= amtToBurn;
    }

    function transferRepoOwnership(uint256 repoIndex, address newOwner) {
        require(repos[repoIndex].owner == msg.sender, "Cannot transferRepoOwnership as non owner");
        repos[repoIndex].owner = newOwner;
    }

    function exercise(uint256 amtToExercise) {
        //how does this work with phyiscal settlement tho
    }

    function removeCollateral(uint256 repoIndex, uint256 amtToRemove) {
        //check that we are well collateralized enough to remove this amount of collateral
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
