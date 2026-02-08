// Supported chains for USDC allocation (Circle CCTP supported testnets)
export const SUPPORTED_CHAINS = [
  'ethereum-sepolia',
  'base-sepolia',
  'arbitrum-sepolia',
  'arc-testnet',
] as const

export type SupportedChain = typeof SUPPORTED_CHAINS[number]

// Chain allocation - how much USDC percentage on which chain
export interface ChainAllocation {
  chain: SupportedChain
  percentage: number // 0-100
}

export interface ParsedProfile {
  ensName: string
  address: `0x${string}`
  chainAllocations: ChainAllocation[] // e.g., [{chain: 'base-sepolia', percentage: 80}, {chain: 'arbitrum-sepolia', percentage: 20}]
  fallbackChain?: SupportedChain
}

// Payment status type
export type PaymentStatus =
  | 'pending'
  | 'approving'
  | 'burning'
  | 'attesting'
  | 'minting'
  | 'processing'
  | 'completed'
  | 'failed'

// Payment step with proper tracking
export interface PaymentStep {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  txHash?: `0x${string}`
  explorerUrl?: string
  timestamp: number
  error?: string
  description?: string
  chain?: string // Which chain this step is for
  amount?: string // Amount for this specific step
}

// Bridge step from Circle Bridge Kit
export interface BridgeStep {
  name: string
  state: 'pending' | 'processing' | 'success' | 'error'
  txHash?: string
  explorerUrl?: string
  error?: string
  data?: Record<string, unknown>
}

// Bridge result from Circle Bridge Kit
export interface BridgeResult {
  state: 'success' | 'error' | 'pending'
  steps: BridgeStep[]
}

// Bridge estimate from Circle Bridge Kit
export interface BridgeEstimate {
  fees: Array<{
    type: string
    amount: string
  }>
  estimatedTime: number
}

// Chain transfer - represents a single transfer to a chain
export interface ChainTransfer {
  chain: SupportedChain
  amount: string // USDC amount for this chain
  percentage: number
  status: PaymentStatus
  steps: PaymentStep[]
  bridgeResult?: BridgeResult
}

// Payment transaction state - now supports multi-chain
export interface PaymentTransaction {
  id: string
  sender: `0x${string}`
  recipient: string
  recipientAddress: `0x${string}`
  totalAmountUSDC: string
  sourceChain: string
  status: PaymentStatus
  chainTransfers: ChainTransfer[] // Multiple chain destinations
  createdAt: number
  completedAt?: number
}

// Form types
export interface ProfileFormData {
  ensName: string
  chainAllocations: ChainAllocation[]
  fallbackChain?: SupportedChain
}

export interface SendFormData {
  recipientENS: string
  amount: string
}
