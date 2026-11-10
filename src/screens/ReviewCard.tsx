import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDownIcon } from 'lucide-react';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn, spring } from '@/lib/cn';

// One restaurant or one person in a step's list. Folds to a single line; a done card turns green,
// folds up and (in lists that sort by it) moves to the bottom. `action` sits in its header.
export function ReviewCard({
  media,
  title,
  meta,
  total,
  done = false,
  doneLabel,
  action,
  defaultOpen,
  children,
}: {
  media: ReactNode;
  title: ReactNode;
  meta: ReactNode;
  total: ReactNode;
  done?: boolean;
  doneLabel?: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? !done);
  useEffect(() => setOpen(defaultOpen ?? !done), [done, defaultOpen]);

  return (
    <motion.div layout="position" transition={spring}>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className={cn(
          'rounded-xl bg-card transition-[background-color,box-shadow] duration-300',
          done ? 'bg-ok-soft/60 shadow-[0_0_0_1px_color-mix(in_oklab,var(--ok)_35%,transparent)]' : 'shadow-card',
        )}
      >
        <div className="flex items-center gap-3 p-3 pr-2 sm:p-4 sm:pr-3">
          <span className="relative shrink-0">
            {media}
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
              transition={spring}
              className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-ok text-on-ink ring-2 ring-card"
            >
              <Icon name="check" size={9} />
            </motion.span>
          </span>
          <CollapsibleTrigger className="min-w-0 flex-1 cursor-pointer text-left outline-none focus-visible:underline">
            <span className={cn('block truncate text-sm font-semibold', done && 'text-ok')}>{title}</span>
            <span className="block truncate text-[13px] text-muted-foreground">{meta}</span>
          </CollapsibleTrigger>
          <span className="text-sm font-semibold num">{total}</span>
          {done && doneLabel && <Badge variant="success" className="max-sm:hidden">{doneLabel}</Badge>}
          {action}
          <CollapsibleTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="text-muted-foreground" aria-label={open ? 'Fold' : 'Show the dishes'}>
              <ChevronDownIcon className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="border-t border-dashed px-3 pt-2 pb-3 sm:px-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// A dish line inside a card.
export function ReviewLine({ name, mark, sub, qty, amount }: { name: ReactNode; mark: ReactNode; sub: ReactNode; qty: number; amount: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_5rem] items-start gap-x-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">{mark}<span className="truncate">{name}</span></div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">{sub}</div>
      </div>
      <span className="text-muted-foreground num">{qty} ×</span>
      <span className="text-right num">{amount}</span>
    </div>
  );
}

// "2 of 4 collected" with a green bar that fills as items are done.
export function ReviewProgress({ done, of, label }: { done: number; of: number; label: string }) {
  const all = of > 0 && done === of;
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className={cn('font-medium', all ? 'text-ok' : 'text-foreground')}>{all ? `All ${of} ${label}` : `${done} of ${of} ${label}`}</span>
        <span className="text-muted-foreground num">{of ? Math.round((done / of) * 100) : 0}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <motion.div className="h-full origin-left rounded-full bg-ok" initial={false} animate={{ scaleX: of ? done / of : 0 }} transition={spring} />
      </div>
    </div>
  );
}
