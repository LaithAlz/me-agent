// Me-Agent Type Definitions

export interface PermissionPolicy {
  maxSpend: number;
  allowedCategories: string[];
  agentEnabled: boolean;
  merchantId?: string;
  requireConfirm?: boolean; // Require user confirmation for checkout
}

export interface BundleItem {
  id: string;
  title: string;
  price: number;
  category: string;
  merchant: string;
  reasonTags: string[];
  qty: number;
  imageUrl?: string;
}

export interface BundleResult {
  items: BundleItem[];
  subtotal: number;
  currency: string;
}

export interface AuditEvent {
  id: string;
  ts: string;
  action: AuditAction;
  reason: string;
  permissionUsed: Partial<PermissionPolicy>;
  metadata?: Record<string, any>;
}

export type AuditAction = 
  | 'CONSENT_GRANTED'
  | 'CONSENT_DENIED'
  | 'BUNDLE_GENERATED'
  | 'CART_CREATED'
  | 'CART_LINES_ADDED'
  | 'CHECKOUT_LINK_READY'
  | 'EXPLANATION_GENERATED';

export interface ExplainResult {
  text: string;
  audioUrl?: string;
}

export interface CartState {
  cartId: string | null;
  checkoutUrl: string | null;
  isCreating: boolean;
  isAddingLines: boolean;
}

export type PasskeyState = 'idle' | 'prompting' | 'success' | 'failed';

export interface IntentForm {
  shoppingIntent: string;
  maxSpend: number;
  allowedCategories: string[];
  brandPreferences: string[];
  priceSensitivity: number;
  agentEnabled: boolean;
}

export const AVAILABLE_CATEGORIES = [
  'office',
  'electronics',
  'clothing',
  'home',
  'sports',
  'books',
  'beauty',
  'food',
] as const;

export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  maxSpend: 150,
  allowedCategories: ['office'],
  agentEnabled: true,
};

export const DEFAULT_INTENT_FORM: IntentForm = {
  shoppingIntent: '',
  maxSpend: 150,
  allowedCategories: ['office'],
  brandPreferences: [],
  priceSensitivity: 3,
  agentEnabled: true,
};
