import { useEnsAddress, useEnsText, useEnsName, useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'
import { useAccount } from 'wagmi'
import type { ParsedProfile, ChainAllocation, SupportedChain } from '@/types'
import { SUPPORTED_CHAINS } from '@/types'

const IS_TESTNET = true
const ENS_CHAIN_ID = IS_TESTNET ? 11155111 : 1

// Parse chain allocations from text record
// Format: "base-sepolia:80,arbitrum-sepolia:10,arc-testnet:10"
function parseChainAllocations(raw: string | undefined): ChainAllocation[] {
  if (!raw || raw === '') {
    // Default: 100% on base-sepolia
    return [{ chain: 'base-sepolia', percentage: 100 }]
  }

  try {
    const allocations = raw.split(',').map(part => {
      const [chain, pct] = part.split(':')
      const chainTrimmed = chain.trim() as SupportedChain

      // Validate it's a supported chain
      if (!SUPPORTED_CHAINS.includes(chainTrimmed)) {
        console.warn('Unsupported chain in allocation:', chainTrimmed)
        return null
      }

      return {
        chain: chainTrimmed,
        percentage: parseInt(pct)
      }
    }).filter((a): a is ChainAllocation => a !== null && !isNaN(a.percentage))

    // Validate total is 100%
    const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
    if (total !== 100) {
      console.warn('Chain allocation percentages do not sum to 100:', total, raw)
    }

    return allocations.length > 0 ? allocations : [{ chain: 'base-sepolia', percentage: 100 }]
  } catch (error) {
    console.error('Failed to parse chain allocations:', raw, error)
    return [{ chain: 'base-sepolia', percentage: 100 }]
  }
}

export function useChainRouterProfile(ensName?: string) {
  const { address: connectedAddress } = useAccount()

  // If no ENS name provided, try to resolve from connected address
  const { data: resolvedEnsName, isLoading: nameLoading } = useEnsName({
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

  // Read chain allocation text record
  const { data: chainAlloc, isLoading: chainAllocLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.chainAlloc',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  // Read fallback chain
  const { data: fallback, isLoading: fallbackLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.fallback',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const isLoading =
    nameLoading ||
    addressLoading ||
    chainAllocLoading ||
    fallbackLoading

  // For basic profile, we just need an address
  const hasBasicProfile = !!address && !!nameToUse
  // For full router profile, we need chain allocations
  const hasRouterProfile = !!chainAlloc && chainAlloc !== ''

  // Return loading state
  if (isLoading) {
    return {
      data: null,
      isLoading: true,
      error: null,
      hasProfile: false,
      hasRouterProfile: false,
      ensName: nameToUse,
    }
  }

  // Return no profile state
  if (!address || !nameToUse) {
    return {
      data: null,
      isLoading: false,
      error: addressError,
      hasProfile: false,
      hasRouterProfile: false,
      ensName: nameToUse,
    }
  }

  // Parse chain allocations
  const chainAllocations = parseChainAllocations(chainAlloc ?? undefined)

  // Return parsed profile
  const profile: ParsedProfile = {
    ensName: nameToUse,
    address,
    chainAllocations,
    fallbackChain: (fallback as SupportedChain) || undefined,
  }

  return {
    data: profile,
    isLoading: false,
    error: null,
    hasProfile: hasBasicProfile,
    hasRouterProfile: hasRouterProfile,
    ensName: nameToUse,
  }
}

// Hook for ENS Avatar with fallback
export function useENSAvatar(ensName?: string) {
  const { data: avatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: ENS_CHAIN_ID,
  })
  return avatar
}

// Hook for ENS Header (banner) - checks text record
export function useENSHeader(ensName?: string) {
  const { data: header } = useEnsText({
    name: ensName ? normalize(ensName) : undefined,
    key: 'header',
    chainId: ENS_CHAIN_ID,
  })
  return header
}
