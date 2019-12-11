// This enables us to use TypeScript in the unit tests.
require('ts-node/register');

const HDWalletProvider = require("truffle-hdwallet-provider-privkey");
var secrets = {
  secret: '',
  api_key: ''
}

if (process.env.NODE_ENV !== 'test') {
  secrets = require("./secrets.json");
}

module.exports = {
  networks: {
    rinkeby: {
      provider: () => {
        return new HDWalletProvider(secrets.secret, "https://rinkeby.infura.io/v3/" + secrets.api_key);
      },
      network_id: 4,
      gas: 6700000,
      gasPrice: 10000000000
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.10",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
      //  evmVersion: "byzantium"
      }
    }
  }
}
