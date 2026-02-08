import { Router } from 'express';
import { createWebhookRouter } from './webhook';
import { createENSRouter } from './ens';
import { createTransactionRouter } from './transaction';
import { WebhookService } from '../services/WebhookService';
import { ENSService } from '../services/ENSService';

export const createRoutes = (
  webhookService: WebhookService,
  ensService: ENSService
): Router => {
  const router = Router();

  router.use('/webhook', createWebhookRouter(webhookService));
  router.use('/ens', createENSRouter(ensService));
  router.use('/transactions', createTransactionRouter());

  return router;
};