import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IntentFormPanel } from '@/components/demo/IntentFormPanel';
import { BundleResultPanel } from '@/components/demo/BundleResultPanel';
import { CartPanel } from '@/components/demo/CartPanel';
import { ExplainPanel } from '@/components/demo/ExplainPanel';
import { AuditPreviewPanel } from '@/components/demo/AuditPreviewPanel';
import { PasskeyConsentModal } from '@/components/demo/PasskeyConsentModal';
import { VoiceExplainer } from '@/components/VoiceExplainer';
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
  addCartItem,
  loadCartItems,
} from '@/lib/storage';
import { authorizePasskey, generateBundle, explainBundle, sendFeedback } from '@/lib/api';
import { checkAuthority } from '@/lib/backendApi';
import type { IntentForm, BundleResult, ExplainResult, CartItem, PasskeyState } from '@/types';
import { DEFAULT_INTENT_FORM } from '@/types';
import { toast } from '@/hooks/use-toast';

const USER_ID = 'demo-user-1';

export default function DemoPage() {
  const [intentForm, setIntentForm] = useState<IntentForm>(() => loadLastIntent());
  const [bundle, setBundle] = useState<BundleResult | null>(() => loadLastBundle());
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartItems());
  const [cartCount, setCartCount] = useState(() => loadCartItems().reduce((sum, item) => sum + item.qty, 0));
  const [explanation, setExplanation] = useState<ExplainResult | null>(() => loadLastExplanation());
  const [isExplaining, setIsExplaining] = useState(false);

  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyState, setPasskeyState] = useState<PasskeyState>('idle');
  const [isGenerating, setIsGenerating] = useState(false);

  const [showVoiceExplainer, setShowVoiceExplainer] = useState(false);
  const [voiceExplanation, setVoiceExplanation] = useState<string | null>(null);
  const [blockedItems, setBlockedItems] = useState<string[]>([]);

  const navigate = useNavigate();
  const { addEvent, getRecentEvents } = useAuditLog();

  const cartQuantities = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = (acc[item.id] ?? 0) + item.qty;
      return acc;
    }, {});
  }, [cartItems]);

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

  const handleGenerate = useCallback(() => {
    setShowPasskeyModal(true);
    setPasskeyState('idle');
  }, []);

  const handlePasskeyAuthorize = useCallback(async () => {
    setPasskeyState('prompting');

    const result = await authorizePasskey();
    if (!result.success) {
      setPasskeyState('failed');
      setShowVoiceExplainer(false);
      addEvent('CONSENT_DENIED', result.error || 'Passkey verification failed', {});
      return;
    }

    setPasskeyState('success');
    setShowVoiceExplainer(true);

    try {
      const authorityCheck = await checkAuthority({
        action: 'recommendBundle',
        cartTotal: 0,
        categories: intentForm.allowedCategories,
        meta: {
          maxSpend: intentForm.maxSpend,
          intent: intentForm.shoppingIntent,
        },
      });

      if (authorityCheck.decision === 'BLOCK') {
        setPasskeyState('failed');
        setShowVoiceExplainer(false);
        setVoiceExplanation(authorityCheck.reason);
        setBlockedItems(authorityCheck.blockedItems?.map((item) => item.id) ?? []);
        addEvent('AUTHORITY_BLOCKED', authorityCheck.reason, {
          maxSpend: intentForm.maxSpend,
          allowedCategories: intentForm.allowedCategories,
        });
        toast({
          title: 'Action blocked by policy',
          description: authorityCheck.reason,
          variant: 'destructive',
        });
        setTimeout(() => setShowPasskeyModal(false), 1500);
        return;
      }
    } catch {
      // If authority service is down, proceed with local validation
    }

    addEvent('CONSENT_GRANTED', 'User authorized bundle generation via passkey', {
      maxSpend: intentForm.maxSpend,
      allowedCategories: intentForm.allowedCategories,
      agentEnabled: intentForm.agentEnabled,
    });

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
        setBlockedItems([]);

        const bundleItemCount = bundleResult.items.reduce((sum, item) => sum + item.qty, 0);
        addEvent(
          'BUNDLE_GENERATED',
          `Generated ${bundleItemCount} items totaling $${bundleResult.subtotal.toFixed(2)}`,
          {
            maxSpend: intentForm.maxSpend,
            allowedCategories: intentForm.allowedCategories,
          },
          {
            itemCount: bundleItemCount,
            subtotal: bundleResult.subtotal,
          }
        );

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
    setShowVoiceExplainer(false);
    setVoiceExplanation(null);
    setBlockedItems([]);

    const currentCart = loadCartItems();
    setCartItems(currentCart);
    setCartCount(currentCart.reduce((sum, item) => sum + item.qty, 0));
  }, []);

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    if (!bundle) return;

    setBundle((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const maxQty = item.stockQuantity ?? Number.POSITIVE_INFINITY;
        const remaining = Math.max(maxQty - (cartQuantities[item.id] ?? 0), 0);
        const nextQty = Math.max(1, item.qty + delta);
        return { ...item, qty: Math.min(nextQty, remaining || 1) };
      });
      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      return { ...prev, items, subtotal: Math.round(subtotal * 100) / 100 };
    });
  }, [bundle, cartQuantities]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!bundle) return;

    const removed = bundle.items.find((item) => item.id === itemId);
    if (!removed) return;

    setBundle((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((item) => item.id !== itemId);
      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      return { ...prev, items, subtotal: Math.round(subtotal * 100) / 100 };
    });

    try {
      await sendFeedback({
        user_id: USER_ID,
        rejected_items: [removed.title ?? removed.id],
        reason: 'User removed from bundle',
      });

      addEvent('FEEDBACK_SUBMITTED', `User rejected item: ${removed.title}`, {}, { item: removed.title });
      toast({
        title: 'Feedback saved',
        description: `Me-Agent will avoid "${removed.title}" in future recommendations`,
      });
    } catch {
      toast({
        title: 'Feedback failed',
        description: 'Could not save feedback. The bundle was still updated locally.',
        variant: 'destructive',
      });
    }
  }, [bundle, addEvent]);

  const handleAddBundleToCart = useCallback(() => {
    if (!bundle) return;
    const currentCart = loadCartItems();
    const currentQuantities = currentCart.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = (acc[item.id] ?? 0) + item.qty;
      return acc;
    }, {});

    const outOfStock: string[] = [];
    const insufficient: string[] = [];

    bundle.items.forEach((item) => {
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

    bundle.items.forEach((item) => {
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
      const lines = bundle.items
        .map((item) => {
          const tags = item.reasonTags?.length ? ` (${item.reasonTags.join(', ')})` : '';
          return `• ${item.title}${tags}`;
        })
        .join('\n');

      const text = `Based on your intent, Me-Agent selected ${bundle.items.length} item(s) within your CAD $${intentForm.maxSpend} budget:\n${lines}`;
      const result = await explainBundle({ text });
      setExplanation(result);
      addEvent('EXPLANATION_GENERATED', 'Agent explanation displayed', {}, { hasAudio: false });
    } finally {
      setIsExplaining(false);
    }
  }, [bundle, intentForm.maxSpend, addEvent]);

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <IntentFormPanel
            form={intentForm}
            onChange={setIntentForm}
            onGenerate={handleGenerate}
            onReset={handleReset}
            isGenerating={isGenerating}
          />
        </div>

        <div className="space-y-6">
          <BundleResultPanel
            bundle={bundle}
            maxSpend={intentForm.maxSpend}
            blockedItems={blockedItems}
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

      <PasskeyConsentModal
        open={showPasskeyModal}
        state={passkeyState}
        onAuthorize={handlePasskeyAuthorize}
        onCancel={handlePasskeyCancel}
        onRetry={handlePasskeyRetry}
      />

      {showVoiceExplainer && (
        <VoiceExplainer
          explanation={voiceExplanation || explanation?.text || ''}
          onClose={() => setShowVoiceExplainer(false)}
        />
      )}
    </DashboardLayout>
  );
}
