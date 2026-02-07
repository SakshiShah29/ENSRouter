import { useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'

export function useENSAvatar(ensName: string | undefined) {
  const { data: avatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  })

  return avatar
}