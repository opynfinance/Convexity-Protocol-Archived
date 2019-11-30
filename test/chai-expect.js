// Exports the chai expect variable with the bignumber plugin so we can make assertions about BigNumbers emitted by
// the truffle contracts.
const chai = require('chai');
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
const expect = chai.expect;
module.exports = expect;
