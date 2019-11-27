pragma solidity 0.5.10;

import "./OptionsContract.sol";
import "./OptionsUtils.sol";
import "./lib/StringComparator.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OptionsFactory is Ownable {
    using StringComparator for string;

    // keys saved in front-end -- look at the docs if needed
    mapping (string => IERC20) public tokens; // TODO: add to docs 
    address[] public optionsContracts;

    OptionsExchange public optionsExchange;

    event OptionsFactoryCreated(address addr); 
    event AssetAdded(string indexed asset, address indexed addr); 
    event AssetChanged(string indexed asset, address indexed addr);
    event AssetDeleted(string indexed asset);

    //TODO: need this as the constructor.
    // constructor(OptionsExchange _optionsExchange) public {
    //     optionsExchange = _optionsExchange;
    // }

    constructor() public {
    }
    
    // TODO: need to remove this instead and replace with a constructor. 	       
    function setOptionsExchange(address _optionsExchange) public {	       
        optionsExchange = OptionsExchange(_optionsExchange);	       
    }

    /* @notice: creates a new options contract (series) as per the below parameters 
        @param _collateralType: The collateral asset (eg. ETH, USDC, etc.) 
        @param _underlyingType: The asset upon which the option is based. In the insurance use case, the asset that is being protected. (eg. DAI, cUSDC, etc.) 
        @param _strikePrice: The amount of strike asset that will be paid out upon exercise (eg. 1 USDC)
        @param _strikeAsset: The asset in which the option is denominated. (eg. DAI option denominated in USDC)
        @param _payoutType: The asset in which the option is paid out. (eg. ETH)
        @param _expiry: The unix time at which the option expires (eg. 1574457816)
    */
    function createOptionsContract(
        string memory _collateralType,
        string memory _underlyingType,
        uint256 _strikePrice,
        string memory _strikeAsset,
        string memory _payoutType,
        uint256 _expiry
    )
        public
        returns (address)
    {
        require(supportsAsset(_collateralType), "Collateral type not supported");
        require(supportsAsset(_underlyingType), "Underlying type not supported");
        require(supportsAsset(_strikeAsset), "Strike asset type not supported");
        require(supportsAsset(_payoutType), "Payout type not supported");

        OptionsContract optionsContract = new OptionsContract(
            tokens[_collateralType],
            tokens[_underlyingType],
            _strikePrice,
            tokens[_strikeAsset],
            tokens[_payoutType],
            _expiry,
            optionsExchange
        );

        optionsContracts.push(address(optionsContract));
        emit OptionsFactoryCreated(address(optionsContract));
        return address(optionsContract);
    }

    /* @notice: provides the number of options contracts created */
    function getNumberOfOptionsContracts() public view returns (uint256) {
        return optionsContracts.length;
    }

    /* @notice: allows for adding assets to the set of supported assets 
        @param _asset: The asset to add to the set of supported assets
        @param _addr: The address of the asset to add 
        @note: admin don't add ETH. ETH is set to 0x0.
    */
    function addAsset(string memory _asset, address _addr) public onlyOwner {
        require(!supportsAsset(_asset), "Asset already added");
        require(_addr != address(0), "Cannot set to address(0)");

        tokens[_asset] = IERC20(_addr);
        emit AssetAdded(_asset, _addr);
    }

    /* @notice: allows for changing assets to the supported set of assets 
        @param _asset: The asset to change in the supported set of assets
        @param _addr: The address of the asset to change
    */
    function changeAsset(string memory _asset, address _addr) public onlyOwner {
        require(tokens[_asset] != IERC20(0), "Trying to replace a non-existent asset");
        require(_addr != address(0), "Cannot set to address(0)");

        tokens[_asset] = IERC20(_addr);
        emit AssetChanged(_asset, _addr);
    }

    /* @notice: allows for deleting assets from the supported set of assets 
        @param _asset: The asset to delete from the supported set of assets
    */
    function deleteAsset(string memory _asset) public onlyOwner {
        require(tokens[_asset] != IERC20(0), "Trying to delete a non-existent asset");

        tokens[_asset] = IERC20(0);
        emit AssetDeleted(_asset);
    }

    /* @notice: checks if an asset is in the set of supported assets
        @param _asset: The asset to check 
    */
    function supportsAsset(string memory _asset) public view returns (bool) {
        if (_asset.compareStrings("ETH")) {
            return true;
        }

        return tokens[_asset] != IERC20(0);
    }
}
