import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';

// One colour code for a person's answer, used on every screen:
// green = picked, amber = still to pick, grey = skipping today.
export type PickStatus = 'picked' | 'waiting' | 'skipped';

export const STATUS: Record<PickStatus, { label: string; dot: string; text: string; badge: 'success' | 'warning' | 'secondary' }> = {
  picked: { label: 'Picked', dot: 'bg-ok', text: 'text-ok', badge: 'success' },
  waiting: { label: 'To pick', dot: 'bg-warn', text: 'text-warn', badge: 'warning' },
  skipped: { label: 'Skipping', dot: 'bg-muted-foreground/60', text: 'text-muted-foreground', badge: 'secondary' },
};

export function StatusDot({ status, className }: { status: PickStatus; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', STATUS[status].dot, className)} />;
}

export function StatusBadge({ status, children }: { status: PickStatus; children?: ReactNode }) {
  return (
    <Badge variant={STATUS[status].badge} className="gap-1.5">
      <StatusDot status={status} className="size-1.5" />
      {children ?? STATUS[status].label}
    </Badge>
  );
}

// An avatar with a small status dot on its corner, like a presence indicator.
export function WithStatus({ status, children }: { status: PickStatus; children: ReactNode }) {
  return (
    <span className="relative inline-flex shrink-0">
      {children}
      <span
        aria-hidden="true"
        className={cn('absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card', STATUS[status].dot)}
      />
    </span>
  );
}

// The team split into picked, to pick and skipping, as one bar.
export function StatusBar({ counts, className }: { counts: Record<PickStatus, number>; className?: string }) {
  const total = counts.picked + counts.waiting + counts.skipped || 1;
  return (
    <div aria-hidden="true" className={cn('flex h-1.5 gap-0.5 overflow-hidden rounded-full', className)}>
      {(['picked', 'waiting', 'skipped'] as PickStatus[]).map((s) =>
        counts[s] ? (
          <span
            key={s}
            className={cn('h-full rounded-full transition-[flex-grow] duration-500 ease-out', STATUS[s].dot)}
            style={{ flexGrow: counts[s] / total }}
          />
        ) : null,
      )}
    </div>
  );
}
