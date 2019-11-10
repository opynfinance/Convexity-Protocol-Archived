pragma solidity 0.5.10;

contract MockCompoundOracle {
    constructor() public {
    }
    function getPrice(address asset) public view returns (uint) {
        return 527557000000000;
    }
}
