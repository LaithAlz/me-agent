// Me-Agent API Client - Mock implementations for demo
import type { 
  BundleResult, 
  ExplainResult, 
  IntentForm,
  BundleItem 
} from '@/types';

// Simulated delay for realistic UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock product database (prices in CAD)
const MOCK_PRODUCTS: Record<string, BundleItem[]> = {
  office: [
    { id: 'off-1', title: 'Ergonomic Desk Chair', price: 129.99, category: 'office', merchant: 'OfficePro', reasonTags: ['Matches category', 'Top rated'], qty: 1 },
    { id: 'off-2', title: 'Standing Desk Converter', price: 65.00, category: 'office', merchant: 'DeskMaster', reasonTags: ['Matches category', 'Within budget'], qty: 1 },
    { id: 'off-3', title: 'LED Desk Lamp', price: 39.50, category: 'office', merchant: 'LightCo', reasonTags: ['Matches category', 'Energy efficient'], qty: 1 },
    { id: 'off-4', title: 'Wireless Keyboard', price: 49.99, category: 'office', merchant: 'TechGear', reasonTags: ['Matches category', 'Bluetooth'], qty: 1 },
  ],
  electronics: [
    { id: 'elec-1', title: 'Wireless Mouse', price: 42.99, category: 'electronics', merchant: 'TechGear', reasonTags: ['Matches category', 'Ergonomic'], qty: 1 },
    { id: 'elec-2', title: 'USB-C Hub', price: 54.99, category: 'electronics', merchant: 'ConnectPlus', reasonTags: ['Matches category', 'Multi-port'], qty: 1 },
    { id: 'elec-3', title: 'Blue Light Monitor', price: 49.99, category: 'electronics', merchant: 'DisplayPro', reasonTags: ['Matches category', 'Productivity'], qty: 1 },
  ],
  clothing: [
    { id: 'cloth-1', title: 'Cotton T-Shirt Pack', price: 34.99, category: 'clothing', merchant: 'BasicWear', reasonTags: ['Matches category', 'Comfort fit'], qty: 1 },
    { id: 'cloth-2', title: 'Denim Jeans', price: 69.99, category: 'clothing', merchant: 'DenimCo', reasonTags: ['Matches category', 'Classic style'], qty: 1 },
  ],
  home: [
    { id: 'home-1', title: 'Desk Organizer Set', price: 44.99, category: 'home', merchant: 'HomeOrganize', reasonTags: ['Matches category', 'Space-saving'], qty: 1 },
    { id: 'home-2', title: 'Air Purifier', price: 94.00, category: 'home', merchant: 'CleanAir', reasonTags: ['Matches category', 'HEPA filter'], qty: 1 },
  ],
  sports: [
    { id: 'sport-1', title: 'Yoga Mat', price: 32.99, category: 'sports', merchant: 'FitGear', reasonTags: ['Matches category', 'Non-slip'], qty: 1 },
    { id: 'sport-2', title: 'Resistance Bands Set', price: 26.50, category: 'sports', merchant: 'FitGear', reasonTags: ['Matches category', '5 levels'], qty: 1 },
  ],
  books: [
    { id: 'book-1', title: 'Productivity Handbook', price: 22.99, category: 'books', merchant: 'BookStore', reasonTags: ['Matches category', 'Bestseller'], qty: 1 },
  ],
  beauty: [
    { id: 'beauty-1', title: 'Skincare Set', price: 49.99, category: 'beauty', merchant: 'GlowUp', reasonTags: ['Matches category', 'Organic'], qty: 1 },
  ],
  food: [
    { id: 'food-1', title: 'Organic Snack Box', price: 39.99, category: 'food', merchant: 'HealthyBites', reasonTags: ['Matches category', 'No preservatives'], qty: 1 },
  ],
};

// Demo toggle for passkey success/failure
let passkeyWillSucceed = true;

import { 
  isPlatformAuthenticatorAvailable, 
  authorizeActionWithPasskey,
  isWebAuthnSupported 
} from './webauthn';

export function setPasskeyDemoMode(willSucceed: boolean) {
  passkeyWillSucceed = willSucceed;
}

/**
 * Authorize with passkey - uses real WebAuthn when available
 * Falls back to demo mode for unsupported devices
 */
export async function authorizePasskey(): Promise<{ success: boolean; error?: string }> {
  // Try real WebAuthn first
  if (isWebAuthnSupported()) {
    const hasPlatformAuth = await isPlatformAuthenticatorAvailable();
    
    if (hasPlatformAuth) {
      // Use real biometric authentication
      console.log('Using real WebAuthn biometric authentication');
      const result = await authorizeActionWithPasskey('generateBundle');
      return { success: result.success, error: result.error };
    }
  }
  
  // Fallback to demo mode
  console.log('WebAuthn not available, using demo mode');
  await delay(1500); // Simulate biometric check
  
  if (passkeyWillSucceed) {
    return { success: true };
  } else {
    return { success: false, error: 'Passkey verification failed. Please try again.' };
  }
}

export async function generateBundle(payload: IntentForm): Promise<BundleResult> {
  await delay(1200); // Simulate AI processing
  
  const { allowedCategories, maxSpend, brandPreferences } = payload;
  
  // Collect products from allowed categories
  let availableProducts: BundleItem[] = [];
  for (const category of allowedCategories) {
    const products = MOCK_PRODUCTS[category] || [];
    availableProducts = [...availableProducts, ...products];
  }
  
  // Add brand preference tags if specified
  if (brandPreferences.length > 0) {
    availableProducts = availableProducts.map(p => ({
      ...p,
      reasonTags: brandPreferences.some(b => 
        p.merchant.toLowerCase().includes(b.toLowerCase()) ||
        p.title.toLowerCase().includes(b.toLowerCase())
      )
        ? [...p.reasonTags, 'Brand preference']
        : p.reasonTags,
    }));
  }
  
  // Select items that fit within budget
  let selectedItems: BundleItem[] = [];
  let subtotal = 0;
  
  for (const product of availableProducts) {
    if (subtotal + product.price <= maxSpend) {
      selectedItems.push({ ...product, id: `${product.id}-${Date.now()}` });
      subtotal += product.price;
    }
    if (selectedItems.length >= 6) break;
  }
  
  // Ensure at least 3 items if possible
  if (selectedItems.length < 3 && availableProducts.length >= 3) {
    selectedItems = availableProducts.slice(0, 3).map(p => ({
      ...p,
      id: `${p.id}-${Date.now()}`,
    }));
    subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  }
  
  return {
    items: selectedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    currency: 'CAD',
  };
}

export async function explainBundle(payload: { 
  intent: string; 
  bundle: BundleResult;
}): Promise<ExplainResult> {
  await delay(800);
  
  const itemCount = payload.bundle.items.length;
  const categories = [...new Set(payload.bundle.items.map(i => i.category))];
  
  const text = `Based on your shopping intent "${payload.intent.slice(0, 50)}${payload.intent.length > 50 ? '...' : ''}", I've curated a bundle of ${itemCount} items across ${categories.length} ${categories.length === 1 ? 'category' : 'categories'}: ${categories.join(', ')}.

Each item was selected because it:
• Falls within your allowed categories
• Stays within your CAD budget of $${payload.bundle.subtotal.toFixed(2)} CAD
• Matches your stated preferences and price sensitivity

The total comes to $${payload.bundle.subtotal.toFixed(2)} CAD, leaving room in your budget for any adjustments. All items are from verified merchants with strong ratings.

Remember: You have full control. Review each item, adjust quantities, and only proceed to checkout when you're ready. No purchases will be made without your explicit approval.`;

  // 50% chance of having audio available
  const hasAudio = Math.random() > 0.5;
  
  return {
    text,
    audioUrl: hasAudio ? 'https://example.com/audio/explanation.mp3' : undefined,
  };
}

export async function shopifyCartCreate(): Promise<{ cartId: string }> {
  await delay(600);
  return { cartId: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
}

export async function shopifyCartLinesAdd(payload: {
  cartId: string;
  lines: { merchandiseId: string; quantity: number }[];
}): Promise<{ checkoutUrl: string }> {
  await delay(800);
  return { 
    checkoutUrl: `https://checkout.shopify.com/demo/${payload.cartId}?currency=CAD` 
  };
}
