import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract simpleERC20 is ERC20 {
    constructor () public {

    }

    function mint (uint256 numTokens) public{
        _mint(msg.sender, numTokens);
    }
}