import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum, sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains'
import { http } from 'wagmi'

export const arcTestnet = {
  id: 656476,
  name: 'Arc Testnet',
  nativeCurrency: { 
    name: 'USDC', 
    symbol: 'USDC', 
    decimals: 6 
  },
  rpcUrls: {
    default: { 
      http: ['https://sepolia-rollup.arbitrum.io/rpc'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Arc Explorer', 
      url: 'https://testnet-explorer.arc.network' 
    },
  },
  testnet: true,
} as const

export const config = getDefaultConfig({
  appName: 'ChainRouter',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [
    mainnet,      // For ENS resolution
    sepolia,      // For ENS testnet
    arcTestnet,   // For USDC deposits
    base,         // Destination chain
    baseSepolia,  // Destination chain (testnet)
    arbitrum,     // Destination chain
    arbitrumSepolia, // Destination chain (testnet)
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arcTestnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
})