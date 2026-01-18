import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IntentFormPanel } from '@/components/demo/IntentFormPanel';
import { BundleResultPanel } from '@/components/demo/BundleResultPanel';
import { CartPanel } from '@/components/demo/CartPanel';
import { ExplainPanel } from '@/components/demo/ExplainPanel';
import { AuditPreviewPanel } from '@/components/demo/AuditPreviewPanel';
import { PasskeyConsentModal } from '@/components/demo/PasskeyConsentModal';
import { VoiceExplainer } from '@/components/VoiceExplainer';
import { useAuditLog } from '@/hooks/useAuditLog';
import { loadLastIntent, saveLastIntent, loadPermissionPolicy } from '@/lib/storage';
import { authorizePasskey, generateBundle, explainBundle, shopifyCartCreate, shopifyCartLinesAdd } from '@/lib/api';
import { checkAuthority, getPolicy, type AgentPolicy } from '@/lib/backendApi';
import type { 
  IntentForm, 
  BundleResult, 
  CartState, 
  ExplainResult, 
  PasskeyState 
} from '@/types';
import { DEFAULT_INTENT_FORM } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function DemoPage() {
  // Load persisted data on mount
  const [intentForm, setIntentForm] = useState<IntentForm>(() => loadLastIntent());
  const [bundle, setBundle] = useState<BundleResult | null>(null);
  const [cart, setCart] = useState<CartState>({
    cartId: null,
    checkoutUrl: null,
    isCreating: false,
    isAddingLines: false,
  });
  const [explanation, setExplanation] = useState<ExplainResult | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Passkey modal state
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyState, setPasskeyState] = useState<PasskeyState>('idle');
  const [isGenerating, setIsGenerating] = useState(false);

  // Audit log
  const { events, addEvent, getRecentEvents } = useAuditLog();

  // Authority layer state
  const [blockedItems, setBlockedItems] = useState<string[]>([]);
  const [policy, setPolicy] = useState<AgentPolicy | null>(null);
  
  // Voice explainer state
  const [showVoiceExplainer, setShowVoiceExplainer] = useState(false);
  const [voiceExplanation, setVoiceExplanation] = useState<string>('');

  // Sync intent form to localStorage
  useEffect(() => {
    saveLastIntent(intentForm);
  }, [intentForm]);

  // Sync with permission policy from backend authority layer
  useEffect(() => {
    const loadPolicyFromBackend = async () => {
      try {
        const data = await getPolicy();
        setPolicy(data.policy);
        setIntentForm(prev => ({
          ...prev,
          maxSpend: data.policy.maxSpend,
          allowedCategories: data.policy.allowedCategories,
          agentEnabled: data.policy.agentEnabled,
        }));
      } catch (e) {
        // Fallback to local storage if backend unavailable
        const localPolicy = loadPermissionPolicy();
        setIntentForm(prev => ({
          ...prev,
          maxSpend: localPolicy.maxSpend,
          allowedCategories: localPolicy.allowedCategories,
          agentEnabled: localPolicy.agentEnabled,
        }));
      }
    };
    
    loadPolicyFromBackend();
  }, []);

  const handleGenerate = useCallback(() => {
    setShowPasskeyModal(true);
    setPasskeyState('idle');
  }, []);

  const handlePasskeyAuthorize = useCallback(async () => {
    setPasskeyState('prompting');

    const result = await authorizePasskey();

    if (result.success) {
      setPasskeyState('success');
      setShowVoiceExplainer(true);
      
      // Authority check before generating bundle
      try {
        const authorityCheck = await checkAuthority({
          action: 'recommendBundle',
          cartTotal: 0,
          categories: intentForm.allowedCategories,
          meta: { maxSpend: intentForm.maxSpend, intent: intentForm.shoppingIntent },
        });

        if (authorityCheck.decision === 'BLOCK') {
          setPasskeyState('failed');
          addEvent('AUTHORITY_BLOCKED', authorityCheck.reason, {
            maxSpend: intentForm.maxSpend,
            allowedCategories: intentForm.allowedCategories,
          });
          setVoiceExplanation(authorityCheck.reason);
          toast({
            title: 'Action blocked by policy',
            description: authorityCheck.reason,
            variant: 'destructive',
          });
          setTimeout(() => setShowPasskeyModal(false), 1500);
          return;
        }
      } catch (e) {
        console.log('Authority check unavailable, proceeding with local validation');
      }
      
      addEvent('CONSENT_GRANTED', 'User authorized bundle generation via passkey', {
        maxSpend: intentForm.maxSpend,
        allowedCategories: intentForm.allowedCategories,
        agentEnabled: intentForm.agentEnabled,
      });

      // Generate bundle after short success display
      setTimeout(async () => {
        setShowPasskeyModal(false);
        setIsGenerating(true);
        
        try {
          const bundleResult = await generateBundle(intentForm);
          setBundle(bundleResult);
          setExplanation(null);
          setCart({ cartId: null, checkoutUrl: null, isCreating: false, isAddingLines: false });
          
          addEvent('BUNDLE_GENERATED', `Generated ${bundleResult.items.length} items totaling $${bundleResult.subtotal.toFixed(2)}`, {
            maxSpend: intentForm.maxSpend,
            allowedCategories: intentForm.allowedCategories,
          }, {
            itemCount: bundleResult.items.length,
            subtotal: bundleResult.subtotal,
          });

          toast({
            title: 'Bundle generated',
            description: `${bundleResult.items.length} items recommended within your $${intentForm.maxSpend} budget`,
          });
        } catch (error) {
          toast({
            title: 'Generation failed',
            description: 'Could not generate bundle. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsGenerating(false);
        }
      }, 1000);
    } else {
      setPasskeyState('failed');
      setShowVoiceExplainer(false);
      addEvent('CONSENT_DENIED', result.error || 'Passkey verification failed', {});
    }
  }, [intentForm, addEvent]);

  const handlePasskeyCancel = useCallback(() => {
    setShowPasskeyModal(false);
    setPasskeyState('idle');
    setShowVoiceExplainer(false);
  }, []);

  const handlePasskeyRetry = useCallback(() => {
    setPasskeyState('idle');
  }, []);

  const handleReset = useCallback(() => {
    setIntentForm(DEFAULT_INTENT_FORM);
    setBundle(null);
    setExplanation(null);
    setCart({ cartId: null, checkoutUrl: null, isCreating: false, isAddingLines: false });
    setShowVoiceExplainer(false);
  }, []);

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    if (!bundle) return;
    
    setBundle(prev => {
      if (!prev) return prev;
      const items = prev.items.map(item => 
        item.id === itemId 
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      );
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      return { ...prev, items, subtotal: Math.round(subtotal * 100) / 100 };
    });
  }, [bundle]);

  const handleRemoveItem = useCallback((itemId: string) => {
    if (!bundle) return;
    
    setBundle(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(item => item.id !== itemId);
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      return { ...prev, items, subtotal: Math.round(subtotal * 100) / 100 };
    });
  }, [bundle]);

  const handleCreateCart = useCallback(async () => {
    setCart(prev => ({ ...prev, isCreating: true }));
    
    // Authority check before creating cart
    try {
      const authorityCheck = await checkAuthority({
        action: 'cartCreate',
        cartTotal: bundle?.subtotal || 0,
        categories: bundle?.items.map(i => i.category || 'general') || [],
        items: bundle?.items.map(i => ({
          id: i.id,
          title: i.title,
          price: i.price,
          category: i.category || 'general',
          qty: i.qty,
        })) || [],
      });

      if (authorityCheck.decision === 'BLOCK') {
        setCart(prev => ({ ...prev, isCreating: false }));
        addEvent('AUTHORITY_BLOCKED', authorityCheck.reason, {});
        toast({
          title: 'Cart creation blocked',
          description: authorityCheck.reason,
          variant: 'destructive',
        });
        return;
      }
    } catch (e) {
      console.log('Authority check unavailable, proceeding');
    }
    
    try {
      const result = await shopifyCartCreate();
      setCart(prev => ({ ...prev, cartId: result.cartId, isCreating: false }));
      
      addEvent('CART_CREATED', 'Shopify cart created', {}, { cartId: result.cartId });
      
      toast({
        title: 'Cart created',
        description: 'Ready to add items',
      });
    } catch (error) {
      setCart(prev => ({ ...prev, isCreating: false }));
      toast({
        title: 'Failed to create cart',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, [addEvent, bundle]);

  const handleAddLines = useCallback(async () => {
    if (!cart.cartId || !bundle) return;
    
    setCart(prev => ({ ...prev, isAddingLines: true }));
    
    // Authority check before adding lines
    try {
      const authorityCheck = await checkAuthority({
        action: 'addToCart',
        cartTotal: bundle.subtotal,
        categories: bundle.items.map(i => i.category || 'general'),
        items: bundle.items.map(i => ({
          id: i.id,
          title: i.title,
          price: i.price,
          category: i.category || 'general',
          qty: i.qty,
        })),
      });

      if (authorityCheck.decision === 'BLOCK') {
        setCart(prev => ({ ...prev, isAddingLines: false }));
        // Track blocked items
        if (authorityCheck.blockedItems) {
          setBlockedItems(authorityCheck.blockedItems.map((b: any) => b.id || b));
        }
        addEvent('AUTHORITY_BLOCKED', authorityCheck.reason, {});
        toast({
          title: 'Items blocked by policy',
          description: authorityCheck.reason,
          variant: 'destructive',
        });
        return;
      } else {
        setBlockedItems([]);
      }
    } catch (e) {
      console.log('Authority check unavailable, proceeding');
    }
    
    try {
      const lines = bundle.items.map(item => ({
        merchandiseId: item.id,
        quantity: item.qty,
      }));
      
      const result = await shopifyCartLinesAdd({ cartId: cart.cartId, lines });
      setCart(prev => ({ 
        ...prev, 
        checkoutUrl: result.checkoutUrl, 
        isAddingLines: false 
      }));
      
      addEvent('CART_LINES_ADDED', `Added ${lines.length} items to cart`, {}, { lineCount: lines.length });
      addEvent('CHECKOUT_LINK_READY', 'Checkout URL generated - user must click to proceed', {}, { checkoutUrl: result.checkoutUrl });
      
      toast({
        title: 'Items added to cart',
        description: 'Checkout is now available',
      });
    } catch (error) {
      setCart(prev => ({ ...prev, isAddingLines: false }));
      toast({
        title: 'Failed to add items',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, [cart.cartId, bundle, addEvent]);

  const handleOpenCheckout = useCallback(async () => {
    if (!cart.checkoutUrl || !bundle) return;
    
    // Authority check before checkout - enforces requireConfirm
    try {
      const authorityCheck = await checkAuthority({
        action: 'checkoutStart',
        cartTotal: bundle.subtotal,
        categories: bundle.items.map(i => i.category || 'general'),
        items: bundle.items.map(i => ({
          id: i.id,
          title: i.title,
          price: i.price,
          category: i.category || 'general',
          qty: i.qty,
        })),
        meta: { checkoutUrl: cart.checkoutUrl },
      });

      if (authorityCheck.decision === 'BLOCK') {
        addEvent('CHECKOUT_BLOCKED', authorityCheck.reason, {});
        toast({
          title: 'Checkout blocked',
          description: authorityCheck.reason,
          variant: 'destructive',
        });
        return;
      }
      
      addEvent('CHECKOUT_APPROVED', 'User confirmed checkout', {});
    } catch (e) {
      console.log('Authority check unavailable, proceeding with user click');
    }
    
    // In a real app, this would open the Shopify checkout
    window.open(cart.checkoutUrl, '_blank', 'noopener,noreferrer');
  }, [cart.checkoutUrl, bundle, addEvent]);

  const handleExplain = useCallback(async () => {
    if (!bundle) {
      console.log('No bundle available');
      return;
    }
    
    setIsExplaining(true);
    console.log('Generating explanation...');
    
    try {
      const result = await explainBundle({
        intent: intentForm.shoppingIntent,
        bundle,
      });
      
      console.log('Explanation result:', result);
      
      setExplanation(result);
      setVoiceExplanation(result.text);
      
      addEvent('EXPLANATION_GENERATED', 'Agent explained its reasoning', {}, { hasAudio: !!result.audioUrl });
      
      toast({
        title: 'Explanation generated',
        description: 'Playing explanation now',
      });
    } catch (error) {
      console.error('Error generating explanation:', error);
      toast({
        title: 'Failed to generate explanation',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsExplaining(false);
    }
  }, [bundle, intentForm.shoppingIntent, addEvent]);

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
