import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ExternalLink, Shield, Loader2 } from 'lucide-react';
import type { CartState, BundleResult } from '@/types';

interface CartPanelProps {
  cart: CartState;
  bundle: BundleResult | null;
  onCreateCart: () => void;
  onAddLines: () => void;
  onOpenCheckout: () => void;
}

export function CartPanel({
  cart,
  bundle,
  onCreateCart,
  onAddLines,
  onOpenCheckout,
}: CartPanelProps) {
  const hasBundle = bundle && bundle.items.length > 0;
  const hasCart = !!cart.cartId;
  const hasCheckout = !!cart.checkoutUrl;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Cart + Checkout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicators */}
        <div className="space-y-2">
          <StatusRow 
            label="Bundle ready" 
            completed={!!hasBundle} 
            active={!!hasBundle}
          />
          <StatusRow 
            label="Cart created" 
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
            disabled={!hasBundle || hasCart || cart.isCreating}
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
            disabled={!hasCart || hasCheckout || cart.isAddingLines}
            onClick={onAddLines}
          >
            {cart.isAddingLines ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            Add Lines to Cart
          </Button>

          <Button
            className="w-full justify-start"
            disabled={!hasCheckout}
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
  active 
}: { 
  label: string; 
  completed: boolean; 
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div 
        className={`h-2 w-2 rounded-full ${
          completed 
            ? 'bg-verified' 
            : active 
              ? 'bg-warning' 
              : 'bg-muted'
        }`} 
      />
      <span className={completed ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      {completed && (
        <span className="text-xs text-verified ml-auto">✓</span>
      )}
    </div>
  );
}
