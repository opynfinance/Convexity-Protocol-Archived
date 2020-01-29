pragma solidity 0.5.10;

contract MockCompoundOracle {
    constructor() public {
    }

    uint256 price = 5 * (10 ** 15);
    function getPrice(address asset) public view returns (uint) {
        return price;
    }

    function updatePrice(uint256 newPrice) public {
        price = newPrice;
    }
}
