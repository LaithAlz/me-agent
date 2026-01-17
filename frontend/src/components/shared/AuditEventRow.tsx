import { cn } from '@/lib/utils';
import type { AuditEvent } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { 
  Shield, 
  Package, 
  ShoppingCart, 
  ExternalLink,
  MessageSquare,
  XCircle 
} from 'lucide-react';

interface AuditEventRowProps {
  event: AuditEvent;
  compact?: boolean;
  onExpand?: () => void;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; bgClass: string; label: string }> = {
  CONSENT_GRANTED: { icon: Shield, bgClass: 'audit-consent', label: 'Consent Granted' },
  CONSENT_DENIED: { icon: XCircle, bgClass: 'bg-destructive/10', label: 'Consent Denied' },
  BUNDLE_GENERATED: { icon: Package, bgClass: 'audit-bundle', label: 'Bundle Generated' },
  CART_CREATED: { icon: ShoppingCart, bgClass: 'audit-cart', label: 'Cart Created' },
  CART_LINES_ADDED: { icon: ShoppingCart, bgClass: 'audit-cart', label: 'Cart Updated' },
  CHECKOUT_LINK_READY: { icon: ExternalLink, bgClass: 'audit-checkout', label: 'Checkout Ready' },
  EXPLANATION_GENERATED: { icon: MessageSquare, bgClass: 'audit-bundle', label: 'Explanation' },
};

export function AuditEventRow({ event, compact = false, onExpand }: AuditEventRowProps) {
  const config = ACTION_CONFIG[event.action] || { 
    icon: Shield, 
    bgClass: 'bg-muted', 
    label: event.action 
  };
  const Icon = config.icon;

  const permissionLabels = Object.entries(event.permissionUsed)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (key === 'maxSpend') return `$${value} max`;
      if (key === 'allowedCategories') return `${(value as string[]).length} categories`;
      if (key === 'agentEnabled') return value ? 'Agent on' : 'Agent off';
      return `${key}: ${value}`;
    });

  return (
    <div
      className={cn(
        'rounded-lg p-3 transition-colors',
        config.bgClass,
        onExpand && 'cursor-pointer hover:ring-2 hover:ring-primary/20'
      )}
      onClick={onExpand}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{config.label}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(event.ts), { addSuffix: true })}
            </span>
          </div>
          {!compact && (
            <>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {event.reason}
              </p>
              {permissionLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {permissionLabels.map((label, i) => (
                    <span 
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 bg-card rounded font-mono"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
