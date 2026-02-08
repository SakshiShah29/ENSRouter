import { createConfig, EVM } from '@lifi/sdk'
import {
  getWalletClient as wagmiGetWalletClient,
  switchChain as wagmiSwitchChain,
} from '@wagmi/core'
import { config as wagmiConfig } from './wagmi'

let initialized = false

export function initLiFi() {
  if (initialized) return
  initialized = true

  createConfig({
    integrator: 'ENSRouter',
    providers: [
      EVM({
        getWalletClient: () => wagmiGetWalletClient(wagmiConfig),
        switchChain: async (chainId) => {
          const chain = await wagmiSwitchChain(wagmiConfig, { chainId: chainId as 1 | 8453 | 42161 | 137 | 10 })
          return wagmiGetWalletClient(wagmiConfig, { chainId: chain.id })
        },
      }),
    ],
  })
}

// Chain key → numeric chain ID mapping for LI.FI quote requests
export const CHAIN_KEY_TO_CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
}
