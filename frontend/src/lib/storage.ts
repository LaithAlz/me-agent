// Local storage utilities for Me-Agent
import type { PermissionPolicy, IntentForm, AuditEvent, BundleResult, ExplainResult, CartItem } from '@/types';
import { DEFAULT_PERMISSION_POLICY, DEFAULT_INTENT_FORM } from '@/types';

const STORAGE_KEYS = {
  PERMISSION_POLICY: 'meagent_permission_policy',
  LAST_INTENT: 'meagent_last_intent',
  LAST_BUNDLE: 'meagent_last_bundle',
  LAST_EXPLANATION: 'meagent_last_explanation',
  CART_ITEMS: 'meagent_cart_items',
  CHECKOUT_URL: 'meagent_checkout_url',
  AUDIT_LOG: 'meagent_audit_log',
} as const;

export function savePermissionPolicy(policy: PermissionPolicy): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PERMISSION_POLICY, JSON.stringify(policy));
  } catch (e) {
    console.warn('Failed to save permission policy:', e);
  }
}

export function loadPermissionPolicy(): PermissionPolicy {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PERMISSION_POLICY);
    if (stored) {
      return { ...DEFAULT_PERMISSION_POLICY, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load permission policy:', e);
  }
  return DEFAULT_PERMISSION_POLICY;
}

export function saveLastIntent(intent: IntentForm): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_INTENT, JSON.stringify(intent));
  } catch (e) {
    console.warn('Failed to save last intent:', e);
  }
}

export function loadLastIntent(): IntentForm {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_INTENT);
    if (stored) {
      return { ...DEFAULT_INTENT_FORM, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load last intent:', e);
  }
  return DEFAULT_INTENT_FORM;
}

export function saveLastBundle(bundle: BundleResult | null): void {
  try {
    if (!bundle) {
      localStorage.removeItem(STORAGE_KEYS.LAST_BUNDLE);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.LAST_BUNDLE, JSON.stringify(bundle));
  } catch (e) {
    console.warn('Failed to save last bundle:', e);
  }
}

export function loadLastBundle(): BundleResult | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_BUNDLE);
    if (stored) {
      return JSON.parse(stored) as BundleResult;
    }
  } catch (e) {
    console.warn('Failed to load last bundle:', e);
  }
  return null;
}

export function saveLastExplanation(explanation: ExplainResult | null): void {
  try {
    if (!explanation) {
      localStorage.removeItem(STORAGE_KEYS.LAST_EXPLANATION);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.LAST_EXPLANATION, JSON.stringify(explanation));
  } catch (e) {
    console.warn('Failed to save last explanation:', e);
  }
}

export function loadLastExplanation(): ExplainResult | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_EXPLANATION);
    if (stored) {
      return JSON.parse(stored) as ExplainResult;
    }
  } catch (e) {
    console.warn('Failed to load last explanation:', e);
  }
  return null;
}

export function loadCartItems(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CART_ITEMS);
    if (stored) {
      return JSON.parse(stored) as CartItem[];
    }
  } catch (e) {
    console.warn('Failed to load cart items:', e);
  }
  return [];
}

export function saveCartItems(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CART_ITEMS, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save cart items:', e);
  }
}

export function addCartItem(item: CartItem): CartItem[] {
  const existing = loadCartItems();
  const found = existing.find(existingItem => existingItem.id === item.id);
  const updated = found
    ? existing.map(existingItem =>
        existingItem.id === item.id
          ? { ...existingItem, qty: existingItem.qty + item.qty }
          : existingItem
      )
    : [...existing, item];
  saveCartItems(updated);
  return updated;
}

export function updateCartItemQty(itemId: string, qty: number): CartItem[] {
  const existing = loadCartItems();
  const updated = existing
    .map(item => (item.id === itemId ? { ...item, qty: Math.max(1, qty) } : item))
    .filter(item => item.qty > 0);
  saveCartItems(updated);
  return updated;
}

export function removeCartItem(itemId: string): CartItem[] {
  const existing = loadCartItems();
  const updated = existing.filter(item => item.id !== itemId);
  saveCartItems(updated);
  return updated;
}

export function clearCartItems(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CART_ITEMS);
  } catch (e) {
    console.warn('Failed to clear cart items:', e);
  }
}

export function saveCheckoutUrl(url: string | null): void {
  try {
    if (!url) {
      localStorage.removeItem(STORAGE_KEYS.CHECKOUT_URL);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.CHECKOUT_URL, url);
  } catch (e) {
    console.warn('Failed to save checkout url:', e);
  }
}

export function loadCheckoutUrl(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.CHECKOUT_URL);
  } catch (e) {
    console.warn('Failed to load checkout url:', e);
  }
  return null;
}

export function saveAuditLog(events: AuditEvent[]): void {
  try {
    // Keep only last 100 events
    const trimmed = events.slice(-100);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save audit log:', e);
  }
}

export function loadAuditLog(): AuditEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load audit log:', e);
  }
  return [];
}

export function appendAuditEvent(event: AuditEvent): AuditEvent[] {
  const existing = loadAuditLog();
  const updated = [...existing, event];
  saveAuditLog(updated);
  return updated;
}

export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
