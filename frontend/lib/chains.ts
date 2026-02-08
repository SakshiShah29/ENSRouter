export interface Chain {
  id: string
  name: string
  logo?: string
}

export const DESTINATION_CHAINS: Chain[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    id: 'base',
    name: 'Base',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
  },
]
