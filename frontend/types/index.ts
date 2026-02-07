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
  acrossSwaps?: AcrossSwapInfo[]
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

export interface AcrossSwapInfo {
  inputToken: string
  outputToken: string
  inputAmount: string
  expectedOutput: string
  solverFee: string
  depositTxHash?: `0x${string}`
  fillTxHash?: `0x${string}`
  status: "pending" | "filled" | "failed"
}

// Across quote from API
export interface AcrossQuote {
  expectedOutput: string
  totalFee: string
  solverFeePercent: number
  estimatedFillTime: number
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