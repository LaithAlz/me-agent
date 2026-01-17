import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Minus, Plus, Trash2, AlertTriangle, ShieldX } from 'lucide-react';
import type { BundleResult } from '@/types';

interface BundleResultPanelProps {
  bundle: BundleResult | any | null;
  maxSpend: number;
  blockedItems?: string[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
}

type NormalizedItem = {
  id: string;
  title: string;
  merchant: string;
  price: number;
  qty: number;
  tags: string[];
};

type NormalizedBundle = {
  items: NormalizedItem[];
  subtotal: number;
  currency: string;
  notes?: string;
};

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function makeFallbackId(item: any, index: number): string {
  const name = safeString(item?.name, safeString(item?.title, 'item'));
  const brand = safeString(item?.brand, safeString(item?.merchant, ''));
  return `${name}::${brand}::${index}`;
}

function normalizeBundle(bundle: any): NormalizedBundle {
  const rawItems: any[] = Array.isArray(bundle?.items) ? bundle.items : [];

  const items: NormalizedItem[] = rawItems.map((item, index) => {
    const id = safeString(item?.id, makeFallbackId(item, index));

    const title = safeString(item?.title, safeString(item?.name, 'Untitled item'));
    const merchant = safeString(item?.merchant, safeString(item?.brand, ''));
    const price = toNumber(item?.price, 0);

    const qty =
      typeof item?.qty === 'number'
        ? item.qty
        : typeof item?.quantity === 'number'
          ? item.quantity
          : 1;

    const tagsArray =
      Array.isArray(item?.reasonTags)
        ? item.reasonTags
        : Array.isArray(item?.tags)
          ? item.tags
          : [];

    const tags = tagsArray
      .map((t: any) => safeString(t, ''))
      .filter(Boolean);

    return { id, title, merchant, price, qty, tags };
  });

  const subtotal =
    typeof bundle?.subtotal === 'number'
      ? bundle.subtotal
      : typeof bundle?.total === 'number'
        ? bundle.total
        : items.reduce((acc, it) => acc + it.price * it.qty, 0);

  const currency = safeString(bundle?.currency, 'USD');
  const notes = safeString(bundle?.notes, safeString(bundle?.notesText, safeString(bundle?.notesSummary, '')));

  return { items, subtotal, currency, notes };
}

export function BundleResultPanel({
  bundle,
  maxSpend,
  blockedItems = [],
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
          <h3 className="font-medium mb-1">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground">
            Fill out your intent then click "Generate Shopping Bundle"
          </p>
        </CardContent>
      </Card>
    );
  }

  const normalized = normalizeBundle(bundle);
  const remaining = maxSpend - normalized.subtotal;
  const isNearLimit = remaining < maxSpend * 0.1;
  const isOverLimit = remaining < 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Recommended Bundle
          <Badge variant="secondary" className="ml-auto">
            {normalized.items.length} items
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Item List */}
        <div className="divide-y stagger-animation">
          {normalized.items.map((item) => (
            <BundleItemRow
              key={item.id}
              item={item}
              isBlocked={blockedItems.includes(item.id)}
              onUpdateQuantity={(delta) => onUpdateQuantity(item.id, delta)}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))}
        </div>

        {/* Blocked Items Warning */}
        {blockedItems.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <ShieldX className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">
                {blockedItems.length} item(s) blocked by your policy
              </p>
              <p className="text-xs opacity-80">
                Remove blocked items or adjust your policy in the Authority Panel
              </p>
            </div>
          </div>
        )}

        {/* Notes (if available from /recommend) */}
        {normalized.notes && (
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground whitespace-pre-line">
            {normalized.notes}
          </div>
        )}

        {/* Summary */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">
              ${normalized.subtotal.toFixed(2)} {normalized.currency}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget remaining</span>
            <span
              className={
                isOverLimit
                  ? 'text-destructive font-semibold'
                  : isNearLimit
                    ? 'text-warning font-semibold'
                    : ''
              }
            >
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
  isBlocked = false,
  onUpdateQuantity,
  onRemove,
}: {
  item: NormalizedItem;
  isBlocked?: boolean;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`py-4 first:pt-0 last:pb-0 ${isBlocked ? 'opacity-60' : ''}`}>
      <div className="flex gap-3">
        {/* Image placeholder */}
        <div className={`h-16 w-16 rounded-lg flex items-center justify-center shrink-0 ${
          isBlocked ? 'bg-destructive/10 ring-2 ring-destructive' : 'bg-muted'
        }`}>
          {isBlocked ? (
            <ShieldX className="h-6 w-6 text-destructive" />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium truncate">{item.title}</h4>
                {isBlocked && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    BLOCKED
                  </Badge>
                )}
              </div>
              {item.merchant && (
                <p className="text-xs text-muted-foreground truncate">{item.merchant}</p>
              )}
            </div>

            <span className="text-sm font-semibold shrink-0">
              ${(item.price * item.qty).toFixed(2)}
            </span>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="text-[10px] px-1.5 py-0.5 bg-verified/10 text-verified rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

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
