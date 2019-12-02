export function RepoOpened(params: { addr: string; }) {
  return {
    event: 'RepoOpened',
    args: {
      addr: params.addr
    }
  };
}

export function Approval(params: { uuid: string; owner: string; spender: string; value: string; blockNumber: number; }) {
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
