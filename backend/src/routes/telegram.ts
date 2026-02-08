import { Router } from 'express';
import { TelegramService } from '../services/TelegramService';

export const createTelegramRouter = (telegramService: TelegramService): Router => {
  const router = Router();

  // Telegram sends updates to this endpoint
  router.post('/webhook', telegramService.getWebhookCallback());

  return router;
};
