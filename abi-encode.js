var abi = require('ethereumjs-abi')

var parameterTypes = ["address", "int32", "address", "int32", "int32", "uint256", "int32", "address", "uint256", "address", "address", "uint256"];
var parameterValues = ["0x0000000000000000000000000000000000000000", "-18", "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643", "-8", "-8", "2", "-10", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "1612915200", "0x5778f2824a114F6115dc74d432685d3336216017", "0x7054e08461e3eCb7718B63540adDB3c3A1746415", "1612915200"];

var encoded = abi.rawEncode(parameterTypes, parameterValues);

console.log(encoded.toString('hex'));