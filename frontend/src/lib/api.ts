// Me-Agent API Client
import type {
  BundleResult,
  ExplainResult,
  IntentForm,
  CartItem,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// Simulated delay for realistic UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Demo toggle for passkey success/failure
let passkeyWillSucceed = true;

export function setPasskeyDemoMode(willSucceed: boolean) {
  passkeyWillSucceed = willSucceed;
}

export async function authorizePasskey(): Promise<{ success: boolean; error?: string }> {
  await delay(1500); // Simulate biometric check
  
  if (passkeyWillSucceed) {
    return { success: true };
  } else {
    return { success: false, error: 'Passkey verification failed. Please try again.' };
  }
}

export async function generateBundle(payload: IntentForm & { cartItems?: CartItem[] }): Promise<BundleResult> {
  await delay(1200); // Simulate AI processing

  const cartItems = (payload.cartItems ?? []).map(item => ({
    id: item.id,
    qty: item.qty,
  }));

  return apiRequest<BundleResult>('/api/agent/bundle', {
    method: 'POST',
    body: JSON.stringify({ ...payload, personaId: 'alex', cartItems }),
  });
}

export async function explainBundle(payload: { 
  intent: string; 
  bundle: BundleResult;
}): Promise<ExplainResult> {
  await delay(800);

  return apiRequest<ExplainResult>('/api/agent/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function shopifyCartCreate(): Promise<{ cartId: string }> {
  await delay(600);
  return apiRequest<{ cartId: string }>('/api/shopify/cart/create', { method: 'POST' });
}

export async function shopifyCartLinesAdd(payload: {
  cartId: string;
  lines: { merchandiseId: string; quantity: number }[];
}): Promise<{ checkoutUrl: string }> {
  await delay(800);
  return apiRequest<{ checkoutUrl: string }>('/api/shopify/cart/lines/add', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
