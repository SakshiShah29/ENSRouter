import { useEffect, useState } from 'react'
import { useConnectorClient } from 'wagmi'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import type { EIP1193Provider } from 'viem'

type EvmAdapter = Awaited<ReturnType<typeof createViemAdapterFromProvider>>

export function useEvmAdapter() {
  const { data: client } = useConnectorClient()
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
        const adapter = await createViemAdapterFromProvider({ provider })
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
