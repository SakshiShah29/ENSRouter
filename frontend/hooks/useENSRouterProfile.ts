import { useEnsAddress, useEnsText } from 'wagmi'
import { normalize } from 'viem/ens'
import { parseAllocation } from '@/lib/parseAllocation'
import type { ParsedProfile } from '@/types'

export function useChainRouterProfile(ensName: string | undefined) {
  const normalizedName = ensName ? normalize(ensName) : undefined

  // Resolve ENS name to address
  const { data: address, isLoading: addressLoading } = useEnsAddress({
    name: normalizedName,
    chainId: 1, // Ethereum mainnet
  })

  // Read text records
  const { data: chain, isLoading: chainLoading } = useEnsText({
    name: normalizedName,
    key: 'chainrouter.chain',
    chainId: 1,
  })

  const { data: alloc, isLoading: allocLoading } = useEnsText({
    name: normalizedName,
    key: 'chainrouter.alloc',
    chainId: 1,
  })

  const { data: slippage, isLoading: slippageLoading } = useEnsText({
    name: normalizedName,
    key: 'chainrouter.slippage',
    chainId: 1,
  })

  const { data: autoswap, isLoading: autoswapLoading } = useEnsText({
    name: normalizedName,
    key: 'chainrouter.autoswap',
    chainId: 1,
  })

  const { data: fallback } = useEnsText({
    name: normalizedName,
    key: 'chainrouter.fallback',
    chainId: 1,
  })

  const isLoading = 
    addressLoading || 
    chainLoading || 
    allocLoading || 
    slippageLoading || 
    autoswapLoading

  // Return null if no address or still loading
  if (!address || !ensName || isLoading) {
    return {
      data: null,
      isLoading,
      error: null,
    }
  }

  const profile: ParsedProfile = {
    ensName,
    address,
    chain: chain || 'base', // Default to Base
    allocations: parseAllocation(alloc),
    slippageTolerance: parseFloat(slippage || '0.5'),
    autoSwapEnabled: autoswap === 'true',
    fallbackChain: fallback || undefined,
  }

  return {
    data: profile,
    isLoading: false,
    error: null,
  }
}