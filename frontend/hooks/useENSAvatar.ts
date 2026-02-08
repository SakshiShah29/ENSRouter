// hooks/useENSAvatar.ts
import { useEnsAvatar, useEnsText } from 'wagmi'
import { normalize } from 'viem/ens'

const ENS_CHAIN_ID = 1

export function useENSAvatar(ensName?: string) {
  const { data: avatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: ENS_CHAIN_ID,
  })
  return avatar
}

// Add this new hook
export function useENSHeader(ensName?: string) {
  const { data: header } = useEnsText({
    name: ensName ? normalize(ensName) : undefined,
    key: 'header',
    chainId: ENS_CHAIN_ID,
  })
  return header
}