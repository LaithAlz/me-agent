// Me-Agent API Client
// - Calls FastAPI: /recommend, /feedback, and /agent/bundle
// - Adapts backend cart JSON into your UI BundleResult shape
// - Keeps passkey demo helpers and Shopify helpers

import type { BundleResult, ExplainResult, IntentForm, CartItem } from '@/types'

import {
  isPlatformAuthenticatorAvailable,
  authorizeActionWithPasskey,
  isWebAuthnSupported,
} from './webauthn'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Simulated delay for realistic UX
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

// -------------------------------
// Demo toggle for passkey success/failure
// -------------------------------
let passkeyWillSucceed = true

export function setPasskeyDemoMode(willSucceed: boolean) {
  passkeyWillSucceed = willSucceed
}

/**
 * Authorize with passkey - uses real WebAuthn when available
 * Falls back to demo mode for unsupported devices
 */
export async function authorizePasskey(): Promise<{ success: boolean; error?: string }> {
  // Try real WebAuthn first
  try {
    if (isWebAuthnSupported()) {
      const hasPlatformAuth = await isPlatformAuthenticatorAvailable()

      if (hasPlatformAuth) {
        // Use real biometric authentication
        const result = await authorizeActionWithPasskey('generateBundle')
        return { success: result.success, error: result.error }
      }
    }
  } catch (e) {
    // If WebAuthn fails for any reason, fall back to demo mode
    console.warn('WebAuthn failed, falling back to demo mode:', e)
  }

  // Fallback to demo mode
  await delay(1500) // Simulate biometric check

  if (passkeyWillSucceed) return { success: true }
  return { success: false, error: 'Passkey verification failed. Please try again.' }
}

// -------------------------------
// Backend contract types
// -------------------------------
export type Product = {
  name: string
  price: number
  brand: string
  tags: string[]
}

export type RecommendRequest = {
  // backend supports either user_id or userId
  user_id?: string
  userId?: string

  products: Product[]

  // legacy
  context?: string
  max_total?: number

  // new frontend fields
  shoppingIntent?: string
  allowedCategories?: string[]
  brandPreferences?: string[]
  maxSpend?: number
  priceSensitivity?: number
  agentEnabled?: boolean
}

export type RecommendResponse = {
  cart: string // JSON string
  explanation: string
}

export type FeedbackRequest = {
  user_id: string
  rejected_items: string[]
  reason: string
}

export type FeedbackResponse = {
  status: string
}

// -------------------------------
// Helpers
// -------------------------------
function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

export async function generateBundle(
  payload: IntentForm & { cartItems?: CartItem[] }
): Promise<BundleResult> {
  await delay(1200)

  const cartItems = (payload.cartItems ?? []).map(item => ({
    id: item.id,
    qty: item.qty,
  }))

  return apiRequest<BundleResult>('/api/agent/bundle', {
    method: 'POST',
    body: JSON.stringify({ ...payload, personaId: 'alex', cartItems }),
  })
}

type BackendCart = {
  items?: Array<{
    name?: string
    title?: string
    brand?: string
    merchant?: string
    price?: number
    qty?: number
    tags?: string[]
    merchandiseId?: string
    id?: string
  }>
  total?: number
  notes?: string
}

// Adapt backend cart -> UI BundleResult
function adaptCartToBundle(cartJson: string): BundleResult {
  const parsed = safeJsonParse<BackendCart>(cartJson)

  const rawItems = Array.isArray(parsed?.items) ? parsed!.items! : []

  const items = rawItems.map((it, idx) => {
    const title = (it.name || it.title || 'Item').trim()
    const merchant = (it.brand || it.merchant || 'Unknown').trim()
    const price = Number(it.price ?? 0)
    const qty = Number(it.qty ?? 1)
    const reasonTags = Array.isArray(it.tags) ? it.tags : []
    const category = String((it as any).category ?? 'office')

    const id =
      (typeof it.id === 'string' && it.id.length ? it.id : null) ??
      (typeof it.merchandiseId === 'string' && it.merchandiseId.length ? it.merchandiseId : null) ??
      `${slugify(merchant)}-${slugify(title)}-${idx}`

    return {
      id,
      title,
      merchant,
      price,
      qty,
      category,
      reasonTags,
      // Optional fields your app may later use
      merchandiseId: it.merchandiseId,
    }
  })

  const subtotal =
    typeof parsed?.total === 'number'
      ? Number(parsed.total)
      : Math.round(items.reduce((sum, it) => sum + it.price * it.qty, 0) * 100) / 100

  const bundle: BundleResult = {
    // Your UI expects these keys
    items,
    subtotal,
    currency: 'CAD',
    // If your BundleResult type has extra required fields, add them here
  } as BundleResult

  return bundle
}

function buildContext(form: IntentForm) {
  const parts: string[] = []
  const anyForm = form as any

  if (typeof anyForm.shoppingIntent === 'string' && anyForm.shoppingIntent.trim()) {
    parts.push(anyForm.shoppingIntent.trim())
  }

  if (Array.isArray(anyForm.allowedCategories) && anyForm.allowedCategories.length) {
    parts.push(`Allowed categories: ${anyForm.allowedCategories.join(', ')}`)
  }

  if (Array.isArray(anyForm.brandPreferences) && anyForm.brandPreferences.length) {
    parts.push(`Brand preferences: ${anyForm.brandPreferences.join(', ')}`)
  }

  if (typeof anyForm.priceSensitivity === 'number') {
    parts.push(`Price sensitivity: ${anyForm.priceSensitivity}/5`)
  }

  return parts.filter(Boolean).join(' | ')
}

function getMaxTotal(form: IntentForm): number {
  const anyForm = form as any
  if (typeof anyForm.maxSpend === 'number') return anyForm.maxSpend
  if (typeof anyForm.max_total === 'number') return anyForm.max_total
  if (typeof anyForm.budget === 'number') return anyForm.budget
  return 500
}

// -------------------------------
// API calls
// -------------------------------
export async function recommendBundle(payload: RecommendRequest): Promise<RecommendResponse> {
  await delay(200)
  return apiRequest<RecommendResponse>('/api/agent/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Preferred for DemoPage: returns bundle + explanation string from backend
export async function generateBundleWithExplain(
  payload: IntentForm & { userId: string; products: Product[] }
): Promise<{ bundle: BundleResult; explanation: string }> {
  await delay(200)

  const req: RecommendRequest = {
    userId: payload.userId,
    products: payload.products,

    // Pass new fields through so backend can use them directly
    shoppingIntent: (payload as any).shoppingIntent,
    allowedCategories: (payload as any).allowedCategories,
    brandPreferences: (payload as any).brandPreferences,
    maxSpend: (payload as any).maxSpend,
    priceSensitivity: (payload as any).priceSensitivity,
    agentEnabled: (payload as any).agentEnabled,

    // Still fill these as fallback
    context: buildContext(payload),
    max_total: getMaxTotal(payload),
  }

  const resp = await recommendBundle(req)
  const bundle = adaptCartToBundle(resp.cart)

  return { bundle, explanation: resp.explanation }
}

export async function sendFeedback(payload: FeedbackRequest): Promise<FeedbackResponse> {
  await delay(200)
  return apiRequest<FeedbackResponse>('/api/agent/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// -------------------------------
// Existing explain helper (optional)
// Your backend already returns explanation on /recommend
// Keep this for compatibility with ExplainPanel expecting ExplainResult
// -------------------------------
export async function explainBundle(payload: { text: string }): Promise<ExplainResult> {
  await delay(100)
  return { text: payload.text } as ExplainResult
}

// -------------------------------
// Shopify helpers unchanged
// -------------------------------
export async function shopifyCartCreate(): Promise<{ cartId: string }> {
  await delay(600)
  return apiRequest<{ cartId: string }>('/api/shopify/cart/create', { method: 'POST' })
}

export async function shopifyCartLinesAdd(payload: {
  cartId: string
  lines: { merchandiseId: string; quantity: number }[]
}): Promise<{ checkoutUrl: string }> {
  await delay(800)
  return apiRequest<{ checkoutUrl: string }>('/api/shopify/cart/lines/add', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}