import { Request, Response } from 'express';
import crypto from 'crypto';
import { Transaction, NotificationQueue, User } from '../models';
import { TelegramService } from './TelegramService';
import { BridgeStepPayload, PaymentTransaction, SupportedChain } from '../types';

interface BridgeWebhookPayload {
  event: 'bridge.step' | 'bridge.complete' | 'bridge.failed';
  transactionId: string;
  step?: BridgeStepPayload;
  transaction?: PaymentTransaction;
  timestamp: number;
  signature: string;
}

export class WebhookService {
  private telegramService: TelegramService;
  private webhookSecret: string;

  constructor(telegramService: TelegramService, webhookSecret: string) {
    this.telegramService = telegramService;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Handle incoming webhook from frontend
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    console.log('🔔 Webhook received:', {
      event: req.body?.event,
      transactionId: req.body?.transactionId,
      hasSignature: !!req.headers['x-webhook-signature'],
      timestamp: new Date().toISOString(),
    });

    try {
      // Verify signature
      const signature = req.headers['x-webhook-signature'] as string;
      if (!signature) {
        console.error('❌ Missing signature header');
        res.status(401).json({ error: 'Missing signature' });
        return;
      }

      if (!this.verifySignature(req.body, signature)) {
        console.error('❌ Invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      console.log('✅ Signature verified');

      const payload: BridgeWebhookPayload = req.body;

      // Process based on event type
      switch (payload.event) {
        case 'bridge.step':
          console.log('📝 Processing bridge.step (no notification)');
          await this.handleStepUpdate(payload);
          break;
        case 'bridge.complete':
          console.log('🎉 Processing bridge.complete (will notify)');
          await this.handleComplete(payload);
          break;
        case 'bridge.failed':
          console.log('💥 Processing bridge.failed (will notify)');
          await this.handleFailed(payload);
          break;
        default:
          console.log('⚠️ Unknown event type:', payload.event);
      }

      console.log('✅ Webhook processed successfully');
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle step update (intermediate steps).
   * ✅ CHANGED: No longer sends notifications, only updates database
   */
  private async handleStepUpdate(payload: BridgeWebhookPayload): Promise<void> {
    const { transactionId, step, transaction } = payload;

    console.log('📝 Step update:', {
      transactionId,
      stepName: step?.name,
      stepState: step?.state,
      hasFullTransaction: !!transaction,
    });

    // Prefer full transaction update so server stays in sync with frontend
    if (transaction) {
      console.log('💾 Upserting full transaction:', {
        id: transaction.id,
        status: transaction.status,
        chainTransfers: transaction.chainTransfers.length,
      });

      await Transaction.findOneAndUpdate(
        { id: transactionId },
        {
          $set: {
            sender: transaction.sender,
            recipient: transaction.recipient,
            recipientAddress: transaction.recipientAddress,
            totalAmountUSDC: transaction.totalAmountUSDC,
            sourceChain: transaction.sourceChain,
            status: transaction.status,
            chainTransfers: transaction.chainTransfers,
            createdAt: transaction.createdAt,
            ...(transaction.completedAt != null && { completedAt: transaction.completedAt }),
            ...(transaction.failedAt != null && { failedAt: transaction.failedAt }),
            ...(transaction.error != null && { error: transaction.error }),
          },
        },
        { upsert: true, new: true }
      );

      console.log('✅ Transaction updated (no notification sent)');
      return;
    }

    if (!step) {
      console.log('⚠️ No step or transaction data provided');
      return;
    }

    // Fallback: partial step update
    console.log('📝 Attempting partial step update (fallback)');
    await Transaction.findOneAndUpdate(
      { id: transactionId },
      {
        $set: {
          [`chainTransfers.$[transfer].steps.$[step].status`]: step.state === 'success' ? 'completed' :
                                                             step.state === 'error' ? 'failed' : 'processing',
          [`chainTransfers.$[transfer].steps.$[step].txHash`]: step.txHash,
          [`chainTransfers.$[transfer].steps.$[step].explorerUrl`]: step.explorerUrl,
          [`chainTransfers.$[transfer].steps.$[step].error`]: step.error,
          [`chainTransfers.$[transfer].steps.$[step].timestamp`]: Date.now(),
        },
      },
      {
        arrayFilters: [
          { 'transfer.chain': this.inferChainFromStep(step) },
          { 'step.name': this.mapStepName(step.name) },
        ],
      }
    );
  }

  /**
   * Handle bridge completion
   * ✅ CHANGED: This is the ONLY place that sends notifications
   */
  private async handleComplete(payload: BridgeWebhookPayload): Promise<void> {
    const { transactionId, transaction } = payload;
    if (!transaction) {
      console.log('⚠️ No transaction data for completion');
      return;
    }

    console.log('🎉 Completing transaction:', {
      id: transactionId,
      recipient: transaction.recipient,
      totalAmount: transaction.totalAmountUSDC,
    });

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { id: transactionId },
      {
        $set: {
          sender: transaction.sender,
          recipient: transaction.recipient,
          recipientAddress: transaction.recipientAddress,
          totalAmountUSDC: transaction.totalAmountUSDC,
          sourceChain: transaction.sourceChain,
          status: 'completed',
          completedAt: transaction.completedAt || Date.now(),
          chainTransfers: transaction.chainTransfers,
          createdAt: transaction.createdAt,
          notificationSent: false,
        }
      },
      { upsert: true, new: true }
    );

    console.log('✅ Transaction marked as completed');

    // Add to notification queue
    await NotificationQueue.findOneAndUpdate(
      { transactionId },
      {
        transactionId,
        recipientENS: transaction.recipient,
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
      },
      { upsert: true }
    );

    console.log('📬 Added to notification queue');

    // Try to send notification immediately
    console.log('📨 Attempting immediate notification...');
    await this.processNotification(transactionId);
  }

  /**
   * Handle bridge failure
   * ✅ Sends notification for failures
   */
  private async handleFailed(payload: BridgeWebhookPayload): Promise<void> {
    const { transactionId, transaction } = payload;
    
    console.log('💥 Transaction failed:', {
      id: transactionId,
      error: transaction?.error,
    });

    await Transaction.findOneAndUpdate(
      { id: transactionId },
      {
        $set: {
          status: 'failed',
          failedAt: Date.now(),
          error: transaction?.error || 'Unknown error',
          chainTransfers: transaction?.chainTransfers || [],
          ...(transaction && {
            sender: transaction.sender,
            recipient: transaction.recipient,
            recipientAddress: transaction.recipientAddress,
            totalAmountUSDC: transaction.totalAmountUSDC,
            sourceChain: transaction.sourceChain,
            createdAt: transaction.createdAt,
          }),
        }
      },
      { upsert: true }
    );

    console.log('✅ Transaction marked as failed');

    // Notify user about the failed transaction
    if (transaction) {
      await NotificationQueue.findOneAndUpdate(
        { transactionId },
        {
          transactionId,
          recipientENS: transaction.recipient,
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
        { upsert: true }
      );
      
      console.log('📨 Attempting to notify user about failure...');
      await this.processNotification(transactionId);
    }
  }

  /**
   * Process notification for a transaction
   */
  async processNotification(transactionId: string): Promise<void> {
    try {
      console.log('📨 Processing notification for transaction:', transactionId);

      const queueItem = await NotificationQueue.findOne({ transactionId });
      if (!queueItem) {
        console.log('⚠️ No queue item found');
        return;
      }

      if (queueItem.status === 'sent') {
        console.log('✅ Notification already sent');
        return;
      }

      const transaction = await Transaction.findOne({ id: transactionId });
      if (!transaction) {
        console.log('⚠️ Transaction not found in database');
        return;
      }

      console.log('📋 Transaction details:', {
        recipient: transaction.recipient,
        status: transaction.status,
        totalAmount: transaction.totalAmountUSDC,
      });

      // Update attempt count
      await NotificationQueue.updateOne(
        { transactionId },
        { $inc: { attempts: 1 }, lastAttempt: new Date() }
      );

      console.log('📊 Attempt:', queueItem.attempts + 1);

      // Prepare summary
      const summary = {
        id: transaction.id,
        sender: transaction.sender,
        totalAmount: transaction.totalAmountUSDC,
        sourceChain: transaction.sourceChain as SupportedChain,
        status: transaction.status as 'pending' | 'approving' | 'burning' | 'attesting' | 'minting' | 'processing' | 'completed' | 'failed',
        transfers: transaction.chainTransfers.map(t => ({
          chain: t.chain as SupportedChain,
          amount: t.amount,
          percentage: t.percentage,
          txHash: t.steps.find(s => s.txHash)?.txHash,
          explorerUrl: t.steps.find(s => s.explorerUrl)?.explorerUrl,
          status: t.status,
        })),
        completedAt: transaction.completedAt,
      };

      console.log('📱 Sending Telegram notification to:', transaction.recipient);

      // Send notification
      const sent = await this.telegramService.sendPaymentNotification(
        transaction.recipient,
        summary
      );

      if (sent) {
        console.log('✅ Notification sent successfully');
        
        await NotificationQueue.updateOne(
          { transactionId },
          { status: 'sent', sentAt: new Date() }
        );
        
        await Transaction.updateOne(
          { id: transactionId },
          { notificationSent: true, notificationSentAt: new Date() }
        );
      } else {
        console.log('⚠️ Notification failed to send');
        
        // Will retry on next cron job if attempts < max
        const maxAttempts = 5;
        if (queueItem.attempts + 1 >= maxAttempts) {
          console.log('❌ Max attempts reached');
          await NotificationQueue.updateOne(
            { transactionId },
            { status: 'failed', error: 'Max attempts reached' }
          );
        }
      }
    } catch (error) {
      console.error('❌ Error processing notification:', error);
      await NotificationQueue.updateOne(
        { transactionId },
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(body: any, signature: string): boolean {
    if (!signature) return false;
    
    try {
      // Remove signature field from body before verifying
      const { signature: _, ...bodyWithoutSig } = body;
      
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(bodyWithoutSig))
        .digest('hex');
      
      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(hmac)
      );
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Map Bridge Kit step names to our step names
   */
  private mapStepName(name: string): string {
    const map: Record<string, string> = {
      'approve': 'Approve USDC',
      'burn': 'Burn USDC',
      'fetchAttestation': 'Attestation',
      'mint': 'Mint USDC',
    };
    return map[name] || name;
  }

  /**
   * Infer chain from step (simplified logic)
   */
  private inferChainFromStep(step: BridgeStepPayload): string {
    // This is simplified - in production, you'd track which chain each step belongs to
    return step.name === 'approve' || step.name === 'burn' ? 'source' : 'dest';
  }
}

export default WebhookService;