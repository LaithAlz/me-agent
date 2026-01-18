import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, ShoppingCart, Trash2 } from 'lucide-react';
import type { CartItem } from '@/types';
import {
  loadCartItems,
  updateCartItemQty,
  removeCartItem,
  clearCartItems,
  loadCheckoutUrl,
  saveCheckoutUrl,
} from '@/lib/storage';
import { shopifyCartCreate, shopifyCartLinesAdd } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>(() => loadCartItems());
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(() => loadCheckoutUrl());
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setItems(loadCartItems());
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [items]);

  const handleQtyChange = (itemId: string, delta: number) => {
    const current = items.find(item => item.id === itemId);
    if (!current) return;
    const updated = updateCartItemQty(itemId, current.qty + delta);
    setItems(updated);
  };

  const handleRemove = (itemId: string) => {
    const updated = removeCartItem(itemId);
    setItems(updated);
  };

  const handleClear = () => {
    clearCartItems();
    setItems([]);
    setCheckoutUrl(null);
    saveCheckoutUrl(null);
  };

  const handleCreateCheckout = async () => {
    if (items.length === 0) return;
    setIsCreating(true);
    try {
      const { cartId } = await shopifyCartCreate();
      const lines = items.map(item => ({ merchandiseId: item.id, quantity: item.qty }));
      const { checkoutUrl: url } = await shopifyCartLinesAdd({ cartId, lines });
      setCheckoutUrl(url);
      saveCheckoutUrl(url);
      toast({
        title: 'Checkout ready',
        description: 'Click open checkout to proceed',
      });
    } catch (error) {
      toast({
        title: 'Checkout failed',
        description: 'Could not create checkout link',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCheckout = () => {
    if (!checkoutUrl) return;
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Checkout
          </h1>
          <Button variant="ghost" onClick={handleClear} disabled={items.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear cart
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selected items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground">No items selected yet.</p>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                    <div className="h-20 w-28 rounded bg-muted/40 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.imageUrl ?? 'https://placehold.co/120x80?text=Product'}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain object-center"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleQtyChange(item.id, -1)}>
                        -
                      </Button>
                      <span className="w-8 text-center">{item.qty}</span>
                      <Button variant="outline" size="icon" onClick={() => handleQtyChange(item.id, 1)}>
                        +
                      </Button>
                    </div>
                    <Button variant="ghost" onClick={() => handleRemove(item.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="text-2xl font-bold">${subtotal.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleCreateCheckout}
                disabled={items.length === 0 || isCreating}
              >
                Create checkout link
              </Button>
              <Button onClick={handleOpenCheckout} disabled={!checkoutUrl}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
