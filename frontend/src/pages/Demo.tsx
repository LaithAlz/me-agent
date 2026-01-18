import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IntentFormPanel } from '@/components/demo/IntentFormPanel';
import { BundleResultPanel } from '@/components/demo/BundleResultPanel';
import { CartPanel } from '@/components/demo/CartPanel';
import { ExplainPanel } from '@/components/demo/ExplainPanel';
import { AuditPreviewPanel } from '@/components/demo/AuditPreviewPanel';
import { PasskeyConsentModal } from '@/components/demo/PasskeyConsentModal';
import { useAuditLog } from '@/hooks/useAuditLog';
import {
  loadLastIntent,
  saveLastIntent,
  loadPermissionPolicy,
  savePermissionPolicy,
  loadLastBundle,
  saveLastBundle,
  loadLastExplanation,
  saveLastExplanation,
} from '@/lib/storage';
import { authorizePasskey, generateBundle, explainBundle } from '@/lib/api';
import type { 
  IntentForm, 
  BundleResult, 
  ExplainResult,
  CartItem,
  PasskeyState 
} from '@/types';
import { DEFAULT_INTENT_FORM } from '@/types';
import { toast } from '@/hooks/use-toast';
import { addCartItem, loadCartItems } from '@/lib/storage';

export default function DemoPage() {
  // Load persisted data on mount
  const [intentForm, setIntentForm] = useState<IntentForm>(() => loadLastIntent());
  const [bundle, setBundle] = useState<BundleResult | null>(() => loadLastBundle());
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartItems());
  const [cartCount, setCartCount] = useState(() => loadCartItems().reduce((sum, item) => sum + item.qty, 0));
  const [explanation, setExplanation] = useState<ExplainResult | null>(() => loadLastExplanation());
  const [isExplaining, setIsExplaining] = useState(false);

  // Passkey modal state
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyState, setPasskeyState] = useState<PasskeyState>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const cartQuantities = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = (acc[item.id] ?? 0) + item.qty;
      return acc;
    }, {});
  }, [cartItems]);

  // Audit log
  const { events, addEvent, getRecentEvents } = useAuditLog();

  // Sync intent form to localStorage
  useEffect(() => {
    saveLastIntent(intentForm);
    const currentPolicy = loadPermissionPolicy();
    savePermissionPolicy({
      ...currentPolicy,
      maxSpend: intentForm.maxSpend,
      allowedCategories: intentForm.allowedCategories,
      agentEnabled: intentForm.agentEnabled,
    });
  }, [intentForm]);

  useEffect(() => {
    saveLastBundle(bundle);
  }, [bundle]);

  useEffect(() => {
    saveLastExplanation(explanation);
  }, [explanation]);

  // Sync with permission policy from settings
  useEffect(() => {
    const policy = loadPermissionPolicy();
    setIntentForm(prev => ({
      ...prev,
      maxSpend: policy.maxSpend,
      allowedCategories: policy.allowedCategories,
      agentEnabled: policy.agentEnabled,
    }));
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
          const currentCart = loadCartItems();
          setCartItems(currentCart);
          setCartCount(currentCart.reduce((sum, item) => sum + item.qty, 0));
          const bundleResult = await generateBundle({
            ...intentForm,
            cartItems: currentCart,
          });
          setBundle(bundleResult);
          setExplanation(null);
          setCartCount(loadCartItems().reduce((sum, item) => sum + item.qty, 0));
          
          const bundleItemCount = bundleResult.items.reduce((sum, item) => sum + item.qty, 0);
          addEvent('BUNDLE_GENERATED', `Generated ${bundleItemCount} items totaling $${bundleResult.subtotal.toFixed(2)}`, {
            maxSpend: intentForm.maxSpend,
            allowedCategories: intentForm.allowedCategories,
          }, {
            itemCount: bundleItemCount,
            subtotal: bundleResult.subtotal,
          });

          toast({
            title: 'Bundle generated',
            description: `${bundleItemCount} items recommended within your $${intentForm.maxSpend} budget`,
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
      addEvent('CONSENT_DENIED', result.error || 'Passkey verification failed', {});
    }
  }, [intentForm, addEvent]);

  const handlePasskeyCancel = useCallback(() => {
    setShowPasskeyModal(false);
    setPasskeyState('idle');
  }, []);

  const handlePasskeyRetry = useCallback(() => {
    setPasskeyState('idle');
  }, []);

  const handleReset = useCallback(() => {
    setIntentForm(DEFAULT_INTENT_FORM);
    setBundle(null);
    setExplanation(null);
    const currentCart = loadCartItems();
    setCartItems(currentCart);
    setCartCount(currentCart.reduce((sum, item) => sum + item.qty, 0));
  }, []);

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    if (!bundle) return;
    
    setBundle(prev => {
      if (!prev) return prev;
      const items = prev.items.map(item => {
        if (item.id !== itemId) return item;
        const maxQty = item.stockQuantity ?? Number.POSITIVE_INFINITY;
        const remaining = Math.max(maxQty - (cartQuantities[item.id] ?? 0), 0);
        const nextQty = Math.max(1, item.qty + delta);
        return { ...item, qty: Math.min(nextQty, remaining || 1) };
      });
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      return { ...prev, items, subtotal: Math.round(subtotal * 100) / 100 };
    });
  }, [bundle, cartQuantities]);

  const handleRemoveItem = useCallback((itemId: string) => {
    if (!bundle) return;
    
    setBundle(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(item => item.id !== itemId);
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      return { ...prev, items, subtotal: Math.round(subtotal * 100) / 100 };
    });
  }, [bundle]);

  const handleAddBundleToCart = useCallback(() => {
    if (!bundle) return;
    const currentCart = loadCartItems();
    const currentQuantities = currentCart.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = (acc[item.id] ?? 0) + item.qty;
      return acc;
    }, {});

    const outOfStock: string[] = [];
    const insufficient: string[] = [];

    bundle.items.forEach(item => {
      const maxQty = item.stockQuantity ?? Number.POSITIVE_INFINITY;
      const existingQty = currentQuantities[item.id] ?? 0;
      const available = Math.max(maxQty - existingQty, 0);
      if (available <= 0) {
        outOfStock.push(item.title);
      } else if (available < item.qty) {
        insufficient.push(item.title);
      }
    });

    if (outOfStock.length > 0 || insufficient.length > 0) {
      const messages = [
        outOfStock.length > 0 ? `Out of stock: ${outOfStock.join(', ')}` : null,
        insufficient.length > 0 ? `Insufficient stock: ${insufficient.join(', ')}` : null,
      ].filter(Boolean);

      toast({
        title: 'Bundle not added',
        description: messages.join(' • '),
        variant: 'destructive',
      });
      return;
    }

    bundle.items.forEach(item => {
      addCartItem({
        id: item.id,
        title: item.title,
        price: item.price,
        qty: item.qty,
        imageUrl: item.imageUrl,
        stockQuantity: item.stockQuantity,
      });
    });

    const updatedCart = loadCartItems();
    setCartItems(updatedCart);
    const updatedCount = updatedCart.reduce((sum, item) => sum + item.qty, 0);
    setCartCount(updatedCount);

    const bundleItemCount = bundle.items.reduce((sum, item) => sum + item.qty, 0);
    addEvent('CART_LINES_ADDED', `Added ${bundleItemCount} items to checkout`, {}, { lineCount: bundleItemCount });

    toast({
      title: 'Items added to checkout',
      description: 'Review them in the Checkout tab',
    });
  }, [bundle, addEvent]);

  const handleOpenCheckout = useCallback(() => {
    navigate('/checkout');
  }, [navigate]);

  const handleExplain = useCallback(async () => {
    if (!bundle) return;
    
    setIsExplaining(true);
    
    try {
      const result = await explainBundle({
        intent: intentForm.shoppingIntent,
        bundle,
      });
      setExplanation(result);
      
      addEvent('EXPLANATION_GENERATED', 'Agent explained its reasoning', {}, { hasAudio: !!result.audioUrl });
    } catch (error) {
      toast({
        title: 'Failed to generate explanation',
        description: 'Please try again',
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
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            cartQuantities={cartQuantities}
          />
          
          <CartPanel
            bundle={bundle}
            cartCount={cartCount}
            onAddBundle={handleAddBundleToCart}
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
    </DashboardLayout>
  );
}
