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


export const CHAIN_ID_TO_KEY: Record<number, string> = {
  84532: 'base-sepolia',    // Base Sepolia
  11155111: 'sepolia',      // Ethereum Sepolia
  421614: 'arbitrum-sepolia', // Arbitrum Sepolia
  5003: 'mantle-sepolia',   // Mantle Sepolia
}


export const CHAIN_KEY_TO_CIRCLE: Record<string, string> = {
  'base-sepolia': 'Base_Sepolia',
  'sepolia': 'Ethereum',
  'arbitrum-sepolia': 'Arbitrum',
  'mantle-sepolia': 'Mantle_Testnet',
}

export function getCircleChainName(chainKey: string): string {
  return CHAIN_KEY_TO_CIRCLE[chainKey] || chainKey
}