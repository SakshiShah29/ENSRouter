// Token list with logos for different chains
// Using Sepolia testnet addresses

export interface Token {
  symbol: string
  name: string
  logo: string
  address?: string
}

// Base Sepolia testnet tokens
export const BASE_SEPOLIA_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    address: '0x4200000000000000000000000000000000000006', // Base Sepolia WETH
  },
]

// Ethereum Sepolia testnet tokens
export const SEPOLIA_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    address: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Sepolia DAI
  },
]

// Base Mainnet tokens (for production)
export const BASE_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    address: '0x4200000000000000000000000000000000000006',
  },
]

export const OPTIMISM_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  {
    symbol: 'OP',
    name: 'Optimism',
    logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
    address: '0x4200000000000000000000000000000000000042',
  },
]

export const ARBITRUM_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  },
]

export const POLYGON_TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  },
]

export function getAvailableTokens(chain: string): Token[] {
  switch (chain.toLowerCase()) {
    case 'base-sepolia':
    case 'basesepolia':
      return BASE_SEPOLIA_TOKENS
    case 'sepolia':
    case 'ethereum-sepolia':
      return SEPOLIA_TOKENS
    case 'base':
      return BASE_TOKENS
    case 'optimism':
    case 'op':
      return OPTIMISM_TOKENS
    case 'arbitrum':
    case 'arb':
      return ARBITRUM_TOKENS
    case 'polygon':
    case 'matic':
      return POLYGON_TOKENS
    default:
      return BASE_SEPOLIA_TOKENS // Default to testnet
  }
}