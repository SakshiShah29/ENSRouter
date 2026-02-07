export interface Chain {
  id: string
  name: string
  logo?: string
  isTestnet?: boolean
}

export const DESTINATION_CHAINS: Chain[] = [
  {
    id: 'base-sepolia',
    name: 'Base Sepolia',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', // Placeholder
    isTestnet: true,
  },
  {
    id: 'sepolia',
    name: 'Ethereum Sepolia',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    isTestnet: true,
  },
  {
    id: 'base',
    name: 'Base',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', // Placeholder
    isTestnet: false,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
    isTestnet: false,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    isTestnet: false,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
    isTestnet: false,
  },
]