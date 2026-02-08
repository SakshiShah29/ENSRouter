import { useEnsAddress, useEnsText, useEnsName, useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'
import { useAccount } from 'wagmi'
import type { ParsedProfile, TokenAllocation, SupportedChain } from '@/types'
import { SUPPORTED_CHAINS } from '@/types'

const ENS_CHAIN_ID = 1

// Parse token allocations from text record
// Format: "USDC:60,ETH:30,DAI:10"
function parseTokenAllocations(raw: string | undefined): TokenAllocation[] {
  if (!raw || raw === '') {
    return [{ token: 'USDC', percentage: 100 }]
  }

  try {
    const allocations = raw.split(',').map(part => {
      const [token, pct] = part.trim().split(':')
      return {
        token: token.trim(),
        percentage: parseInt(pct.trim(), 10),
      }
    }).filter(a => !isNaN(a.percentage) && a.token)

    const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
    if (total !== 100) {
      console.warn('Token allocation percentages do not sum to 100:', total, raw)
    }

    return allocations.length > 0 ? allocations : [{ token: 'USDC', percentage: 100 }]
  } catch (error) {
    console.error('Failed to parse token allocations:', raw, error)
    return [{ token: 'USDC', percentage: 100 }]
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

  // Read destination chain
  const { data: chain, isLoading: chainLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.chain',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  // Read token allocation text record
  const { data: tokenAlloc, isLoading: tokenAllocLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.tokenAlloc',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  // Read slippage
  const { data: slippage, isLoading: slippageLoading } = useEnsText({
    name: normalizedName,
    key: 'ENSRouter.slippage',
    chainId: ENS_CHAIN_ID,
    query: {
      enabled: !!normalizedName,
    },
  })

  const isLoading =
    nameLoading ||
    addressLoading ||
    chainLoading ||
    tokenAllocLoading ||
    slippageLoading

  // For basic profile, we just need an address
  const hasBasicProfile = !!address && !!nameToUse
  // For full router profile, we need at least a chain set
  const hasRouterProfile = !!chain && chain !== ''

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

  // Parse fields
  const destChain: SupportedChain = (SUPPORTED_CHAINS.includes(chain as SupportedChain)
    ? chain as SupportedChain
    : 'base')
  const tokenAllocations = parseTokenAllocations(tokenAlloc ?? undefined)
  const slippageTolerance = slippage ? parseFloat(slippage) : 1

  // Return parsed profile
  const profile: ParsedProfile = {
    ensName: nameToUse,
    address,
    chain: destChain,
    tokenAllocations,
    slippageTolerance,
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
