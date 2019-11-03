pragma solidity 0.5.10;

import "./OptionsContract.sol";
import "./OptionsUtils.sol";
import "./StringComparator.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract OptionsFactory is Ownable {
    using StringComparator for string;

    // keys saved in front-end -- look at the docs if needed
    mapping (string => IERC20) public tokens;

    event ContractCreated(address addr);
    event AssetAdded(string indexed asset, address indexed addr);
    event AssetChanged(string indexed asset, address indexed addr);
    event AssetDeleted(string indexed asset);

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
            _expiry
        );

        emit ContractCreated(address(optionsContract));
        return address(optionsContract);
    }

    function addAsset(string memory _asset, address _addr) public onlyOwner {
        require(tokens[_asset] == IERC20(0), "Asset already added");
        require(_addr != address(0), "Cannot set to address(0)");

        tokens[_asset] = IERC20(_addr);
        emit AssetAdded(_asset, _addr);
    }

    function changeAsset(string memory _asset, address _addr) public onlyOwner {
        require(tokens[_asset] != IERC20(0), "Trying to replace a non-existent asset");
        require(_addr != address(0), "Cannot set to address(0)");

        tokens[_asset] = IERC20(_addr);
        emit AssetChanged(_asset, _addr);
    }

    function deleteAsset(string memory _asset) public onlyOwner {
        require(tokens[_asset] != IERC20(0), "Trying to delete a non-existent asset");

        tokens[_asset] = IERC20(0);
        emit AssetDeleted(_asset);
    }

    function supportsAsset(string memory _collateralType) public view returns (bool) {
        if (_collateralType.compareStrings("ETH")) {
            return true;
        }

        return tokens[_collateralType] != IERC20(0);
    }
}
