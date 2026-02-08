// Chain types matching your frontend
export type SupportedChain = 
  | 'ethereum' 
  | 'ethereum-sepolia' 
  | 'base' 
  | 'base-sepolia' 
  | 'arbitrum' 
  | 'arbitrum-sepolia' 
  | 'arc-testnet';

// Bridge step types from Circle Bridge Kit
export interface BridgeStepPayload {
  name: 'approve' | 'burn' | 'fetchAttestation' | 'mint';
  state: 'pending' | 'processing' | 'success' | 'error';
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  data?: any;
  values?: {
    txHash?: string;
    data?: {
      attestation?: string;
      [key: string]: any;
    };
  };
}

// Payment transaction from frontend
export interface PaymentTransaction {
  id: string;
  sender: string;
  senderAddress: string;
  recipient: string; // ENS name
  recipientAddress: string;
  totalAmountUSDC: string;
  sourceChain: SupportedChain;
  status: 'pending' | 'approving' | 'burning' | 'attesting' | 'minting' | 'processing' | 'completed' | 'failed';
  chainTransfers: ChainTransfer[];
  createdAt: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
}

export interface ChainTransfer {
  chain: SupportedChain;
  amount: string;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  steps: PaymentStep[];
  bridgeResult?: any;
  error?: string;
}

export interface PaymentStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  description: string;
  chain: SupportedChain;
  amount: string;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

// ENS Text Records
export interface ENSTextRecords {
  description?: string;
  url?: string;
  avatar?: string;
  [key: string]: string | undefined;
}

// User mapping in database
export interface IUser {
  ensName: string;
  telegramUsername?: string;
  telegramChatId?: number;
  ethAddress: string;
  textRecords?: ENSTextRecords;
  createdAt: Date;
  updatedAt: Date;
}

// Notification queue item
export interface INotificationQueue {
  transactionId: string;
  recipientENS: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}