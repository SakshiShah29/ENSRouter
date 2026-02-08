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

// Use Render's PORT or default
const PORT = parseInt(process.env.PORT || '3000');

// Validate required env vars
const requiredEnvVars = ['MONGODB_URI', 'TELEGRAM_BOT_TOKEN', 'WEBHOOK_SECRET', 'ETHEREUM_RPC_URL', 'BACKEND_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// ENS resolution RPC
const ENS_RPC_URL =
  process.env.ENS_RPC_URL ||
  process.env.ETHEREUM_RPC_URL ||
  'https://eth.llamarpc.com';

// Initialize services
const ensService = new ENSService(ENS_RPC_URL);
const telegramService = new TelegramService(process.env.TELEGRAM_BOT_TOKEN!, ensService);
const webhookService = new WebhookService(telegramService, process.env.WEBHOOK_SECRET!);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-webhook-signature'],
  credentials: true,
}));
app.use(express.json());

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint (Render needs this)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', createRoutes(webhookService, ensService, telegramService));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Starting server...`);
    console.log(`Port: ${PORT}`);
    console.log(`Node env: ${process.env.NODE_ENV || 'development'}`);

    // Connect to database
    console.log('Connecting to MongoDB...');
    await connectDatabase(process.env.MONGODB_URI!);
    console.log('MongoDB connected');

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
    });

    // Start Telegram bot via webhook
    console.log('Setting up Telegram webhook...');
    await telegramService.setWebhook(process.env.BACKEND_URL!);

    // Start notification processor
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
  console.log(`\n${signal} received. Shutting down...`);
  await telegramService.stop();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start
startServer();