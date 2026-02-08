import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ENSService } from './services/ENSService';
import { TelegramService } from './services/TelegramService';
import { WebhookService } from './services/WebhookService';
import { createRoutes } from './routes';
import { NotificationQueue } from './models';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required env vars
const requiredEnvVars = ['MONGODB_URI', 'TELEGRAM_BOT_TOKEN', 'WEBHOOK_SECRET', 'ETHEREUM_RPC_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// ENS resolution uses Sepolia RPC (same as frontend) so .eth names resolve correctly.
// Override with ENS_RPC_URL if you use a different ENS chain.
const ENS_RPC_URL =
  process.env.ENS_RPC_URL ||
  process.env.SEPOLIA_RPC_URL ||
  'https://rpc.sepolia.org';

// Initialize services
const ensService = new ENSService(ENS_RPC_URL);
const telegramService = new TelegramService(process.env.TELEGRAM_BOT_TOKEN!, ensService);
const webhookService = new WebhookService(telegramService, process.env.WEBHOOK_SECRET!);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-webhook-signature'],
  credentials: true,
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
  });
  next();
});
// Routes
app.use('/api', createRoutes(webhookService, ensService));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    console.log(`Starting server (port ${PORT})...`);

    // Connect to database
    await connectDatabase(process.env.MONGODB_URI!);

    // Start HTTP server first so the port is visible even if Telegram hangs
    app.listen(PORT, () => {
      console.log('');
      console.log('--- Server started ---');
      console.log(`Server is running on port ${PORT}`);
      console.log(`Local:    http://localhost:${PORT}`);
      console.log(`Webhook:  http://localhost:${PORT}/api/webhook/bridge-events`);
      console.log('------------------------');
      console.log('');
    });

    // Start Telegram bot (after server is listening)
    console.log('Starting Telegram bot...');
    await telegramService.start();
    console.log('Telegram bot ready.');

    // Start notification processor (cron-like job)
    startNotificationProcessor();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Background job to process pending notifications
const startNotificationProcessor = () => {
  const PROCESS_INTERVAL = 30 * 1000; // 30 seconds
  
  setInterval(async () => {
    try {
      const pending = await NotificationQueue.find({ 
        status: 'pending',
        attempts: { $lt: 5 }
      }).limit(10);

      for (const item of pending) {
        await webhookService.processNotification(item.transactionId);
      }
    } catch (error) {
      console.error('Notification processor error:', error);
    }
  }, PROCESS_INTERVAL);
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  telegramService.stop();
  await disconnectDatabase();
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start
startServer();