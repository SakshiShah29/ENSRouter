import { base, arbitrum, mainnet, baseSepolia } from 'wagmi/chains'
import { arcTestnet } from './wagmi'

export const SUPPORTED_CHAINS = {
  arc: arcTestnet,
    base: base,
  baseSepolia: baseSepolia,
  arbitrum: arbitrum,
  ethereum: mainnet,
} as const

export const DESTINATION_CHAINS = [
  { id: 'base', name: 'Base', chainId: 8453 },
    { id: 'arbitrum', name: 'Arbitrum', chainId: 42161 },
  { id: 'baseSepolia', name: 'Base  Sepolia', chainId: 84532 },
  { id: 'ethereum', name: 'Ethereum', chainId: 1 },
] as const

export const CHAIN_ID_TO_NAME: Record<number, string> = {
  8453: 'base',
    42161: 'arbitrum',
  84532: 'baseSepolia',
  1: 'ethereum',
  656476: 'arc',
}

export function getChainById(chainId: number) {
  return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId)
}

export function getChainByName(name: string) {
  return SUPPORTED_CHAINS[name as keyof typeof SUPPORTED_CHAINS]
}