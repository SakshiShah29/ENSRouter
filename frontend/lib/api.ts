import type { PaymentTransaction } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Create a transaction on the server when payment starts.
 * Ensures the backend has the tx for webhook updates and Telegram notifications.
 */
export async function createTransaction(tx: PaymentTransaction): Promise<{ success: boolean; id: string }> {
  const body = {
    id: tx.id,
    sender: tx.sender,
    senderAddress: tx.sender,
    recipient: tx.recipient,
    recipientAddress: tx.recipientAddress,
    totalAmountUSDC: tx.totalAmountUSDC,
    sourceChain: tx.sourceChain,
    status: tx.status,
    chainTransfers: tx.chainTransfers,
    createdAt: tx.createdAt,
  };

  const res = await fetch(`${API_BASE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create transaction: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Register ENS profile with the backend (after user sets ENS text records).
 * Used so the server can resolve profiles and send Telegram notifications to the right user.
 */
export async function registerENSProfile(params: {
  ensName: string;
  ethAddress: string;
  telegramUsername?: string;
}): Promise<{ success: boolean; user?: unknown }> {
  const res = await fetch(`${API_BASE}/api/ens/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; message?: string };
    const msg = err.message || err.error || `Failed to register ENS: ${res.statusText}`;
    throw new Error(msg);
  }

  return res.json();
}
