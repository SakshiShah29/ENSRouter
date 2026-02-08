import { useState, useCallback } from 'react'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { useEvmAdapter } from './useEvmAdapter'
import { BRIDGE_KIT_CHAINS } from '@/lib/contracts'
import type { BridgeResult } from '@/types'

const kit = new BridgeKit()

interface BridgeParams {
  sourceChain: string          // Our chain ID string (e.g. "base-sepolia")
  destChain: string            // Our chain ID string (e.g. "arbitrum-sepolia")
  amount: string               // Human-readable USDC amount (e.g. "100.00")
  recipientAddress?: string    // Recipient wallet address on destination chain
}

export function useBridgeUSDC() {
  const { evmAdapter, isReady } = useEvmAdapter()
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [steps, setSteps] = useState<BridgeResult['steps']>([])

  const bridge = useCallback(
    async (params: BridgeParams): Promise<BridgeResult> => {
      if (!evmAdapter) {
        throw new Error('Wallet not connected')
      }

      const fromChain = BRIDGE_KIT_CHAINS[params.sourceChain]
      const toChain = BRIDGE_KIT_CHAINS[params.destChain]

      if (!fromChain || !toChain) {
        throw new Error(
          `Unsupported chain: ${!fromChain ? params.sourceChain : params.destChain}`
        )
      }

      setIsPending(true)
      setIsSuccess(false)
      setError(null)
      setSteps([])

      try {
        const result = await kit.bridge({
          from: { adapter: evmAdapter, chain: fromChain as any },
          to: {
            adapter: evmAdapter,
            chain: toChain as any,
            ...(params.recipientAddress && { recipientAddress: params.recipientAddress }),
          },
          amount: params.amount,
        })

        const bridgeResult: BridgeResult = {
          steps: (result as any).steps ?? [],
        }

        setSteps(bridgeResult.steps)
        setIsSuccess(true)
        return bridgeResult
      } catch (err) {
        const bridgeError =
          err instanceof Error ? err : new Error(String(err))
        setError(bridgeError)
        throw bridgeError
      } finally {
        setIsPending(false)
      }
    },
    [evmAdapter]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setIsSuccess(false)
    setError(null)
    setSteps([])
  }, [])

  return {
    bridge,
    isPending,
    isSuccess,
    error,
    steps,
    isReady,
    reset,
  }
}
