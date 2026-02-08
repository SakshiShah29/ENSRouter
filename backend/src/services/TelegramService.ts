import { Telegraf, Context, Markup } from 'telegraf';
import { User, Transaction } from '../models';
import { ENSService } from './ENSService';
import { 
  SupportedChain, 
  PaymentTransaction, 
  ChainTransfer,
  PaymentStep 
} from '../types';

// Status type matching PaymentTransaction
type PaymentStatus = 'pending' | 'approving' | 'burning' | 'attesting' | 'minting' | 'processing' | 'completed' | 'failed';

// TransactionSummary for notifications - maps to PaymentTransaction
interface TransactionSummary {
  id: string;
  sender: string;
  totalAmount: string;
  sourceChain: SupportedChain;
  status: PaymentStatus;
  transfers: Array<{
    chain: SupportedChain;
    amount: string;
    percentage: number;
    txHash?: string;
    explorerUrl?: string;
    status: PaymentStatus;
  }>;
  completedAt?: number;
  failedAt?: number;
  error?: string;
}

export class TelegramService {
  private bot: Telegraf<Context>;
  private ensService: ENSService;
  private isRunning: boolean = false;

  constructor(botToken: string, ensService: ENSService) {
    this.bot = new Telegraf(botToken);
    this.ensService = ensService;
    this.setupCommands();
    this.setupActions();
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Register bot commands with Telegram so they appear in the menu with descriptions
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot and see how to receive USDC payment notifications across chains' },
        { command: 'link', description: 'Link your ENS name (e.g. vitalik.eth) to receive payment alerts' },
        { command: 'unlink', description: 'Disconnect your ENS from this Telegram account' },
        { command: 'status', description: 'Check the status of a payment (e.g. /status tx_123)' },
        { command: 'help', description: 'Show available commands and usage' },
      ]);

      // Use polling for simplicity (use webhooks in production)
      await this.bot.launch();
      this.isRunning = true;

      console.log('Telegram bot started successfully');

      // Enable graceful stop
      process.once('SIGINT', () => this.stop());
      process.once('SIGTERM', () => this.stop());
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  stop(): void {
    if (!this.isRunning) return;
    
    try {
      this.bot.stop('SIGTERM');
      this.isRunning = false;
      console.log('Telegram bot stopped');
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  }

  /**
   * Setup bot commands
   */
  private setupCommands(): void {
    // Start command
    this.bot.command('start', async (ctx) => {
      try {
        const welcomeMessage = 
`🌉 *Welcome to BridgePay Bot\\!*

I notify you when someone sends you USDC payments across chains\\.

*Commands:*
/link \\<ens_name\\> \\- Link your ENS name to this Telegram
/unlink \\- Unlink your ENS from Telegram
/status \\<tx_id\\> \\- Check transaction status
/help \\- Show this help message

*How it works:*
1\\. Link your ENS name using /link
2\\. When someone pays you via BridgePay, I'll notify you here
3\\. You'll receive details of which chains received how much USDC`;

        await ctx.replyWithMarkdownV2(welcomeMessage);
      } catch (error) {
        console.error('Error in start command:', error);
        await ctx.reply('❌ An error occurred. Please try again.');
      }
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      try {
        const helpMessage = 
`*Available Commands:*

/link \\<ens\\.name\\> \\- Connect your ENS to receive notifications
/unlink \\- Disconnect your ENS
/status \\<transaction_id\\> \\- Check payment status
/help \\- Show this help`;

        await ctx.replyWithMarkdownV2(helpMessage);
      } catch (error) {
        console.error('Error in help command:', error);
        await ctx.reply('❌ An error occurred. Please try again.');
      }
    });

    // Link ENS to Telegram
    this.bot.command('link', async (ctx) => {
      try {
        // Check if message exists and is a text message
        if (!ctx.message || !('text' in ctx.message)) {
          return await ctx.reply('❌ Invalid message format.');
        }

        const messageText = ctx.message.text;
        const parts = messageText.split(' ');
        
        if (parts.length < 2) {
          return await ctx.reply('❌ Please provide your ENS name.\nExample: /link vitalik.eth');
        }

        const ensName = parts[1].toLowerCase().trim();

        // Validate ENS format (basic check)
        if (!ensName.includes('.') || ensName.length < 4) {
          return await ctx.reply('❌ Invalid ENS name format. Example: vitalik.eth');
        }

        // Resolve ENS on-chain first; if that fails, try DB (user may have registered via frontend on another network)
        let resolved = await this.ensService.resolveENS(ensName);
        if (!resolved) {
          const dbUser = await User.findOne({ ensName }).lean();
          if (dbUser) {
            resolved = {
              address: dbUser.ethAddress,
              textRecords: (dbUser.textRecords as Record<string, string>) || {},
            };
          }
        }
        if (!resolved) {
          return await ctx.reply('❌ Could not resolve ENS name. Please check and try again.\n\nIf you set your profile on the BridgePay app, make sure you completed the step and your ENS name is correct.');
        }

        const chatId = ctx.chat.id;
        const telegramUsername = ctx.from?.username;

        // Check if already linked to another user
        const existingUser = await User.findOne({ ensName });
        if (existingUser?.telegramChatId && existingUser.telegramChatId !== chatId) {
          return await ctx.reply('⚠️ This ENS is already linked to another Telegram account. Contact support if you believe this is an error.');
        }

        // Update or create user
        await User.findOneAndUpdate(
          { ensName },
          {
            $set: {
              ensName,
              telegramUsername,
              telegramChatId: chatId,
              ethAddress: resolved.address,
              textRecords: resolved.textRecords,
            }
          },
          { upsert: true, new: true }
        );

        const successMessage =
          '✅ *Successfully linked\\!*\n\n' +
          'ENS: \\`' + this.escapeMarkdown(ensName) + '\\`\n' +
          'Address: \\`' + this.escapeMarkdown(resolved.address) + '\\`\n\n' +
          "You'll now receive notifications when someone sends you USDC via BridgePay\\.\n\n" +
          'Use /unlink to disconnect at any time\\.';

        await ctx.replyWithMarkdownV2(successMessage);

      } catch (error) {
        console.error('Error linking ENS:', error);
        await ctx.reply('❌ An error occurred while linking your ENS. Please try again later.');
      }
    });

    // Unlink ENS
    this.bot.command('unlink', async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        
        const user = await User.findOne({ telegramChatId: chatId });
        if (!user) {
          return await ctx.reply('❌ No ENS linked to this Telegram account.');
        }

        await User.updateOne(
          { telegramChatId: chatId },
          { $unset: { telegramChatId: 1, telegramUsername: 1 } }
        );

        await ctx.reply(`✅ Unlinked *${this.escapeMarkdown(user.ensName)}* from this Telegram account.`, {
          parse_mode: 'MarkdownV2'
        });
      } catch (error) {
        console.error('Error unlinking:', error);
        await ctx.reply('❌ An error occurred. Please try again later.');
      }
    });

    // Check transaction status
    this.bot.command('status', async (ctx) => {
      try {
        // Check if message exists and is a text message
        if (!ctx.message || !('text' in ctx.message)) {
          return await ctx.reply('❌ Invalid message format.');
        }

        const messageText = ctx.message.text;
        const parts = messageText.split(' ');
        
        if (parts.length < 2) {
          return await ctx.reply('❌ Please provide a transaction ID.\nExample: /status tx_1234567890');
        }

        const txId = parts[1].trim();
        const transaction = await Transaction.findOne({ id: txId }).lean();

        if (!transaction) {
          return await ctx.reply('❌ Transaction not found. Please check the ID and try again.');
        }

        const summary = this.formatTransactionSummary(transaction);
        await ctx.replyWithMarkdownV2(summary, { 
          link_preview_options: { is_disabled: true } 
        });

      } catch (error) {
        console.error('Error checking status:', error);
        await ctx.reply('❌ An error occurred while fetching the transaction. Please try again later.');
      }
    });
  }

  /**
   * Setup callback actions
   */
  private setupActions(): void {
    // Handle button callbacks
    this.bot.action(/tx_(.+)/, async (ctx) => {
      try {
        const match = ctx.match;
        if (!match || !match[1]) {
          return await ctx.answerCbQuery('Invalid transaction ID');
        }

        const txId = match[1];
        const fullTxId = txId.startsWith('tx_') ? txId : `tx_${txId}`;
        
        const transaction = await Transaction.findOne({ id: fullTxId }).lean();
        
        if (!transaction) {
          await ctx.answerCbQuery('Transaction not found');
          return;
        }

        const summary = this.formatTransactionSummary(transaction);
        
        // Check if we can edit the message
        if (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message) {
          await ctx.editMessageText(summary, { 
            parse_mode: 'MarkdownV2',
            link_preview_options: { is_disabled: true } 
          });
        } else {
          await ctx.replyWithMarkdownV2(summary, { 
            link_preview_options: { is_disabled: true } 
          });
        }
        
        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error in action handler:', error);
        await ctx.answerCbQuery('Error loading transaction');
      }
    });
  }

  /**
   * Send payment notification to recipient
   */
  async sendPaymentNotification(
    ensName: string, 
    transaction: TransactionSummary
  ): Promise<boolean> {
    try {
      const user = await User.findOne({ ensName: ensName.toLowerCase() }).lean();
      
      if (!user?.telegramChatId) {
        console.log(`No Telegram user found for ${ensName}`);
        return false;
      }

      const message = this.formatPaymentNotification(transaction);
      
      // Create keyboard properly
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📊 View Details', `tx_${transaction.id.replace('tx_', '')}`)]
      ]);

      await this.bot.telegram.sendMessage(user.telegramChatId, message, {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true },
        reply_markup: keyboard.reply_markup
      });

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

 /**
 * Format payment notification message
 */
private formatPaymentNotification(tx: TransactionSummary): string {
  const date = tx.completedAt 
    ? new Date(tx.completedAt).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

  const statusEmoji = tx.status === 'completed' ? '✅' : 
                     tx.status === 'failed' ? '❌' : '⏳';

  const statusText = tx.status === 'completed' ? 'Received' : tx.status === 'failed' ? 'Failed' : 'Processing';
  let message =
    statusEmoji + ' *Payment ' + statusText + '\\!*\n\n' +
    'From: `' + this.escapeMarkdown(tx.sender) + '`\n' +
    'Total: *' + this.escapeMarkdown(tx.totalAmount) + ' USDC*\n' +
    'Date: ' + this.escapeMarkdown(date) + '\n' +
    'Status: *' + this.escapeMarkdown(tx.status.toUpperCase()) + '*\n\n' +
    '*Breakdown by Chain:*';

  if (tx.transfers.length === 0) {
    message += '\n_No transfers found_';
  } else {
    tx.transfers.forEach((transfer) => {
      const emoji = transfer.status === 'completed' ? '✅' : 
                   transfer.status === 'failed' ? '❌' : '⏳';
      const chainName = this.formatChainName(transfer.chain);
      message += `\n\n${emoji} *${this.escapeMarkdown(chainName)}*`;
      message += `\nAmount: ${this.escapeMarkdown(transfer.amount)} USDC \\(${transfer.percentage}%\\)`; // ✅ FIXED: Escape parentheses
      
      if (transfer.txHash) {
        const shortHash = `${transfer.txHash.slice(0, 6)}...${transfer.txHash.slice(-4)}`;
        const explorerLink = transfer.explorerUrl || this.getExplorerUrl(transfer.chain, transfer.txHash);
        message += `\nTx: [${this.escapeMarkdown(shortHash)}](${this.escapeMarkdown(explorerLink)})`;
      }
    });
  }

  message += '\n\n\\#️⃣ TxID: `' + this.escapeMarkdown(tx.id) + '`';

  return message;
}

  /**
   * Format transaction summary for status command
   * Handles both TransactionSummary and PaymentTransaction from DB
   */
  private formatTransactionSummary(tx: PaymentTransaction | any): string {
    const statusEmoji: Record<string, string> = {
      pending: '⏳',
      approving: '⏳',
      burning: '🔥',
      attesting: '⏳',
      minting: '💰',
      processing: '⏳',
      completed: '✅',
      failed: '❌',
    };

    const emoji = statusEmoji[tx.status] || '⏳';

    let message =
      emoji + ' *Transaction Status*\n\n' +
      'ID: \\`' + this.escapeMarkdown(tx.id) + '\\`\n' +
      'Status: *' + this.escapeMarkdown(tx.status?.toUpperCase() || 'UNKNOWN') + '*\n' +
      'From: \\`' + this.escapeMarkdown(tx.sender || tx.senderAddress || 'Unknown') + '\\`\n' +
      'Total: *' + this.escapeMarkdown(tx.totalAmountUSDC || tx.totalAmount || '0') + ' USDC*';

    // Handle chainTransfers from PaymentTransaction
    if (tx.chainTransfers && Array.isArray(tx.chainTransfers) && tx.chainTransfers.length > 0) {
      message += '\n\n*Transfers:*';
      
      tx.chainTransfers.forEach((transfer: ChainTransfer) => {
        const chainEmoji = transfer.status === 'completed' ? '✅' : 
                          transfer.status === 'failed' ? '❌' : '⏳';
        
        const chainName = this.formatChainName(transfer.chain);
        
        message += `\n\n${chainEmoji} *${this.escapeMarkdown(chainName)}*`;
        message += `\nAmount: ${this.escapeMarkdown(transfer.amount)} USDC \\(${transfer.percentage}%\\)`;
        message += `\nStatus: ${this.escapeMarkdown(transfer.status)}`;
        
        if (transfer.steps && Array.isArray(transfer.steps) && transfer.steps.length > 0) {
          message += '\nSteps:';
          transfer.steps.forEach((step: PaymentStep) => {
            const stepEmoji = step.status === 'completed' ? '✓' : 
                             step.status === 'failed' ? '✗' : '○';
            message += `\n  ${stepEmoji} ${this.escapeMarkdown(step.name)}`;
            
            if (step.txHash) {
              const shortHash = `${step.txHash.slice(0, 6)}...${step.txHash.slice(-4)}`;
              const explorerUrl = step.explorerUrl || this.getExplorerUrl(transfer.chain, step.txHash);
              message += ` [${this.escapeMarkdown(shortHash)}](${this.escapeMarkdown(explorerUrl)})`;
            }
          });
        }
      });
    } 
    // Fallback to transfers array from TransactionSummary
    else if (tx.transfers && Array.isArray(tx.transfers) && tx.transfers.length > 0) {
      message += '\n\n*Transfers:*';
      
      tx.transfers.forEach((transfer: any) => {
        const chainEmoji = transfer.status === 'completed' ? '✅' : 
                          transfer.status === 'failed' ? '❌' : '⏳';
        
        const chainName = this.formatChainName(transfer.chain);
        
        message += `\n\n${chainEmoji} *${this.escapeMarkdown(chainName)}*`;
        message += `\nAmount: ${this.escapeMarkdown(transfer.amount)} USDC \\(${transfer.percentage}%\\)`;
        
        if (transfer.txHash) {
          const shortHash = `${transfer.txHash.slice(0, 6)}...${transfer.txHash.slice(-4)}`;
          const explorerUrl = transfer.explorerUrl || this.getExplorerUrl(transfer.chain, transfer.txHash);
          message += `\nTx: [${this.escapeMarkdown(shortHash)}](${this.escapeMarkdown(explorerUrl)})`;
        }
      });
    } else {
      message += '\n\n_No transfer details available_';
    }

    if (tx.error) {
      message += `\n\n❌ *Error:* ${this.escapeMarkdown(tx.error)}`;
    }

    if (tx.completedAt) {
      const completedDate = new Date(tx.completedAt).toLocaleString();
      message += `\n\nCompleted: ${this.escapeMarkdown(completedDate)}`;
    }

    return message;
  }

  /**
   * Format chain name for display
   */
  private formatChainName(chain: SupportedChain | string): string {
    const names: Record<string, string> = {
      'ethereum': 'Ethereum',
      'ethereum-sepolia': 'Ethereum Sepolia',
      'base': 'Base',
      'base-sepolia': 'Base Sepolia',
      'arbitrum': 'Arbitrum',
      'arbitrum-sepolia': 'Arbitrum Sepolia',
      'arc-testnet': 'Arc Testnet',
    };
    return names[chain] || chain;
  }

  /**
   * Get explorer URL for a chain
   */
  private getExplorerUrl(chain: SupportedChain | string, txHash: string): string {
    const explorers: Record<string, string> = {
      'ethereum-sepolia': 'https://sepolia.etherscan.io/tx/',
      'base-sepolia': 'https://sepolia.basescan.org/tx/',
      'arbitrum-sepolia': 'https://sepolia.arbiscan.io/tx/',
      'arc-testnet': 'https://testnet.arcscan.io/tx/',
      'ethereum': 'https://etherscan.io/tx/',
      'base': 'https://basescan.org/tx/',
      'arbitrum': 'https://arbiscan.io/tx/',
    };
    
    const baseUrl = explorers[chain] || 'https://etherscan.io/tx/';
    return `${baseUrl}${txHash}`;
  }

  /**
   * Escape markdown characters for Telegram MarkdownV2
   */
  private escapeMarkdown(text: string | undefined | null): string {
    if (!text) return '';
    // Escape all special characters for MarkdownV2
    return text.toString().replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
  }
}

export default TelegramService;