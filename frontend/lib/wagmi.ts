import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum, polygon, optimism } from 'wagmi/chains'
import { http } from 'wagmi'

export const config = getDefaultConfig({
  appName: 'ChainRouter',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [
    mainnet,      // For ENS resolution
    base,         // Destination chain
    arbitrum,     // Destination chain
    polygon,      // Destination chain
    optimism,     // Destination chain
  ],
  transports: {
    [mainnet.id]: http(process.env.ETHEREUM_RPC_URL!),
    [base.id]: http(process.env.BASE_RPC_URL!),
    [arbitrum.id]: http(process.env.ARB_RPC_URL!),
    [polygon.id]: http(process.env.POLYGON_RPC_URL!),
    [optimism.id]: http(process.env.OPT_RPC_URL!),
  },
  ssr: true,
})