pragma solidity 0.5.10;

import "./lib/CompoundOracleInterface.sol";
import "./OptionsExchange.sol";
import "./OptionsUtils.sol";
import "./lib/UniswapFactoryInterface.sol";
import "./lib/UniswapExchangeInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Opyn's Options Contract
 * @author Opyn
 */
contract OptionsContract is Ownable, ERC20 {
    using SafeMath for uint256;

    struct Number {
        uint256 value;
        int32 exponent;
    }

    // Keeps track of the weighted collateral and weighted debt for each vault.
    struct Vault {
        uint256 weightedCollateral;
        uint256 weightedOTokens;
        address payable owner;
    }

    OptionsExchange public optionsExchange;

    Vault[] public vaults;

    // 10 is 0.01 i.e. 1% incentive.
    Number liquidationIncentive = Number(10, -3);


    // 100 is egs. 0.1 i.e. 10%.
    Number transactionFee = Number(0, -3);

    /* 500 is 0.5. Max amount that a Vault can be liquidated by i.e.
    max collateral that can be taken in one function call */
    Number liquidationFactor = Number(500, -3);

    /* 1054 is 1.054 i.e. 5.4% liqFee.
    The fees paid to our protocol every time a liquidation happens */
    Number liquidationFee = Number(0, -3);

    /* 16 means 1.6. The minimum ratio of a Vault's collateral to insurance promised.
    The ratio is calculated as below:
    vault.weightedCollateral / (Vault.weightedOTokens * strikePrice) */
    Number public collateralizationRatio = Number(16, -1);

    // The amount of insurance promised per oToken
    Number public strikePrice;

    // The amount of underlying that 1 oToken protects.
    Number public oTokenExchangeRate = Number(1, -18);

    /* UNIX time.
    Exercise period starts at `(expiry - windowSize)` and ends at `expiry` */
    uint256 windowSize;

    /* The amount of collateral that 1 weightedCollateral in a vault gives you. Scaled by a factor of 10^18 */
    uint256 collateralWeight = 10**18;

    /* The amount of oTokens that 1 weightedOToken in a vault gives you. Scaled by a factor of 10^18 */
    uint256 oTokenWeight = 10**18;

    /* The total fees accumulated in the contract any time liquidate or exercise is called */
    uint256 totalFee;

    /* The total amount of underlying that is added to the contract during the exercise window.
    This number can only increase and is only incremented in the exercise function. After expiry,
    this value is used to calculate the proportion of underlying paid out to the respective Vault
    owners in the claim collateral function */
    uint256 totalUnderlying;

    /* The totalCollateral is the collateral balance of the options contract on the first call to claimCollateral.
    (before repo owners start taking out their share of collateral). This value is used as the denominator in
    calculating the proportions of underlying that has to be paid out to the repo owners. */
    uint256 totalCollateral;

    // The time of expiry of the options contract
    uint256 public expiry;

    // The precision of the collateral
    int32 collateralExp = -18;

    // The collateral asset
    IERC20 public collateral;

    // The asset being protected by the insurance
    IERC20 public underlying;


    // The asset in which insurance is denominated in.
    IERC20 public strike;

    // The Oracle used for the contract
    CompoundOracleInterface public COMPOUND_ORACLE;

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
        public
    {
        collateral = _collateral;
        collateralExp = _collExp;

        underlying = _underlying;
        oTokenExchangeRate = Number(1, _oTokenExchangeExp);

        strikePrice = Number(_strikePrice, _strikeExp);
        strike = _strike;

        expiry = _expiry;
        COMPOUND_ORACLE = CompoundOracleInterface(_oracleAddress);
        optionsExchange = _optionsExchange;
        windowSize = _windowSize;
    }

    /*** Events ***/
    event VaultOpened(uint256 vaultIndex, address vaultOwner);
    event ETHCollateralAdded(uint256 vaultIndex, uint256 amount, address payer);
    event ERC20CollateralAdded(uint256 vaultIndex, uint256 amount, address payer);
    event IssuedOTokens(address issuedTo, uint256 oTokensIssued, uint256 vaultIndex);
    event Liquidate (uint256 amtCollateralToPay, uint256 vaultIndex, address liquidator);
    event Exercise (uint256 amtUnderlyingToPay, uint256 amtCollateralToPay, address exerciser);
    event ClaimedCollateral(uint256 amtCollateralClaimed, uint256 amtUnderlyingClaimed, uint256 vaultIndex, address vaultOwner);
    event BurnOTokens (uint256 vaultIndex, uint256 oTokensBurned);
    event TransferVaultOwnership (uint256 VaultIndex, address oldOwner, address payable newOwner);
    event RemoveCollateral (uint256 vaultIndex, uint256 amtRemoved, address vaultOwner);

    /**
     * @notice Can only be called by owner. Used to update the fees, minCollateralizationRatio, etc
     * @param _liquidationIncentive The incentive paid to liquidator. 10 is 0.01 i.e. 1% incentive.
     * @param _liquidationFactor Max amount that a Vault can be liquidated by. 500 is 0.5.
     * @param _liquidationFee The fees paid to our protocol every time a liquidation happens. 1054 is 1.054 i.e. 5.4% liqFee.
     * @param _transactionFee The fees paid to our protocol every time a execution happens. 100 is egs. 0.1 i.e. 10%.
     * @param _collateralizationRatio The minimum ratio of a Vault's collateral to insurance promised. 16 means 1.6.
     */
    function updateParameters(
        uint256 _liquidationIncentive,
        uint256 _liquidationFactor,
        uint256 _liquidationFee,
        uint256 _transactionFee,
        uint256 _collateralizationRatio)
        public onlyOwner {
            liquidationIncentive.value = _liquidationIncentive;
            liquidationFactor.value = _liquidationFactor;
            liquidationFee.value = _liquidationFee;
            transactionFee.value = _transactionFee;
            collateralizationRatio.value = _collateralizationRatio;
    }

    /**
     * @notice Can only be called by owner. Used to take out the protocol fees from the contract.
     * @param _address The address to send the fee to.
     */
    function transferFee(address payable _address) public onlyOwner {
        uint256 fees = totalFee;
        totalFee = 0;
        transferCollateral(_address, fees);
    }

    /**
     * @notice Returns the number of Vaults in the options contract.
     */
    function numVaults() public returns (uint256) {
        return vaults.length;
    }

    /**
     * @notice Creates a new empty Vault and sets the owner of the Vault to be the msg.sender.
     */
    function openVault() public returns (uint) {
        require(block.timestamp < expiry, "Options contract expired");
        vaults.push(Vault(0, 0, msg.sender));
        uint256 VaultIndex = vaults.length - 1;
        emit VaultOpened(VaultIndex, msg.sender);
        return VaultIndex;
    }

    /**
     * @notice If the collateral type is ETH, anyone can call this function any time before
     * expiry to increase the amount of collateral in a Vault. Will fail if ETH is not the
     * collateral asset.
     * @param vaultIndex the index of the Vault to which collateral will be added.
     */
    function addETHCollateral(uint256 vaultIndex) public payable returns (uint256) {
        require(isETH(collateral), "ETH is not the specified collateral type");
        emit ETHCollateralAdded(vaultIndex, msg.value, msg.sender);
        return _addCollateral(vaultIndex, msg.value);
    }

    /**
     * @notice If the collateral type is any ERC20, anyone can call this function any time before
     * expiry to increase the amount of collateral in a Vault. Can only transfer in the collateral asset.
     * Will fail if ETH is the collateral asset.
     * @param vaultIndex the index of the Vault to which collateral will be added.
     * @param amt the amount of collateral to be transferred in.
     */
    function addERC20Collateral(uint256 vaultIndex, uint256 amt) public returns (uint256) {
        require(
            collateral.transferFrom(msg.sender, address(this), amt),
            "Could not transfer in collateral tokens"
        );

        emit ERC20CollateralAdded(vaultIndex, amt, msg.sender);
        return _addCollateral(vaultIndex, amt);
    }

    /**
     * @notice Called by anyone holding the oTokens and equal amount of underlying during the
     * exercise window i.e. from `expiry - windowSize` time to `expiry` time. The caller
     * transfers in their oTokens and corresponding amount of underlying and gets
     * `strikePrice * oTokens` amount of collateral out. The collateral paid out is taken from
     * all Vault holders. At the end of the expiry window, Vault holders can redeem their proportional
     * share of collateral based on how much collateral is left after all exercise calls have been made.
     * @param _oTokens the number of oTokens being exercised.
     * @dev oTokenExchangeRate is the number of underlying tokens that 1 oToken protects.
     */
    function exercise(uint256 _oTokens) public payable {
        // 1. before exercise window: revert
        require(block.timestamp >= expiry - windowSize, "Too early to exercise");
        require(block.timestamp < expiry, "Beyond exercise time");

        // 2. during exercise window: exercise
        // 2.1 ensure person calling has enough pTokens
        require(balanceOf(msg.sender) >= _oTokens, "Not enough pTokens");

        // 2.2 check they have corresponding number of underlying (and transfer in)
        uint256 amtUnderlyingToPay = _oTokens.mul(10 ** underlyingExp());
        if (isETH(underlying)) {
            require(msg.value == amtUnderlyingToPay, "Incorrect msg.value");
        } else {
            require(
                underlying.transferFrom(msg.sender, address(this), amtUnderlyingToPay),
                "Could not transfer in tokens"
            );
        }

        totalUnderlying = totalUnderlying.add(amtUnderlyingToPay);

        // 2.3 payout enough collateral to get (strikePrice * pTokens  + fees) amount of collateral
        uint256 amtCollateralToPay = calculateCollateralToPay(_oTokens, Number(1, 0));

        // 2.4 Fees
        uint256 amtFee = calculateCollateralToPay(_oTokens, transactionFee);
        totalFee = totalFee.add(amtFee);

        // 2.5 Calculate the oToken weight and collateral weight.
        uint256 totalCollateral = address(this).balance;
        uint256 collateralToDeduct = amtCollateralToPay.add(amtFee);
        collateralWeight = collateralWeight.mul(totalCollateral.sub(collateralToDeduct)).div(totalCollateral);
        uint256 oTokenSupply = totalSupply();
        oTokenWeight = oTokenWeight.mul(oTokenSupply.sub(_oTokens)).div(oTokenSupply);

        // 2.6 transfer in oTokens
        _burn(msg.sender, _oTokens);

        // 2.7 Pay out collateral
        transferCollateral(msg.sender, amtCollateralToPay);

        emit Exercise(amtUnderlyingToPay, amtCollateralToPay, msg.sender);
    }

    /**
     * @notice This function is called to issue the option tokens
     * @dev The owner of a Vault should only be able to have a max of
     * floor(Collateral * collateralToStrike / (minCollateralizationRatio * strikePrice)) tokens issued.
     * @param vaultIndex The index of the Vault to issue tokens from
     * @param numTokens The number of tokens to issue
     * @param receiver The address to send the oTokens to
     */
    function issueOTokens (uint256 vaultIndex, uint256 numTokens, address receiver) public {
        //check that we're properly collateralized to mint this number, then call _mint(address account, uint256 amount)
        require(block.timestamp < expiry, "Options contract expired");

        Vault storage vault = vaults[vaultIndex];
        require(msg.sender == vault.owner, "Only owner can issue options");

        // checks that the Vault is sufficiently collateralized
        uint256 oTokensToAdd = numTokens.mul(10**18).div(oTokenWeight);
        uint256 newNumTokens = vault.weightedOTokens.add(oTokensToAdd);
        uint256 newWeightedOTokensInVault = newNumTokens.mul(10**18).div(oTokenWeight);

        require(isSafe(getCollateral(vaultIndex), newWeightedOTokensInVault), "unsafe to mint");
        _mint(receiver, numTokens);
        vault.weightedOTokens = newNumTokens;

        emit IssuedOTokens(msg.sender, numTokens, vaultIndex);
        return;
    }

    /**
     * @notice Returns an array of indecies of the vaults owned by `_owner`
     * @param _owner the address of the owner
     */
    function getVaultsByOwner(address _owner) public view returns (uint[] memory) {
        uint[] memory vaultsOwned;
        uint256 count = 0;
        uint index = 0;

        // get length necessary for returned array
        for (uint256 i = 0; i < vaults.length; i++) {
            if(vaults[i].owner == _owner){
                count += 1;
            }
        }

        vaultsOwned = new uint[](count);

        // get each index of each vault owned by given address
        for (uint256 i = 0; i < vaults.length; i++) {
            if(vaults[i].owner == _owner) {
                vaultsOwned[index++] = i;
            }
        }

       return vaultsOwned;
    }

    /**
     * @notice Returns the vault at the given index
     * @param vaultIndex the index of the Vault to return
     */
    function getVaultByIndex(uint256 vaultIndex) public view returns (uint256, uint256, address) {
        Vault storage vault = vaults[vaultIndex];
        return (
            getCollateral(vaultIndex),
            getOTokensIssued(vaultIndex),
            vault.owner
        );
    }

    /**
     * @notice Returns true if the given ERC20 is ETH.
     * @param _ierc20 the ERC20 asset.
     */
    function isETH(IERC20 _ierc20) public pure returns (bool) {
        return _ierc20 == IERC20(0);
    }

    /**
     * @notice allows the owner to burn their oTokens to increase the collateralization ratio of
     * their Vault.
     * @param vaultIndex Index of the Vault to burn oTokens
     * @param amtToBurn number of oTokens to burn
     * @dev only want to call this function before expiry. After expiry, no benefit to calling it.
     */
    function burnOTokens(uint256 vaultIndex, uint256 amtToBurn) public {
        Vault storage vault = vaults[vaultIndex];
        require(vault.owner == msg.sender, "Not the owner of this vault");

        uint256 tokensToBurn = amtToBurn.mul(10**18).div(oTokenWeight);
        vault.weightedOTokens = vault.weightedOTokens.sub(tokensToBurn);

        _burn(msg.sender, amtToBurn);
        emit BurnOTokens (vaultIndex, amtToBurn);
    }

    /**
     * @notice allows the owner to transfer ownership of their vault to someone else
     * @param vaultIndex Index of the vault to be transferred
     * @param newOwner address of the new owner
     */
    function transferVaultOwnership(uint256 vaultIndex, address payable newOwner) public {
        require(vaults[vaultIndex].owner == msg.sender, "Cannot transferVaultOwnership as non owner");
        vaults[vaultIndex].owner = newOwner;
        emit TransferVaultOwnership(vaultIndex, msg.sender, newOwner);
    }

    /**
     * @notice allows the owner to remove excess collateral from the vault before expiry. Removing collateral lowers
     * the collateralization ratio of the vault.
     * @param vaultIndex Index of the vault to remove collateral
     * @param amtToRemove Amount of collateral to remove in 10^-18.
     */
    function removeCollateral(uint256 vaultIndex, uint256 amtToRemove) public {

        require(block.timestamp < expiry, "Can only call remove collateral before expiry");
        // check that we are well collateralized enough to remove this amount of collateral
        Vault storage vault = vaults[vaultIndex];
        require(msg.sender == vault.owner, "Only owner can remove collateral");
        require(amtToRemove <= getCollateral(vaultIndex), "Can't remove more collateral than owned");

        uint256 collateralToRemove = amtToRemove.mul(10**18).div(collateralWeight);
        uint256 newWeightedCollateralAmt = vault.weightedCollateral.sub(collateralToRemove);
        uint256 newVaultCollateralAmt = newWeightedCollateralAmt.mul(10**18).div(collateralWeight);

        require(isSafe(newVaultCollateralAmt, getOTokensIssued(vaultIndex)), "Vault is unsafe");

        vault.weightedCollateral = newWeightedCollateralAmt;
        transferCollateral(msg.sender, amtToRemove);

        emit RemoveCollateral(vaultIndex, amtToRemove, msg.sender);
    }

    /**
     * @notice after expiry, each vault holder can get back their proportional share of collateral
     * from vaults that they own.
     * @dev The amount of collateral any owner gets back is calculated as:
     * vault.weightedCollateral / totalCollateral * (totalCollateral - totalExercised)
     * @param vaultIndex index of the vault the owner wants to claim collateral from.
     */
    function claimCollateral (uint256 vaultIndex) public {
        require(block.timestamp >= expiry, "Can't collect collateral until expiry");

        // pay out people proportional
        Vault storage vault = vaults[vaultIndex];

        require(msg.sender == vault.owner, "only owner can claim collatera");
        if (totalCollateral == 0) {
            totalCollateral = address(this).balance.sub(totalFee);
        }

        uint256 collateralToTransfer = getCollateral(vaultIndex).div(10).mul(10);
        uint256 underlyingToTransfer = getCollateral(vaultIndex).mul(totalUnderlying).div(totalCollateral);

        vault.weightedCollateral = 0;

        //TODO: burn oTokens?

        emit ClaimedCollateral(collateralToTransfer, underlyingToTransfer, vaultIndex, msg.sender);

        transferCollateral(msg.sender, collateralToTransfer);
        transferUnderlying(msg.sender, underlyingToTransfer);
    }

    /**
     * @notice This function can be called by anyone if the notice a vault that is undercollateralized.
     * The caller gets a reward for reducing the amount of oTokens in circulation.
     * @dev Liquidator comes with _oTokens. They get _oTokens * strikePrice * (incentive + fee)
     * amount of collateral out. They can liquidate a max of liquidationFactor * vault.weightedCollateral out
     * in one function call i.e. partial liquidations.
     * @param vaultIndex The index of the vault to be liquidated
     * @param _oTokens The number of oTokens being taken out of circulation
     */
    function liquidate(uint256 vaultIndex, uint256 _oTokens) public {
        // can only be called before the options contract expired
        require(block.timestamp < expiry, "Options contract expired");

        Vault storage vault = vaults[vaultIndex];

        // cannot liquidate a safe vault.
        require(isUnsafe(vaultIndex), "Vault is safe");

        // Owner can't liquidate themselves
        require(msg.sender != vault.owner, "Owner can't liquidate themselves");

        uint256 amtCollateral = calculateCollateralToPay(_oTokens, Number(1, 0));
        uint256 amtIncentive = calculateCollateralToPay(_oTokens, liquidationIncentive);
        uint256 amtCollateralToPay = amtCollateral + amtIncentive;

        // Fees
        uint256 protocolFee = calculateCollateralToPay(_oTokens, liquidationFee);
        totalFee = totalFee.add(protocolFee);

        uint256 amtCollateralToDeduct = (amtCollateralToPay.add(protocolFee)).mul(10**18).div(collateralWeight);


        // calculate the maximum amount of collateral that can be liquidated
        uint256 maxCollateralLiquidatable = getCollateral(vaultIndex).mul(liquidationFactor.value);
        if(liquidationFactor.exponent > 0) {
            maxCollateralLiquidatable = maxCollateralLiquidatable.div(10 ** uint32(liquidationFactor.exponent));
        } else {
            maxCollateralLiquidatable = maxCollateralLiquidatable.div(10 ** uint32(-1 * liquidationFactor.exponent));
        }

        require(amtCollateralToDeduct <= maxCollateralLiquidatable,
        "Can only liquidate liquidation factor at any given time");

        // deduct the collateral and weightedOTokens
        vault.weightedCollateral = vault.weightedCollateral.sub(amtCollateralToDeduct);
        uint256 tokensToDeduct = _oTokens.mul(10**18).div(oTokenWeight);
        vault.weightedOTokens = vault.weightedOTokens.sub(tokensToDeduct);

        // transfer the collateral and burn the _oTokens
         _burn(msg.sender, _oTokens);
         transferCollateral(msg.sender, amtCollateralToPay);

        emit Liquidate(amtCollateralToPay, vaultIndex, msg.sender);
    }

    /**
     * @notice checks if a vault is unsafe. If so, it can be liquidated
     * @param vaultIndex The number of the vault to check
     * @return true or false
     */
    function isUnsafe(uint256 vaultIndex) public view returns (bool) {

        bool isUnsafe = !isSafe(getCollateral(vaultIndex), getOTokensIssued(vaultIndex));

        return isUnsafe;
    }

    /**
     * @notice This function calculates and returns the amount of collateral in the vault
    */
    function getCollateral(uint256 vaultIndex) internal view returns (uint256) {
        Vault storage vault = vaults[vaultIndex];
        return vault.weightedCollateral.mul(collateralWeight).div(10**18);
    }

    /**
     * @notice This function calculates and returns the amount of puts issued by the Vault
    */
    function getOTokensIssued(uint256 vaultIndex) internal view returns (uint256) {
        Vault storage vault = vaults[vaultIndex];
        return vault.weightedOTokens.mul(10**18).div(oTokenWeight);
    }

    /**
     * @notice adds `_amt` collateral to `_vaultIndex` and returns the new balance of the vault
     * @param _vaultIndex the index of the vault
     * @param _amt the amount of collateral to add
     */
    function _addCollateral(uint256 _vaultIndex, uint256 _amt) private returns (uint256) {
        require(block.timestamp < expiry, "Options contract expired");

        Vault storage vault = vaults[_vaultIndex];

        uint256 amtToAdd = _amt.mul(10**18).div(collateralWeight);
        vault.weightedCollateral = vault.weightedCollateral.add(amtToAdd);

        return vault.weightedCollateral;
    }

    /**
     * @notice checks if a hypothetical vault is safe with the given collateralAmt and weightedOTokens
     * @param collateralAmt The amount of collateral the hypothetical vault has
     * @param weightedOTokens The amount of oTokens generated by the hypothetical vault
     * @return true or false
     */
    function isSafe(uint256 collateralAmt, uint256 weightedOTokens) internal view returns (bool) {
        // get price from Oracle
        uint256 ethToCollateralPrice = getPrice(address(collateral));
        uint256 ethToStrikePrice = getPrice(address(strike));

        // check `weightedOTokens * collateralizationRatio * strikePrice <= collAmt * collateralToStrikePrice`
        uint256 leftSideVal = weightedOTokens.mul(collateralizationRatio.value).mul(strikePrice.value);
        int32 leftSideExp = collateralizationRatio.exponent + strikePrice.exponent;

        uint256 rightSideVal = (collateralAmt.mul(ethToStrikePrice)).div(ethToCollateralPrice);
        int32 rightSideExp = collateralExp;

        uint32 exp = 0;
        bool isSafe = false;

        if(rightSideExp < leftSideExp) {
            exp = uint32(leftSideExp - rightSideExp);
            isSafe = leftSideVal.mul(10**exp) <= rightSideVal;
        } else {
            exp = uint32(rightSideExp - leftSideExp);
            isSafe = leftSideVal <= rightSideVal.mul(10 ** exp);
        }

        return isSafe;
    }

    /**
     * @notice This function calculates the amount of collateral to be paid out.
     * @dev The amount of collateral to paid out is determined by:
     * `proportion` * s`trikePrice` * `oTokens` amount of collateral.
     * @param _oTokens The number of oTokens.
     * @param proportion The proportion of the collateral to pay out. If 100% of collateral
     * should be paid out, pass in Number(1, 0). The proportion might be less than 100% if
     * you are calculating fees.
     */
    function calculateCollateralToPay(uint256 _oTokens, Number memory proportion) internal returns (uint256) {
        // Get price from oracle
        uint256 ethToCollateralPrice = getPrice(address(collateral));
        uint256 ethToStrikePrice = getPrice(address(strike));

        // calculate how much should be paid out
        uint256 amtCollateralToPayNum = _oTokens.mul(strikePrice.value).mul(proportion.value).mul(ethToCollateralPrice);
        int32 amtCollateralToPayExp = strikePrice.exponent + proportion.exponent - collateralExp;
        uint256 amtCollateralToPay = 0;
        if(amtCollateralToPayExp > 0) {
            uint32 exp = uint32(amtCollateralToPayExp);
            amtCollateralToPay = amtCollateralToPayNum.mul(10 ** exp).div(ethToStrikePrice);
        } else {
            uint32 exp = uint32(-1 * amtCollateralToPayExp);
            amtCollateralToPay = (amtCollateralToPayNum.div(10 ** exp)).div(ethToStrikePrice);
        }

        return amtCollateralToPay;

    }

    /**
     * @notice This function transfers `amt` collateral to `_addr`
     * @param _addr The address to send the collateral to
     * @param _amt The amount of the collateral to pay out.
     */
    function transferCollateral(address payable _addr, uint256 _amt) internal {
        if (isETH(collateral)){
            _addr.transfer(_amt);
        } else {
            collateral.transfer(_addr, _amt);
        }
    }

    /**
     * @notice This function transfers `amt` underlying to `_addr`
     * @param _addr The address to send the underlying to
     * @param _amt The amount of the underlying to pay out.
     */
    function transferUnderlying(address payable _addr, uint256 _amt) internal {
        if (isETH(underlying)){
            _addr.transfer(_amt);
        } else {
            underlying.transfer(_addr, _amt);
        }
    }

    /**
     * @notice This function gets the price in ETH (wei) of the asset.
     * @param asset The address of the asset to get the price of
     */
    function getPrice(address asset) internal view returns (uint256) {
        if(asset == address(0)) {
            return (10 ** 18);
        } else {
            return COMPOUND_ORACLE.getPrice(asset);
        }
    }

    /**
     * @notice Returns the differnce in precision in decimals between the
     * underlying token and the oToken. If the underlying has a precision of 18 digits
     * and the oTokenExchange is 14 digits of precision, the underlyingExp is 4.
     */
    function underlyingExp() internal returns (uint32) {
        // TODO: change this to be _oTokenExhangeExp - decimals(underlying)
        return uint32(oTokenExchangeRate.exponent - (-18));
    }

    function() external payable {
        // to get ether from uniswap exchanges
    }
}
