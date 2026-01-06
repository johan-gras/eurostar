import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center',
        className
      )}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg">
        <svg
          className="absolute left-1/2 top-0 -translate-x-1/2 opacity-[0.03]"
          width="800"
          height="400"
          viewBox="0 0 800 400"
          fill="none"
        >
          <circle cx="400" cy="200" r="300" fill="currentColor" />
          <circle cx="400" cy="200" r="200" fill="currentColor" />
          <circle cx="400" cy="200" r="100" fill="currentColor" />
        </svg>
      </div>

      {/* Icon container */}
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Text content */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>

      {/* Action button */}
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
