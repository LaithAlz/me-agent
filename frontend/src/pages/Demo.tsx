import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { IntentFormPanel } from '@/components/demo/IntentFormPanel'
import { BundleResultPanel } from '@/components/demo/BundleResultPanel'
import { CartPanel } from '@/components/demo/CartPanel'
import { ExplainPanel } from '@/components/demo/ExplainPanel'
import { AuditPreviewPanel } from '@/components/demo/AuditPreviewPanel'
import { PasskeyConsentModal } from '@/components/demo/PasskeyConsentModal'
import { VoiceExplainer } from '@/components/VoiceExplainer'

import { useAuditLog } from '@/hooks/useAuditLog'
import { loadLastIntent, saveLastIntent, loadPermissionPolicy } from '@/lib/storage'
import {
  authorizePasskey,
  generateBundleWithExplain,
  sendFeedback,
  shopifyCartCreate,
  shopifyCartLinesAdd,
  type Product,
} from '@/lib/api'

import { checkAuthority, getPolicy, type AgentPolicy } from '@/lib/backendApi'

import type {
  IntentForm,
  BundleResult,
  CartState,
  ExplainResult,
  PasskeyState,
} from '@/types'
import { DEFAULT_INTENT_FORM } from '@/types'
import { toast } from '@/hooks/use-toast'

const USER_ID = 'laith_test_001'

// -----------------------
// Demo Inventory (MVP)
// -----------------------
const DEMO_PRODUCTS: Product[] = [
  { name: 'Apple Magic Trackpad', price: 169, brand: 'Apple', tags: ['office', 'minimal', 'ecosystem', 'ergonomic'] },
  { name: 'Apple Magic Keyboard', price: 99, brand: 'Apple', tags: ['office', 'minimal', 'ecosystem'] },
  { name: 'Logitech MX Master 3S', price: 99.99, brand: 'Logitech', tags: ['office', 'ergonomic', 'minimal'] },
  { name: 'Logitech MX Keys Mini', price: 99.99, brand: 'Logitech', tags: ['office', 'minimal', 'quiet'] },
  { name: 'Logitech Lift Vertical Mouse', price: 69.99, brand: 'Logitech', tags: ['office', 'ergonomic'] },
  { name: 'Keychron K2 (Non-RGB)', price: 89.99, brand: 'Keychron', tags: ['office', 'minimal'] },
  { name: 'Generic RGB Mechanical Keyboard', price: 89.99, brand: 'Unknown', tags: ['office', 'RGB', 'flashy', 'unknown'] },

  { name: 'Dell UltraSharp 27" Monitor', price: 329, brand: 'Dell', tags: ['office', 'minimal', 'monitor'] },
  { name: 'LG 27" 4K Monitor', price: 299, brand: 'LG', tags: ['office', 'monitor'] },
  { name: 'Samsung Curved Gaming Monitor', price: 279, brand: 'Samsung', tags: ['office', 'monitor', 'flashy'] },

  { name: 'Fully Jarvis Standing Desk', price: 499, brand: 'Fully', tags: ['office', 'ergonomic', 'standing_desk'] },
  { name: 'IKEA BEKANT Desk', price: 249, brand: 'IKEA', tags: ['office', 'minimal', 'desk'] },
  { name: 'Herman Miller Aeron Chair', price: 1199, brand: 'Herman Miller', tags: ['office', 'ergonomic', 'premium'] },
  { name: 'Budget Office Chair (No Name)', price: 89, brand: 'Unknown', tags: ['office', 'unknown'] },
  { name: 'Foot Rest Under Desk', price: 29.99, brand: 'Logitech', tags: ['office', 'ergonomic'] },

  { name: 'Bose QuietComfort Headphones', price: 249, brand: 'Bose', tags: ['office', 'minimal', 'comfort', 'audio'] },
  { name: 'Sony WH-1000XM5 Headphones', price: 329, brand: 'Sony', tags: ['office', 'audio', 'premium'] },
  { name: 'Anker PowerConf Speakerphone', price: 119, brand: 'Anker', tags: ['office', 'audio', 'calls'] },
  { name: 'Generic RGB Gaming Headset', price: 49.99, brand: 'Unknown', tags: ['office', 'RGB', 'flashy', 'unknown', 'audio'] },

  { name: 'BenQ ScreenBar Monitor Light', price: 129, brand: 'BenQ', tags: ['office', 'minimal', 'lighting'] },
  { name: 'LED Strip Lights (RGB)', price: 19.99, brand: 'Unknown', tags: ['office', 'RGB', 'flashy', 'unknown', 'lighting'] },
  { name: 'Cable Management Kit', price: 24.99, brand: 'IKEA', tags: ['office', 'minimal', 'cables'] },
  { name: 'Laptop Stand', price: 39.99, brand: 'Rain Design', tags: ['office', 'ergonomic', 'minimal'] },
  { name: 'Webcam 1080p', price: 59.99, brand: 'Logitech', tags: ['office', 'calls'] },

  { name: 'Anker 65W USB-C Charger', price: 49.99, brand: 'Anker', tags: ['office', 'power', 'minimal'] },
  { name: 'Belkin MagSafe Charger', price: 39.99, brand: 'Belkin', tags: ['office', 'power', 'ecosystem'] },
  { name: 'Generic Fast Charger (RGB)', price: 19.99, brand: 'Unknown', tags: ['office', 'power', 'RGB', 'unknown'] },

  { name: 'Philips Hue Starter Kit', price: 199, brand: 'Philips', tags: ['smart_home', 'lighting', 'minimal'] },
  { name: 'Apple HomePod mini', price: 99, brand: 'Apple', tags: ['smart_home', 'ecosystem', 'audio'] },
  { name: 'Google Nest Thermostat', price: 129, brand: 'Google', tags: ['smart_home', 'energy'] },
  { name: 'Ring Video Doorbell', price: 99, brand: 'Ring', tags: ['smart_home', 'security'] },

  { name: 'DeWalt 20V Drill Driver Kit', price: 199, brand: 'DeWalt', tags: ['construction', 'tools'] },
  { name: 'Milwaukee Measuring Tape', price: 19.99, brand: 'Milwaukee', tags: ['construction', 'tools'] },
  { name: 'Hammer', price: 14.99, brand: 'Stanley', tags: ['construction', 'tools'] },
  { name: 'Circular Saw', price: 149, brand: 'Makita', tags: ['construction', 'tools'] },
  { name: 'Safety Glasses', price: 9.99, brand: '3M', tags: ['construction', 'safety'] },

  { name: 'Drywall Sheets (Pack)', price: 79, brand: 'Generic', tags: ['construction', 'materials'] },
  { name: 'Interior Paint (Gallon)', price: 39.99, brand: 'Behr', tags: ['construction', 'materials'] },
  { name: 'Toolbox', price: 29.99, brand: 'Husky', tags: ['construction', 'tools'] },

  { name: 'Samsung RGB Gaming Mouse', price: 59.99, brand: 'Samsung', tags: ['office', 'RGB', 'flashy'] },
  { name: 'Ultra Flashy RGB Desk Mat', price: 24.99, brand: 'Unknown', tags: ['office', 'RGB', 'flashy', 'unknown'] },
]

export default function DemoPage() {
  const [policy, setPolicy] = useState<AgentPolicy | null>(null)

  const [intentForm, setIntentForm] = useState<IntentForm>(() => loadLastIntent())
  const [bundle, setBundle] = useState<BundleResult | null>(null)

  const [cart, setCart] = useState<CartState>({
    cartId: null,
    checkoutUrl: null,
    isCreating: false,
    isAddingLines: false,
  })

  const [rawExplanation, setRawExplanation] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<ExplainResult | null>(null)
  const [isExplaining, setIsExplaining] = useState(false)

  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [passkeyState, setPasskeyState] = useState<PasskeyState>('idle')
  const [isGenerating, setIsGenerating] = useState(false)

  const [showVoiceExplainer, setShowVoiceExplainer] = useState(false)
  const [voiceExplanation, setVoiceExplanation] = useState<string | null>(null)
  const [blockedItems, setBlockedItems] = useState<string[]>([])

  const { addEvent, getRecentEvents } = useAuditLog()

  useEffect(() => {
    saveLastIntent(intentForm)
  }, [intentForm])

  useEffect(() => {
    const loadPolicyFromBackend = async () => {
      try {
        const data = await getPolicy()
        setPolicy(data.policy)
        setIntentForm(prev => ({
          ...prev,
          maxSpend: data.policy.maxSpend,
          allowedCategories: data.policy.allowedCategories,
          agentEnabled: data.policy.agentEnabled,
        }))
      } catch {
        const localPolicy = loadPermissionPolicy()
        setIntentForm(prev => ({
          ...prev,
          maxSpend: localPolicy.maxSpend,
          allowedCategories: localPolicy.allowedCategories,
          agentEnabled: localPolicy.agentEnabled,
        }))
      }
    }

    loadPolicyFromBackend()
  }, [])

  const handleGenerate = useCallback(() => {
    setShowPasskeyModal(true)
    setPasskeyState('idle')
  }, [])

  const handlePasskeyAuthorize = useCallback(async () => {
    setPasskeyState('prompting')

    const result = await authorizePasskey()

    if (!result.success) {
      setPasskeyState('failed')
      setShowVoiceExplainer(false)
      addEvent('CONSENT_DENIED', result.error || 'Passkey verification failed', {})
      return
    }

    setPasskeyState('success')
    setShowVoiceExplainer(true)

    // Optional authority check
    try {
      const authorityCheck = await checkAuthority({
        action: 'recommendBundle',
        cartTotal: 0,
        categories: (intentForm as any).allowedCategories ?? [],
        meta: { maxSpend: (intentForm as any).maxSpend, intent: (intentForm as any).shoppingIntent },
      })

      if (authorityCheck.decision === 'BLOCK') {
        setPasskeyState('failed')
        setShowVoiceExplainer(false)
        addEvent('AUTHORITY_BLOCKED', authorityCheck.reason, {
          maxSpend: (intentForm as any).maxSpend,
          allowedCategories: (intentForm as any).allowedCategories,
        })
        setVoiceExplanation(authorityCheck.reason)
        toast({
          title: 'Action blocked by policy',
          description: authorityCheck.reason,
          variant: 'destructive',
        })
        setTimeout(() => setShowPasskeyModal(false), 1500)
        return
      }
    } catch {
      // If authority service is down, proceed with local validation
    }

    addEvent('CONSENT_GRANTED', 'User authorized recommendation generation via passkey', {
      maxSpend: (intentForm as any).maxSpend,
      allowedCategories: (intentForm as any).allowedCategories,
      agentEnabled: (intentForm as any).agentEnabled,
    })

    setTimeout(async () => {
      setShowPasskeyModal(false)
      setIsGenerating(true)

      try {
        const { bundle: bundleResult, explanation: explainText } = await generateBundleWithExplain({
          ...intentForm,
          userId: USER_ID,
          products: DEMO_PRODUCTS,
        })

        setBundle(bundleResult)
        setRawExplanation(explainText)
        setExplanation(null)
        setCart({ cartId: null, checkoutUrl: null, isCreating: false, isAddingLines: false })

        const items = Array.isArray((bundleResult as any).items) ? (bundleResult as any).items : []
        const subtotal =
          typeof (bundleResult as any).subtotal === 'number'
            ? (bundleResult as any).subtotal
            : typeof (bundleResult as any).total === 'number'
              ? (bundleResult as any).total
              : 0

        addEvent(
          'BUNDLE_GENERATED',
          `Generated ${items.length} items totaling $${Number(subtotal).toFixed(2)}`,
          {
            maxSpend: (intentForm as any).maxSpend,
            allowedCategories: (intentForm as any).allowedCategories,
          },
          { itemCount: items.length, subtotal }
        )

        toast({
          title: 'Recommendations generated',
          description: `${items.length} items recommended within your $${(intentForm as any).maxSpend} budget`,
        })
      } catch (error) {
        toast({
          title: 'Generation failed',
          description: (error as Error)?.message || 'Could not generate recommendations. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsGenerating(false)
      }
    }, 1000)
  }, [intentForm, addEvent])

  const handlePasskeyCancel = useCallback(() => {
    setShowPasskeyModal(false)
    setPasskeyState('idle')
    setShowVoiceExplainer(false)
  }, [])

  const handlePasskeyRetry = useCallback(() => {
    setPasskeyState('idle')
  }, [])

  const handleReset = useCallback(() => {
    setIntentForm(DEFAULT_INTENT_FORM)
    setBundle(null)
    setRawExplanation(null)
    setExplanation(null)
    setCart({ cartId: null, checkoutUrl: null, isCreating: false, isAddingLines: false })
    setShowVoiceExplainer(false)
  }, [])

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    if (!bundle) return

    setBundle(prev => {
      if (!prev) return prev
      const prevAny = prev as any
      const prevItems: any[] = Array.isArray(prevAny.items) ? prevAny.items : []

      const items = prevItems.map(item =>
        item.id === itemId ? { ...item, qty: Math.max(1, (item.qty ?? 1) + delta) } : item
      )

      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.qty ?? 1),
        0
      )

      return {
        ...prevAny,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
      } as BundleResult
    })
  }, [bundle])

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!bundle) return

    const itemsAny: any[] = Array.isArray((bundle as any).items) ? ((bundle as any).items as any[]) : []
    const removed = itemsAny.find(i => i.id === itemId)
    if (!removed) return

    // Update UI immediately
    setBundle(prev => {
      if (!prev) return prev
      const prevAny = prev as any
      const prevItems: any[] = Array.isArray(prevAny.items) ? prevAny.items : []
      const items = prevItems.filter(item => item.id !== itemId)
      const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty ?? 1), 0)
      return { ...prevAny, items, subtotal: Math.round(subtotal * 100) / 100 } as BundleResult
    })

    // Persist feedback
    const rejectedLabel = String(removed.name ?? removed.title ?? removed.id ?? 'unknown_item')

    try {
      await sendFeedback({
        user_id: USER_ID,
        rejected_items: [rejectedLabel],
        reason: 'User removed from bundle',
      })

      addEvent('FEEDBACK_SUBMITTED', `User rejected item: ${rejectedLabel}`, {}, { item: rejectedLabel })

      toast({
        title: 'Feedback saved',
        description: `Me-Agent will avoid "${rejectedLabel}" in future recommendations`,
      })
    } catch {
      toast({
        title: 'Feedback failed',
        description: 'Could not save feedback. The bundle was still updated locally.',
        variant: 'destructive',
      })
    }
  }, [bundle, addEvent])

  const handleCreateCart = useCallback(async () => {
    setCart(prev => ({ ...prev, isCreating: true }))

    try {
      const result = await shopifyCartCreate()
      setCart(prev => ({ ...prev, cartId: result.cartId, isCreating: false }))

      addEvent('CART_CREATED', 'Shopify cart created', {}, { cartId: result.cartId })

      toast({ title: 'Cart created', description: 'Ready to add items' })
    } catch (error) {
      setCart(prev => ({ ...prev, isCreating: false }))
      toast({
        title: 'Failed to create cart',
        description: (error as Error)?.message || 'Please try again',
        variant: 'destructive',
      })
    }
  }, [addEvent])

  const handleAddLines = useCallback(async () => {
    if (!cart.cartId || !bundle) return

    const items: any[] = Array.isArray((bundle as any).items) ? (bundle as any).items : []

    const missing = items.some(i => typeof i.merchandiseId !== 'string' || !i.merchandiseId.length)
    if (missing) {
      toast({
        title: 'Cannot add to Shopify yet',
        description: 'Recommendations do not include merchandiseId values. Add a mapping step to Shopify variants first.',
        variant: 'destructive',
      })
      return
    }

    setCart(prev => ({ ...prev, isAddingLines: true }))

    try {
      const lines = items.map(item => ({
        merchandiseId: item.merchandiseId,
        quantity: item.qty ?? 1,
      }))

      const result = await shopifyCartLinesAdd({ cartId: cart.cartId, lines })

      setCart(prev => ({
        ...prev,
        checkoutUrl: result.checkoutUrl,
        isAddingLines: false,
      }))

      addEvent('CART_LINES_ADDED', `Added ${lines.length} items to cart`, {}, { lineCount: lines.length })
      addEvent('CHECKOUT_LINK_READY', 'Checkout URL generated. User must click to proceed', {}, { checkoutUrl: result.checkoutUrl })

      toast({ title: 'Items added to cart', description: 'Checkout is now available' })
    } catch (error) {
      setCart(prev => ({ ...prev, isAddingLines: false }))
      toast({
        title: 'Failed to add items',
        description: (error as Error)?.message || 'Please try again',
        variant: 'destructive',
      })
    }
  }, [cart.cartId, bundle, addEvent])

  const handleOpenCheckout = useCallback(() => {
    if (cart.checkoutUrl) window.open(cart.checkoutUrl, '_blank', 'noopener,noreferrer')
  }, [cart.checkoutUrl])

  const handleExplain = useCallback(async () => {
    if (!bundle) return
    setIsExplaining(true)
    try {
      const text = rawExplanation || 'No explanation was returned by the backend.'
      setExplanation({ text } as ExplainResult)
      addEvent('EXPLANATION_GENERATED', 'Agent explanation displayed', {}, { hasAudio: false })
    } finally {
      setIsExplaining(false)
    }
  }, [bundle, rawExplanation, addEvent])

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Intent + Constraints */}
        <div className="space-y-6">
          <IntentFormPanel
            form={intentForm}
            onChange={setIntentForm}
            onGenerate={handleGenerate}
            onReset={handleReset}
            isGenerating={isGenerating}
          />
        </div>

        {/* Right Column: Agent Output */}
        <div className="space-y-6">
          <BundleResultPanel
            bundle={bundle}
            maxSpend={intentForm.maxSpend}
            blockedItems={blockedItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
          
          <CartPanel
            cart={cart}
            bundle={bundle}
            onCreateCart={handleCreateCart}
            onAddLines={handleAddLines}
            onOpenCheckout={handleOpenCheckout}
          />
          
          <ExplainPanel
            explanation={explanation}
            bundle={bundle}
            isLoading={isExplaining}
            onExplain={handleExplain}
          />
          
          <AuditPreviewPanel events={getRecentEvents()} />
        </div>
      </div>

      {/* Passkey Consent Modal */}
      <PasskeyConsentModal
        open={showPasskeyModal}
        state={passkeyState}
        onAuthorize={handlePasskeyAuthorize}
        onCancel={handlePasskeyCancel}
        onRetry={handlePasskeyRetry}
      />

      {/* Voice Explainer - Top right */}
      {showVoiceExplainer && (
        <VoiceExplainer 
          explanation={voiceExplanation || explanation?.reasoning}
          onClose={() => setShowVoiceExplainer(false)}
        />
      )}
    </DashboardLayout>
  );
}
