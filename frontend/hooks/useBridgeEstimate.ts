import { useQuery } from '@tanstack/react-query'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { useEvmAdapter } from './useEvmAdapter'
import { BRIDGE_KIT_CHAINS } from '@/lib/contracts'
import type { BridgeEstimate } from '@/types'

const kit = new BridgeKit()

interface UseBridgeEstimateParams {
  sourceChain: string   // Our chain ID string (e.g. "base-sepolia")
  destChain: string     // Our chain ID string (e.g. "arbitrum-sepolia")
  amount: string        // Human-readable USDC amount (e.g. "100.00")
  enabled?: boolean
}

export function useBridgeEstimate({
  sourceChain,
  destChain,
  amount,
  enabled = true,
}: UseBridgeEstimateParams) {
  const { evmAdapter, isReady } = useEvmAdapter()

  const fromChain = BRIDGE_KIT_CHAINS[sourceChain]
  const toChain = BRIDGE_KIT_CHAINS[destChain]

  return useQuery<BridgeEstimate>({
    queryKey: ['bridge-estimate', sourceChain, destChain, amount],
    queryFn: async () => {
      if (!evmAdapter || !fromChain || !toChain) {
        throw new Error('Adapter not ready or invalid chains')
      }

      const estimate = await kit.estimate({
        from: { adapter: evmAdapter, chain: fromChain as any },
        to: { adapter: evmAdapter, chain: toChain as any },
        amount,
      })

      // Bridge Kit fast transfer: ~8-20s, standard: ~15-19min
      // Default to fast transfer estimate
      const estimatedTime = 20

      return {
        fees: (estimate as any).fees ?? [],
        estimatedTime,
      }
    },
    enabled:
      enabled &&
      isReady &&
      !!fromChain &&
      !!toChain &&
      !!amount &&
      parseFloat(amount) > 0 &&
      sourceChain !== destChain,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
