import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PermissionChipProps {
  label: string;
  active?: boolean;
  className?: string;
}

export function PermissionChip({ label, active = true, className }: PermissionChipProps) {
  return (
    <span
      className={cn(
        'permission-chip',
        active ? 'permission-chip-active' : 'permission-chip-inactive',
        className
      )}
    >
      {active ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}
