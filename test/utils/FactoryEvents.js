module.exports = {
  AssetAdded(params) {
    return {
      event: 'AssetAdded',
      args: {
        asset: params.asset,
        addr: params.addr,
      }
    }
  },

  ContractCreated(params) {
    return {
      event: 'ContractCreated',
      args: {
        addr: params.addr,
      }
    }
  },

  Approval(params) {
    return {
      event: 'Approval',
      args: {
        uuid: params.uuid,
        owner: params.owner,
        spender: params.spender,
        value: params.value,
        blockNumber: params.blockNumber
      }
    }
  }
}
