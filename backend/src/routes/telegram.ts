import { Router } from 'express';
import { TelegramService } from '../services/TelegramService';

export const createTelegramRouter = (telegramService: TelegramService): Router => {
  const router = Router();

  // Mount Telegraf's webhook handler directly — it handles the POST internally
  router.use('/webhook', telegramService.getWebhookCallback());

  return router;
};
