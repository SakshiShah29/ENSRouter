// Supported chains for USDC allocation
export const SUPPORTED_CHAINS = [
  'ethereum',
  'base',
  'arbitrum',
  'polygon',
  'optimism',
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
  chainAllocations: ChainAllocation[] // e.g., [{chain: 'base', percentage: 80}, {chain: 'arbitrum', percentage: 20}]
  fallbackChain?: SupportedChain
}

// Payment status type
export type PaymentStatus =
  | 'pending'
  | 'approving'
  | 'sending'
  | 'bridging'
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
  substatus?: string // LI.FI substatus for progress detail
  message?: string   // Human-readable progress message
}

// Bridge step from LI.FI SDK execution
export interface BridgeStep {
  name: string
  state: 'pending' | 'processing' | 'success' | 'error'
  txHash?: string
  explorerUrl?: string
  error?: string
  substatus?: string   // LI.FI substatus (e.g. 'WAIT_SOURCE_CONFIRMATIONS', 'WAIT_DESTINATION_TRANSACTION', 'BRIDGE_NOT_AVAILABLE')
  message?: string     // Human-readable progress message from LI.FI
  processType?: string // Raw LI.FI process type (TOKEN_ALLOWANCE, SWAP, CROSS_CHAIN, RECEIVING_CHAIN)
}

// Bridge result from LI.FI SDK execution
export interface BridgeResult {
  state: 'success' | 'error' | 'pending'
  steps: BridgeStep[]
}

// Bridge estimate from LI.FI SDK
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
