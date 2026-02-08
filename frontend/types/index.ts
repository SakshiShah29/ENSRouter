export interface ParsedProfile {
  ensName: string
  address: `0x${string}`
  chain: string
  allocations: TokenAllocation[]
  slippageTolerance: number
  autoSwapEnabled: boolean
  fallbackChain?: string
}

// Token allocation
export interface TokenAllocation {
  token: string      // "USDC", "ETH", "USDT"
  percentage: number // 0-100
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
    type: string      // "provider" | "protocol"
    amount: string    // fee in USDC
  }>
  estimatedTime: number  // seconds
}

// Payment transaction state
export interface PaymentTransaction {
  id: string
  sender: `0x${string}`
  recipient: string
  recipientAddress: `0x${string}`
  amountUSDC: string
  status: PaymentStatus
  steps: PaymentStep[]
  createdAt: number
  completedAt?: number
  sourceChain?: string
  destChain?: string
  bridgeResult?: BridgeResult
}

// Form types
export interface ProfileFormData {
  ensName: string
  chain: string
  allocations: TokenAllocation[]
  slippageTolerance: number
  autoSwapEnabled: boolean
}

export interface SendFormData {
  recipientENS: string
  amount: string
}