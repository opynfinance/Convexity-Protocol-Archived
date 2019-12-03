export function AssetAdded(params: { asset: string; addr: string }) {
  return {
    event: 'AssetAdded',
    args: {
      asset: params.asset,
      addr: params.addr
    }
  };
}

export function ContractCreated(params: { addr: string }) {
  return {
    event: 'ContractCreated',
    args: {
      addr: params.addr
    }
  };
}

export function Approval(params: {
  uuid: string;
  owner: string;
  spender: string;
  value: string;
  blockNumber: string;
}) {
  return {
    event: 'Approval',
    args: {
      uuid: params.uuid,
      owner: params.owner,
      spender: params.spender,
      value: params.value,
      blockNumber: params.blockNumber
    }
  };
}
