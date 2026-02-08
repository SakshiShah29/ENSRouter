import { useEffect, useState } from 'react'
import { useConnectorClient, usePublicClient } from 'wagmi'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { createPublicClient, http } from 'viem'
import type { EIP1193Provider, Chain } from 'viem'

type EvmAdapter = Awaited<ReturnType<typeof createViemAdapterFromProvider>>

// RPC endpoints with longer timeouts for testnets
// Set via NEXT_PUBLIC_ALCHEMY_KEY environment variable
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

const RPC_OVERRIDES: Record<number, string> = ALCHEMY_KEY ? {
  11155111: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  84532: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  421614: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
} : {}

export function useEvmAdapter() {
  const { data: client } = useConnectorClient()
  const wagmiPublicClient = usePublicClient()
  const [evmAdapter, setEvmAdapter] = useState<EvmAdapter | null>(null)

  useEffect(() => {
    async function createAdapter() {
      if (!client) {
        setEvmAdapter(null)
        return
      }

      // Extract EIP-1193 provider from wagmi's connector client transport.
      // For injected wallets (MetaMask, etc.), the provider is nested in transport.
      const transport = client.transport as any
      const provider: EIP1193Provider | undefined =
        transport?.value?.provider ?? transport

      if (!provider) {
        console.warn('No EIP-1193 provider found on connector client')
        setEvmAdapter(null)
        return
      }

      try {
        // Create adapter with custom getPublicClient for longer timeouts
        const adapter = await createViemAdapterFromProvider({
          provider,
          // Provide custom public client with extended timeout for transaction confirmation
          getPublicClient: ({ chain }: { chain: Chain }) => {
            const chainId = chain.id
            const rpcUrl = RPC_OVERRIDES[chainId]

            // If we have a custom RPC, use it with extended timeout
            if (rpcUrl) {
              return createPublicClient({
                chain,
                transport: http(rpcUrl, {
                  timeout: 120_000, // 2 minutes timeout
                  retryCount: 5,
                  retryDelay: 2000,
                }),
              })
            }

            // Otherwise create a public client with the chain's default RPC but longer timeout
            const defaultRpc = chain.rpcUrls?.default?.http?.[0]
            if (defaultRpc) {
              return createPublicClient({
                chain,
                transport: http(defaultRpc, {
                  timeout: 120_000, // 2 minutes timeout
                  retryCount: 5,
                  retryDelay: 2000,
                }),
              })
            }

            // Fallback to basic public client
            return createPublicClient({
              chain,
              transport: http(undefined, {
                timeout: 120_000,
                retryCount: 5,
                retryDelay: 2000,
              }),
            })
          },
        })
        setEvmAdapter(adapter)
      } catch (err) {
        console.error('Failed to create EVM adapter:', err)
        setEvmAdapter(null)
      }
    }

    createAdapter()
  }, [client])

  return { evmAdapter, isReady: !!evmAdapter }
}
