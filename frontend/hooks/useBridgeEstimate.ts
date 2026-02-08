import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { parseUnits } from 'viem'
import { getQuote } from '@lifi/sdk'
import { CHAIN_USDC_ADDRESS } from '@/lib/contracts'
import { CHAIN_KEY_TO_CHAIN_ID } from '@/lib/lifi'
import type { BridgeEstimate } from '@/types'

interface UseBridgeEstimateParams {
  sourceChain: string        // Our chain key (e.g. "base")
  destChain: string          // Our chain key (e.g. "arbitrum")
  amount: string             // Human-readable USDC amount (e.g. "100.00")
  destTokenAddress?: string  // Token address on destination chain (defaults to USDC)
  slippage?: number          // Slippage tolerance as decimal (e.g. 0.005 = 0.5%). Defaults to 0.005
  enabled?: boolean
}

export function useBridgeEstimate({
  sourceChain,
  destChain,
  amount,
  destTokenAddress,
  slippage,
  enabled = true,
}: UseBridgeEstimateParams) {
  const { address } = useAccount()

  const fromChainId = CHAIN_KEY_TO_CHAIN_ID[sourceChain]
  const toChainId = CHAIN_KEY_TO_CHAIN_ID[destChain]
  const fromToken = CHAIN_USDC_ADDRESS[sourceChain]
  const toToken = destTokenAddress || CHAIN_USDC_ADDRESS[destChain]

  return useQuery<BridgeEstimate>({
    queryKey: ['bridge-estimate', sourceChain, destChain, amount, toToken],
    queryFn: async () => {
      if (!address || !fromToken || !toToken) {
        throw new Error('Missing parameters for estimate')
      }

      const amountWei = parseUnits(amount, 6).toString()

      const quote = await getQuote({
        fromChain: fromChainId,
        toChain: toChainId,
        fromToken,
        toToken,
        fromAmount: amountWei,
        fromAddress: address,
        toAddress: address,
        slippage: slippage ?? 0.01,
      })

      const fees = [
        ...(quote.estimate.feeCosts ?? []).map(f => ({
          type: f.name,
          amount: f.amountUSD ? `$${parseFloat(f.amountUSD).toFixed(2)}` : f.amount,
        })),
        ...(quote.estimate.gasCosts ?? [])
          .filter(g => g.type === 'SUM' || g.type === 'SEND')
          .map(g => ({
            type: `Gas (${g.type})`,
            amount: g.amountUSD ? `$${parseFloat(g.amountUSD).toFixed(2)}` : g.amount,
          })),
      ]

      return {
        fees: fees.length > 0 ? fees : [{ type: 'Bridge', amount: 'Included' }],
        estimatedTime: quote.estimate.executionDuration,
      }
    },
    enabled:
      enabled &&
      !!address &&
      !!fromChainId &&
      !!toChainId &&
      !!fromToken &&
      !!toToken &&
      !!amount &&
      parseFloat(amount) > 0 &&
      sourceChain !== destChain,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
