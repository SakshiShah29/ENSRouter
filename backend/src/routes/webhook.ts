import { Router } from 'express';
import { WebhookService } from '../services/WebhookService';

export const createWebhookRouter = (webhookService: WebhookService): Router => {
  const router = Router();

  // Main webhook endpoint
  router.post('/bridge-events', (req, res) => webhookService.handleWebhook(req, res));

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};