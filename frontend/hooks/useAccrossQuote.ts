import { useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import type { AcrossQuote } from '@/types'

interface AcrossQuoteParams {
  inputAmount: string      // USDC amount as string (e.g., "100")
  outputToken: string      // Token symbol (e.g., "ETH")
  chainId: number         // Destination chain ID
  recipientAddress: `0x${string}`
  enabled?: boolean
}

export function useAcrossQuote({
  inputAmount,
  outputToken,
  chainId,
  recipientAddress,
  enabled = true
}: AcrossQuoteParams) {
  return useQuery({
    queryKey: ['across-quote', inputAmount, outputToken, chainId, recipientAddress],
    queryFn: async (): Promise<AcrossQuote> => {
      const response = await fetch('/api/quote-across', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputAmount: parseUnits(inputAmount, 6).toString(), // USDC decimals
          outputToken,
          chainId,
          recipientAddress,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get quote')
      }

      return response.json()
    },
    enabled: enabled && !!inputAmount && parseFloat(inputAmount) > 0 && !!outputToken,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 30_000,
  })
}