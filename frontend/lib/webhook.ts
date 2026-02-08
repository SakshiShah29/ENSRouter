import type { PaymentTransaction } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WEBHOOK_ENDPOINT = `${API_BASE}/api/webhook/bridge-events`;
const WEBHOOK_SECRET = process.env.NEXT_PUBLIC_WEBHOOK_SECRET || '';

export const sendBridgeWebhook = async (
  event: 'bridge.step' | 'bridge.complete' | 'bridge.failed',
  transactionId: string,
  data: {
    step?: { name: string; state: string; txHash?: string; explorerUrl?: string; error?: string };
    transaction?: PaymentTransaction;
    error?: string;
  }
): Promise<boolean> => {
  // Log webhook attempt
  console.log('🔔 Sending webhook:', {
    event,
    transactionId,
    endpoint: WEBHOOK_ENDPOINT,
    hasSecret: !!WEBHOOK_SECRET,
  });

  if (!WEBHOOK_SECRET) {
    console.error('❌ NEXT_PUBLIC_WEBHOOK_SECRET not set in .env.local');
    return false;
  }

  try {
    const payload = {
      event,
      transactionId,
      ...data,
      timestamp: Date.now(),
      signature: '', // Will be replaced
    };

    const signature = await generateSignature(payload, WEBHOOK_SECRET);
    payload.signature = signature;

    console.log('📤 Webhook payload:', {
      event: payload.event,
      transactionId: payload.transactionId,
      hasTransaction: !!payload.transaction,
      hasStep: !!payload.step,
    });

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ Webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Webhook sent successfully:', responseData);
    return true;
  } catch (error) {
    console.error('❌ Webhook error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: WEBHOOK_ENDPOINT,
      event,
      transactionId,
    });
    return false;
  }
};

async function generateSignature(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  // Don't include the signature field in the signature calculation
  const { signature, ...payloadWithoutSig } = payload as any;
  const data = encoder.encode(JSON.stringify(payloadWithoutSig));
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}