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

// Payment transaction state
export interface PaymentTransaction {
  id: string
  sender: `0x${string}`
  recipient: string             // ENS name
  recipientAddress: `0x${string}`
  amountUSDC: string           // Wei format
  status: PaymentStatus
  steps: PaymentStep[]
  bridgeResult?: BridgeResult
  createdAt: number
  completedAt?: number
}

export enum PaymentStatus {
  PENDING = "pending",
  APPROVING = "approving",
  BRIDGING = "bridging",
  SWAPPING = "swapping",
  COMPLETED = "completed",
  FAILED = "failed"
}

export interface PaymentStep {
  name: string
  status: "pending" | "processing" | "completed" | "failed"
  txHash?: `0x${string}`
  timestamp: number
  error?: string
}

// Bridge estimate from Circle Bridge Kit
export interface BridgeEstimate {
  fees: Array<{
    type: string      // "provider" | "protocol"
    amount: string    // fee in USDC
  }>
  estimatedTime: number  // seconds
}

// Bridge result from Circle Bridge Kit
export interface BridgeResult {
  steps: Array<{
    status: string
    explorerUrl?: string
  }>
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