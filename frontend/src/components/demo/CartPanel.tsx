import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ExternalLink, Shield, Loader2 } from 'lucide-react';
import type { CartState } from '@/types';

type CartLikeItem = {
  name?: string;
  title?: string;
  brand?: string;
  price?: number;
  qty?: number;
  merchandiseId?: string;
};

type ParsedCart = {
  items?: CartLikeItem[];
  total?: number;
  notes?: string;
};

interface CartPanelProps {
  cart: CartState;

  // Old: bundle: BundleResult
  // New: could be { items: [...] } or a JSON string or { cart: "JSON..." }
  bundle: any | null;

  onCreateCart: () => void;
  onAddLines: () => void;
  onOpenCheckout: () => void;
}

function safeParseJson<T>(value: unknown): T | null {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractItems(bundle: any | null): CartLikeItem[] {
  if (!bundle) return [];

  // Case 1: already a cart-like object
  if (Array.isArray(bundle.items)) return bundle.items as CartLikeItem[];

  // Case 2: backend wrapper like { cart: "..." }
  if (typeof bundle.cart === 'string') {
    const parsed = safeParseJson<ParsedCart>(bundle.cart);
    return Array.isArray(parsed?.items) ? parsed!.items! : [];
  }

  // Case 3: bundle itself is JSON string
  if (typeof bundle === 'string') {
    const parsed = safeParseJson<ParsedCart>(bundle);
    return Array.isArray(parsed?.items) ? parsed!.items! : [];
  }

  return [];
}

function hasMerchandiseIds(items: CartLikeItem[]): boolean {
  return items.length > 0 && items.every((i) => typeof i.merchandiseId === 'string' && i.merchandiseId.length > 0);
}

export function CartPanel({
  cart,
  bundle,
  onCreateCart,
  onAddLines,
  onOpenCheckout,
}: CartPanelProps) {
  const items = extractItems(bundle);

  const hasRecommendations = items.length > 0;
  const hasCart = !!cart.cartId;
  const hasCheckout = !!cart.checkoutUrl;

  // Shopify line adds require Shopify merchandise IDs
  const canMapToShopify = hasMerchandiseIds(items);

  const disableCreateCart = !hasRecommendations || hasCart || cart.isCreating;
  const disableAddLines = !hasCart || hasCheckout || cart.isAddingLines || !canMapToShopify;
  const disableOpenCheckout = !hasCheckout;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Cart and Checkout
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status indicators */}
        <div className="space-y-2">
          <StatusRow
            label="Recommendations ready"
            completed={hasRecommendations}
            active={hasRecommendations}
          />
          <StatusRow
            label="Shopify cart created"
            completed={hasCart}
            active={hasCart}
          />
          <StatusRow
            label="Checkout ready"
            completed={hasCheckout}
            active={hasCheckout}
          />
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={disableCreateCart}
            onClick={onCreateCart}
          >
            {cart.isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            Create Shopify Cart
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={disableAddLines}
            onClick={onAddLines}
          >
            {cart.isAddingLines ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            Add Lines to Cart
          </Button>

          {!canMapToShopify && hasRecommendations && (
            <p className="text-xs text-muted-foreground">
              Shopify line items are not available yet because recommendations do not include
              merchandiseId values. You need a mapping step from recommended items to Shopify products.
            </p>
          )}

          <Button
            className="w-full justify-start"
            disabled={disableOpenCheckout}
            onClick={onOpenCheckout}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Checkout
          </Button>
        </div>

        {/* Security banner */}
        <div className="trust-banner mt-4">
          <Shield className="h-4 w-4 text-verified shrink-0" />
          <p className="text-xs">
            <strong>No autonomous purchase.</strong> Checkout requires user click.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  completed,
  active,
}: {
  label: string;
  completed: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`h-2 w-2 rounded-full ${
          completed ? 'bg-verified' : active ? 'bg-warning' : 'bg-muted'
        }`}
      />
      <span className={completed ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      {completed && <span className="text-xs text-verified ml-auto">✓</span>}
    </div>
  );
}
