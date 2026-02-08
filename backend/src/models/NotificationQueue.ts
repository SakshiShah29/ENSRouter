import mongoose, { Schema, Document } from 'mongoose';
import { INotificationQueue } from '../types';

export interface INotificationQueueDocument extends INotificationQueue, Document {}

const NotificationQueueSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    recipientENS: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttempt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

// Index for processing pending notifications
NotificationQueueSchema.index({ status: 1, attempts: 1, createdAt: 1 });

export default mongoose.model<INotificationQueueDocument>('NotificationQueue', NotificationQueueSchema);