import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { BundleResult, BundleItem } from '@/types';

interface BundleResultPanelProps {
  bundle: BundleResult | null;
  maxSpend: number;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
}

export function BundleResultPanel({
  bundle,
  maxSpend,
  onUpdateQuantity,
  onRemoveItem,
}: BundleResultPanelProps) {
  if (!bundle) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No bundle generated</h3>
          <p className="text-sm text-muted-foreground">
            Fill out your intent and click "Generate Shopping Bundle"
          </p>
        </CardContent>
      </Card>
    );
  }

  const remaining = maxSpend - bundle.subtotal;
  const isNearLimit = remaining < maxSpend * 0.1;
  const isOverLimit = remaining < 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Recommended Bundle
          <Badge variant="secondary" className="ml-auto">
            {bundle.items.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item List */}
        <div className="divide-y stagger-animation">
          {bundle.items.map((item) => (
            <BundleItemRow
              key={item.id}
              item={item}
              onUpdateQuantity={(delta) => onUpdateQuantity(item.id, delta)}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">
              ${bundle.subtotal.toFixed(2)} {bundle.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget remaining</span>
            <span className={isOverLimit ? 'text-destructive font-semibold' : isNearLimit ? 'text-warning font-semibold' : ''}>
              ${remaining.toFixed(2)}
            </span>
          </div>
          
          {isOverLimit && (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Bundle exceeds budget. Remove items or increase limit.</span>
            </div>
          )}
          
          {isNearLimit && !isOverLimit && (
            <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-warning text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Approaching budget limit.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BundleItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: BundleItem;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={item.imageUrl ?? 'https://placehold.co/128x128?text=Product'}
            alt={item.title}
            className="max-h-full max-w-full object-contain object-center"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium truncate">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.merchant}</p>
            </div>
            <span className="text-sm font-semibold shrink-0">
              ${(item.price * item.qty).toFixed(2)}
            </span>
          </div>

          {/* Reason Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {item.reasonTags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 bg-verified/10 text-verified rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdateQuantity(-1)}
                disabled={item.qty <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdateQuantity(1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
