import { Router } from 'express';
import { Transaction } from '../models';
import { PaymentTransaction } from '../types';

export const createTransactionRouter = (): Router => {
  const router = Router();

  // Create a new transaction (called by frontend when payment starts)
  router.post('/', async (req, res) => {
    try {
      const body = req.body as PaymentTransaction & { sender?: string };
      const {
        id,
        sender,
        recipient,
        recipientAddress,
        totalAmountUSDC,
        sourceChain,
        status,
        chainTransfers,
        createdAt,
      } = body;

      if (!id || !sender || !recipient || !recipientAddress || !totalAmountUSDC || !sourceChain || !chainTransfers || createdAt == null) {
        return res.status(400).json({ error: 'Missing required fields: id, sender, recipient, recipientAddress, totalAmountUSDC, sourceChain, chainTransfers, createdAt' });
      }

      const doc = {
        id,
        sender: sender.toLowerCase(),
        senderAddress: (body.senderAddress || sender).toLowerCase(),
        recipient: recipient.toLowerCase(),
        recipientAddress: recipientAddress.toLowerCase(),
        totalAmountUSDC,
        sourceChain,
        status: status || 'pending',
        chainTransfers,
        createdAt,
        notificationSent: false,
      };

      await Transaction.findOneAndUpdate(
        { id },
        { $set: doc },
        { upsert: true, new: true }
      );

      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  });

  // Update transaction (full replace - used by webhook step updates)
  router.put('/:id', async (req, res) => {
    try {
      const body = req.body as Partial<PaymentTransaction> & { sender?: string; senderAddress?: string };
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Missing transaction id' });

      const update: Record<string, unknown> = {};
      if (body.status != null) update.status = body.status;
      if (body.chainTransfers != null) update.chainTransfers = body.chainTransfers;
      if (body.completedAt != null) update.completedAt = body.completedAt;
      if (body.failedAt != null) update.failedAt = body.failedAt;
      if (body.error != null) update.error = body.error;

      const tx = await Transaction.findOneAndUpdate(
        { id },
        { $set: update },
        { new: true }
      );

      if (!tx) return res.status(404).json({ error: 'Transaction not found' });
      res.json(tx);
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  });

  // Get pending notifications (for cron job) - must be before /:id
  router.get('/pending/notifications', async (req, res) => {
    try {
      const pending = await Transaction.find({
        status: 'completed',
        notificationSent: false,
      }).limit(100);

      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending notifications' });
    }
  });

  // Get transactions by recipient ENS
  router.get('/recipient/:ensName', async (req, res) => {
    try {
      const txs = await Transaction.find({
        recipient: req.params.ensName.toLowerCase(),
      })
        .sort({ createdAt: -1 })
        .limit(50);

      res.json(txs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Get transaction by ID
  router.get('/:id', async (req, res) => {
    try {
      const tx = await Transaction.findOne({ id: req.params.id });
      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(tx);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });

  return router;
};