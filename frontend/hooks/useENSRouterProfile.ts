import { useEnsAddress, useEnsText, useEnsName } from 'wagmi'
import { normalize } from 'viem/ens'
import { useAccount } from 'wagmi'
import type { ParsedProfile, TokenAllocation } from '@/types'


const IS_TESTNET = true 
const ENS_CHAIN_ID = IS_TESTNET ? 11155111 : 1 

function parseAllocation(raw: string | undefined): TokenAllocation[] {
  if (!raw || raw === '') {
    return [{ token: 'USDC', percentage: 100 }]
  }
  
  try {
    const allocations = raw.split(',').map(part => {
      const [token, pct] = part.split(':')
      return { token: token.trim(), percentage: parseInt(pct) }
    })
    

    const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
    if (total !== 100) {
      console.warn('Allocation percentages do not sum to 100:', raw)
    }
    
    return allocations
  } catch (error) {
    console.error('Failed to parse allocation:', raw, error)
    return [{ token: 'USDC', percentage: 100 }]
  }
}

export function useChainRouterProfile(ensName?: string) {
  const { address: connectedAddress } = useAccount()
  
  // If no ENS name provided, try to resolve from connected address
  const { data: resolvedEnsName } = useEnsName({
    address: connectedAddress,
    chainId: ENS_CHAIN_ID,
  })
  
  // Use provided ensName or resolved name
  const nameToUse = ensName || resolvedEnsName
  const normalizedName = nameToUse ? normalize(nameToUse) : undefined

  // Resolve ENS name to address
  const { data: address, isLoading: addressLoading, error: addressError } = useEnsAddress({
    name: normalizedName,
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  // Read text records
  const { data: chain, isLoading: chainLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.chain',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const { data: alloc, isLoading: allocLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.alloc',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const { data: slippage, isLoading: slippageLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.slippage',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const { data: autoswap, isLoading: autoswapLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.autoswap',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const { data: fallback } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.fallback',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const isLoading = 
    addressLoading || 
    chainLoading || 
    allocLoading || 
    slippageLoading || 
    autoswapLoading

  // Check if profile exists (at least chain is set)
  const hasProfile = !!chain && chain !== ''

  // Return loading state
  if (isLoading) {
    return {
      data: null,
      isLoading: true,
      error: null,
      hasProfile: false,
      ensName: nameToUse,
    }
  }

  // Return no profile state
  if (!address || !nameToUse || !hasProfile) {
    return {
      data: null,
      isLoading: false,
      error: addressError,
      hasProfile: false,
      ensName: nameToUse,
    }
  }

  // Return parsed profile
  const profile: ParsedProfile = {
    ensName: nameToUse,
    address,
      chain: chain || 'base-sepolia', 
    //@ts-ignore
    allocations: parseAllocation(alloc),
    slippageTolerance: parseFloat(slippage || '0.5'),
    autoSwapEnabled: autoswap === 'true',
    fallbackChain: fallback || undefined,
  }

  return {
    data: profile,
    isLoading: false,
    error: null,
    hasProfile: true,
    ensName: nameToUse,
  }
}