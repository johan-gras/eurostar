import { Banknote, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompensationBadgeProps {
  cashAmount: number;
  voucherAmount: number;
  currency?: 'EUR' | 'GBP';
  className?: string;
}

export function CompensationBadge({
  cashAmount,
  voucherAmount,
  currency = 'EUR',
  className,
}: CompensationBadgeProps) {
  const symbol = currency === 'GBP' ? '£' : '€';

  return (
    <div className={cn('flex gap-3', className)}>
      {cashAmount > 0 && (
        <div className="flex items-center gap-1.5 text-sm">
          <Banknote className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-700">
            {symbol}{cashAmount.toFixed(2)}
          </span>
        </div>
      )}
      {voucherAmount > 0 && (
        <div className="flex items-center gap-1.5 text-sm">
          <Gift className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-700">
            {symbol}{voucherAmount.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
