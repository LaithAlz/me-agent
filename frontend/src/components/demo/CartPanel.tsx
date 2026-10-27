import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ExternalLink, Shield } from 'lucide-react';
import type { BundleResult } from '@/types';

interface CartPanelProps {
  bundle: BundleResult | null;
  cartCount: number;
  onAddBundle: () => void;
  onOpenCheckout: () => void;
}

export function CartPanel({
  bundle,
  cartCount,
  onAddBundle,
  onOpenCheckout,
}: CartPanelProps) {
  const hasBundle = Boolean(bundle && bundle.items.length > 0);
  const hasCart = cartCount > 0;

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
          <StatusRow label="Recommendations ready" completed={hasBundle} active={hasBundle} />
          <StatusRow label="Items in checkout" completed={hasCart} active={hasCart} />
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={!hasBundle}
            onClick={onAddBundle}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add bundle to checkout
          </Button>

          <Button className="w-full justify-start" disabled={!hasCart} onClick={onOpenCheckout}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Go to Checkout
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
