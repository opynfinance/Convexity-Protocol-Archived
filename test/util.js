const expect = require('expect');

class Util {
  constructor(web3) {
    this.web3 = web3;
    this.gasPrice = web3.eth.gasPrice;
  }
  setTimeForward(timeDiff) {
    return new Promise(function(accept, reject) {
      this.web3.currentProvider.sendAsync({
        method: "evm_increaseTime",
        params: [timeDiff],
        jsonrpc: "2.0",
        id: Date.now()
      }, function(err, result) {
        if (err) {
          reject(err);
        } else {
          accept();
        }
      });
    }.bind(this))
  }
  async setBlockNumberForward(blockDiff) {
    for (let i = 0; i < blockDiff; i++) {
      await this.incrementBlockNumber()
    }
  }
  incrementBlockNumber() {
    return new Promise(function(accept, reject) {
      this.web3.currentProvider.sendAsync({
        method: "evm_mine",
        jsonrpc: "2.0",
        id: Date.now()
      }, function(err, result) {
        if (err) {
          reject(err);
        } else {
          accept();
        }
      });
    }.bind(this))
  }
  getGasCosts(result) {
    return new Promise(function(accept, reject) {
      if ('tx' in result) {
        accept(this.gasPrice.times(result.receipt.gasUsed));
      } else {
        this.web3.eth.getTransactionReceipt(txHash, function(err, tx) {
          if (err) reject(err)
          else {
            this.web3.eth.gasPrice((err, result) => {
              if (err) reject(err)
              else {
                console.log(result)
                const gasCost = result.times(tx.gasUsed);
                accept(gasCost);
              }
            })
          }
        }.bind(this))
      }
    }.bind(this));
  }
  assertThrowMessage(err) {
    expect(err.toString().indexOf('invalid JUMP') > -1 ||
      err.toString().indexOf('out of gas') > -1 ||
      err.toString().indexOf('revert') > -1 ||
      err.toString().indexOf('invalid opcode') > -1).to.be(true);
  }
  static stripZeroEx(data) {
    if (data.slice(0,2) === '0x')
      return data.slice(2)
    else
      return data;
  }
  assertEventEquality(log, expectedLog) {
    assert.equal(log.event, expectedLog.event);
    Object.keys(expectedLog.args).forEach(function(key, index) {
      expect(log.args[key].toString()).to.be(expectedLog.args[key].toString());
    });
  }
}
module.exports = Util;