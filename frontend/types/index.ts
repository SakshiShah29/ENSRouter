// Supported chains
export const SUPPORTED_CHAINS = [
  'ethereum',
  'base',
  'arbitrum',
  'polygon',
  'optimism',
] as const

export type SupportedChain = typeof SUPPORTED_CHAINS[number]

// Token allocation - what percentage of incoming USDC to hold/swap into each token
export interface TokenAllocation {
  token: string       // e.g. "USDC", "ETH", "DAI"
  percentage: number  // 0-100
}

export interface ParsedProfile {
  ensName: string
  address: `0x${string}`
  chain: SupportedChain                // Single destination chain
  tokenAllocations: TokenAllocation[]  // e.g., [{token: 'USDC', percentage: 60}, {token: 'ETH', percentage: 40}]
  slippageTolerance: number            // e.g. 0.5 (percent)
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

// Chain transfer - represents a single token transfer to the destination chain
export interface ChainTransfer {
  chain: SupportedChain
  token: string     // Destination token symbol (e.g. "ETH", "USDC", "DAI")
  amount: string    // USDC amount being sent for this allocation
  percentage: number
  status: PaymentStatus
  steps: PaymentStep[]
  bridgeResult?: BridgeResult
}

// Payment transaction state
export interface PaymentTransaction {
  id: string
  sender: `0x${string}`
  recipient: string
  recipientAddress: `0x${string}`
  totalAmountUSDC: string
  sourceChain: string
  status: PaymentStatus
  chainTransfers: ChainTransfer[]
  createdAt: number
  completedAt?: number
}

// Form types
export interface ProfileFormData {
  ensName: string
  chain: SupportedChain
  allocations: TokenAllocation[]
  slippageTolerance: number
}

export interface SendFormData {
  recipientENS: string
  amount: string
}
