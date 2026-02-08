import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IUserDocument extends IUser, Document {}

const UserSchema: Schema = new Schema(
  {
    ensName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    telegramUsername: {
      type: String,
      sparse: true,
      index: true,
    },
    // This stores the Chat ID - could be private chat (user ID) or channel ID
    telegramChatId: {
      type: Number,
      sparse: true,
      index: true,
    },
    // Track if this is a channel/group or private chat
    chatType: {
      type: String,
      enum: ['private', 'group', 'channel'],
      default: 'private',
    },
    ethAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    textRecords: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // For verification purposes (optional)
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
UserSchema.index({ ensName: 1, telegramChatId: 1 });
UserSchema.index({ telegramChatId: 1, chatType: 1 });

export default mongoose.model<IUserDocument>('User', UserSchema);