// Me-Agent Type Definitions

export interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  tags: string[];
  productType: string;
  vendor: string;
  inStock: boolean;
  stockQuantity: number;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
  imageUrl?: string;
  tags?: string[];
  productType?: string;
  vendor?: string;
  inStock?: boolean;
  stockQuantity?: number;
}

export interface PermissionPolicy {
  maxSpend: number; // in CAD
  allowedCategories: string[];
  agentEnabled: boolean;
  merchantId?: string;
  requireConfirm?: boolean; // Require user confirmation for checkout
}

export interface BundleItem {
  id: string;
  title: string;
  price: number; // in CAD
  category: string;
  merchant: string;
  reasonTags: string[];
  qty: number;
  stockQuantity?: number;
  imageUrl?: string;
}

export interface BundleResult {
  items: BundleItem[];
  subtotal: number; // in CAD
  currency: 'CAD';
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
  | 'AUTHORITY_BLOCKED'
  | 'FEEDBACK_SUBMITTED'
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
  'accessories',
  'books',
  'construction',
  'electronics',
  'entertainment',
  'fashion',
  'fitness',
  'grocery',
  'home',
  'lifestyle',
  'office',
  'smart_home',
  'wellness',
] as const;

export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  maxSpend: 150,
  allowedCategories: [...AVAILABLE_CATEGORIES],
  agentEnabled: true,
};

export const DEFAULT_INTENT_FORM: IntentForm = {
  shoppingIntent: '',
  maxSpend: 150,
  allowedCategories: [...AVAILABLE_CATEGORIES],
  brandPreferences: [],
  priceSensitivity: 3,
  agentEnabled: true,
};
