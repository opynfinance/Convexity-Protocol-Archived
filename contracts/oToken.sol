pragma solidity 0.5.10;

import "./OptionsContract.sol";

/**
 * @title Opyn's Options Contract
 * @author Opyn
 */

contract oToken is OptionsContract {

    /**
    * @param _collateral The collateral asset
    * @param _collExp The precision of the collateral (-18 if ETH)
    * @param _underlying The asset that is being protected
    * @param _oTokenExchangeExp The precision of the `amount of underlying` that 1 oToken protects
    * @param _strikePrice The amount of strike asset that will be paid out
    * @param _strikeExp The precision of the strike asset (-18 if ETH)
    * @param _strike The asset in which the insurance is calculated
    * @param _expiry The time at which the insurance expires
    * @param _optionsExchange The contract which interfaces with the exchange + oracle
    * @param _oracleAddress The address of the oracle
    * @param _windowSize UNIX time. Exercise window is from `expiry - _windowSize` to `expiry`.
    */
    constructor(
        IERC20 _collateral,
        int32 _collExp,
        IERC20 _underlying,
        int32 _oTokenExchangeExp,
        uint256 _strikePrice,
        int32 _strikeExp,
        IERC20 _strike,
        uint256 _expiry,
        OptionsExchange _optionsExchange,
        address _oracleAddress,
        uint256 _windowSize

    )
    OptionsContract (
        _collateral,
        _collExp,
        _underlying,
        _oTokenExchangeExp,
        _strikePrice,
        _strikeExp,
        _strike,
        _expiry,
        _optionsExchange,
        _oracleAddress,
        _windowSize
    ) public {
    }

    /**
     * @notice opens a repo, adds ETH collateral, and mints new oTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param receiver address to send the Options to
     * @return repoIndex
     */
    function createETHCollateralOptionNewRepo(uint256 amtToCreate, address receiver) external payable returns (uint256) {
        uint256 repoIndex = openRepo();
        createETHCollateralOption(amtToCreate, repoIndex, receiver);
        return repoIndex;
    }

    /**
     * @notice adds ETH collateral, and mints new oTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param repoIndex index of the repo to add collateral to
     * @param receiver address to send the Options to
     */
    function createETHCollateralOption(uint256 amtToCreate, uint256 repoIndex, address receiver) public payable {
        addETHCollateral(repoIndex);
        issueOTokens(repoIndex, amtToCreate, receiver);
    }

    /**
     * @notice opens a repo, adds ETH collateral, and mints new oTokens in one step
     * @param amtToCreate number of oTokens to create
     * @return repoIndex
     */
    function createAndSellETHCollateralOptionNewRepo(uint256 amtToCreate) external payable returns (uint256) {
        uint256 repoIndex = openRepo();
        createETHCollateralOption(amtToCreate, repoIndex, address(this));
        approve(address(optionsExchange), amtToCreate);
        optionsExchange.sellOTokens(msg.sender, address(this), address(0), amtToCreate);
        return repoIndex;
    }

    /**
     * @notice opens a repo, adds ERC20 collateral, and mints new putTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param amtCollateral amount of collateral added
     * @param receiver address to send the Options to
     * @return repoIndex
     */
    function createERC20CollateralOptionNewRepo(uint256 amtToCreate, uint256 amtCollateral, address receiver) external returns (uint256) {
        uint256 repoIndex = openRepo();
        createERC20CollateralOption(repoIndex, amtToCreate, amtCollateral, receiver);
        return repoIndex;
    }

    /**
     * @notice adds ERC20 collateral, and mints new putTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param amtCollateral amount of collateral added
     * @param repoIndex index of the repo to add collateral to
     * @param receiver address to send the Options to
     */
    function createERC20CollateralOption(uint256 amtToCreate, uint256 amtCollateral, uint256 repoIndex, address receiver) public {
        addERC20Collateral(repoIndex, amtCollateral);
        issueOTokens(repoIndex, amtToCreate, receiver);
    }
}