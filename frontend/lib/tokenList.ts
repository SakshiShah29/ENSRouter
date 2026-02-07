export interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  logo?: string
}

export const TOKENS_BY_CHAIN: Record<string, Token[]> = {
  base: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      decimals: 6,
    },
    ],
    baseSepolia: [
        {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      decimals: 6,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',
      decimals: 6,
    },
    ],
  arbitrum: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      decimals: 6,
    },
  ],
  ethereum: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
    },
  ],
}

export function getTokenBySymbol(chain: string, symbol: string): Token | undefined {
  return TOKENS_BY_CHAIN[chain]?.find(t => t.symbol === symbol)
}

export function getAvailableTokens(chain: string): Token[] {
  return TOKENS_BY_CHAIN[chain] || []
}