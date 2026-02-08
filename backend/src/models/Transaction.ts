import mongoose, { Schema, Document } from 'mongoose';
import { PaymentTransaction } from '../types';

export interface ITransactionDocument extends PaymentTransaction, Document {}

const PaymentStepSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      required: true,
    },
    timestamp: { type: Number, required: true },
    description: { type: String, required: true },
    chain: { type: String, required: true },
    amount: { type: String, required: true },
    txHash: { type: String },
    explorerUrl: { type: String },
    error: { type: String },
  },
  { _id: false }
);

const ChainTransferSchema: Schema = new Schema(
  {
    chain: { type: String, required: true },
    amount: { type: String, required: true },
    percentage: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      required: true,
    },
    steps: [PaymentStepSchema],
    bridgeResult: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { _id: false }
);

const TransactionSchema: Schema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sender: { type: String, required: true, lowercase: true },
    senderAddress: { type: String, required: true, lowercase: true },
    recipient: { type: String, required: true, lowercase: true, index: true },
    recipientAddress: { type: String, required: true, lowercase: true },
    totalAmountUSDC: { type: String, required: true },
    sourceChain: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approving', 'burning', 'attesting', 'minting', 'processing', 'completed', 'failed'],
      required: true,
      index: true,
    },
    chainTransfers: [ChainTransferSchema],
    createdAt: { type: Number, required: true },
    completedAt: { type: Number },
    failedAt: { type: Number },
    error: { type: String },
    notificationSent: { type: Boolean, default: false },
    notificationSentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Index for querying pending transactions
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ recipient: 1, status: 1 });

export default mongoose.model<ITransactionDocument>('Transaction', TransactionSchema);