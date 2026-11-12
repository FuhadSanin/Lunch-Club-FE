import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { useCancel, useLunches } from '@/api/queries';
import type { ApiLunch, ApiLunchStatus } from '@/api/types';
import { useStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLunchSteps } from '@/components/steps';
import { STEPS } from '@/lib/steps';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, spring } from '@/lib/cn';

// The same colour code as the board: green while people can pick, amber while the host has work to
// do, blue once ordered, grey when it's over.
const STATUS: Record<ApiLunchStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary'; dot: string }> = {
  open: { label: 'Picking', variant: 'success', dot: 'bg-ok' },
  locked: { label: 'Locked', variant: 'warning', dot: 'bg-warn' },
  confirmed: { label: 'Ordering', variant: 'warning', dot: 'bg-warn' },
  placed: { label: 'On its way', variant: 'info', dot: 'bg-brand' },
  delivered: { label: 'Arrived', variant: 'secondary', dot: 'bg-muted-foreground/60' },
  cancelled: { label: 'Called off', variant: 'secondary', dot: 'bg-muted-foreground/40' },
};

// A lunch is running from the moment it starts until its food arrives or it is called off. It stays
// active (one at a time) until the host finishes its last step, Enjoy your meal, which closes it.
export const RUNNING = new Set<ApiLunchStatus>(['open', 'locked', 'confirmed', 'placed']);
export const isActive = (l: ApiLunch): boolean => RUNNING.has(l.status) || (l.status === 'delivered' && !l.closed_at);
const ORDERED = new Set<ApiLunchStatus>(['confirmed', 'placed', 'delivered']);

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function lunchDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  const tomorrow = new Date(Date.now() + 864e5);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// "today's lunch", "Monday's lunch"…
export const lunchName = (l: ApiLunch) => {
  const day = lunchDay(l.cutoff_at);
  return /^(Today|Yesterday|Tomorrow)$/.test(day) ? `${day.toLowerCase()}'s lunch` : `the ${day} lunch`;
};

// Lunches on the API that haven't been closed yet. Empty in the demo, which replaces its one lunch.
export function useRunningLunches() {
  const { live } = useStore();
  const lunches = useLunches(!!live);
  return { running: (lunches.data ?? []).filter(isActive), pending: !!live && lunches.isPending };
}

// Lunches already started, newest first: the running one on top with a way to close it, and the last
// few that are over below.
export function ExistingLunches({ show, onClose }: { show: 'running' | 'past'; onClose: (lunch: ApiLunch) => void }) {
  const { live, state } = useStore();
  const steps = useLunchSteps();
  const step = STEPS.find((s) => s.id === steps.current)!;
  const stepNo = STEPS.indexOf(step) + 1;
  const lunches = useLunches(!!live);
  const [showAll, setShowAll] = useState(false);

  // The demo has one lunch: today's.
  const all: ApiLunch[] = live
    ? (lunches.data ?? [])
    : [{
        id: state.session.id,
        host: { id: state.session.hostId, name: 'You' },
        cutoff_at: new Date(`${new Date().toDateString()} ${state.session.cutoff}`).toISOString(),
        status: state.session.completed ? 'delivered' : state.session.status === 'placing' ? 'confirmed' : state.session.status,
        created_at: new Date().toISOString(),
      }];
  const running = all.filter(isActive);
  const past = all.filter((l) => !isActive(l));
  const shownPast = showAll ? past : past.slice(0, 3);

  if (live && lunches.isPending) {
    return (
      <Card className="mb-4" aria-busy="true" aria-label="Loading lunches">
        <CardContent className="grid gap-2.5">
          {[0, 1].map((i) => <span key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
        </CardContent>
      </Card>
    );
  }
  if (!all.length) return null;

  const row = (l: ApiLunch) => {
    const s = STATUS[l.status];
    const current = live ? l.id === live.lunchId : true;
    const canClose = (live ? live.canHost : state.role === 'host') && isActive(l);
    return (
      <motion.li
        key={l.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={spring}
        className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-3 shadow-ring', current && isActive(l) && 'bg-muted/60')}
      >
        <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', s.dot, l.status === 'open' && 'animate-pulse')} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {lunchDay(l.cutoff_at)} · picks close {hhmm(new Date(l.cutoff_at))}
            {current && live && isActive(l) && <span className="font-normal text-muted-foreground"> · today's board</span>}
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">
            Started by {l.host.name}
            {current && isActive(l) && <> · now on step {stepNo}, {step.label.toLowerCase()}</>}
          </span>
        </span>
        <Badge variant={s.variant}>{s.label}</Badge>
        <span className="flex gap-1.5">
          {current && isActive(l) && (
            <Button asChild size="sm"><a href={`#${step.route}`}>Go to {step.label.toLowerCase()}</a></Button>
          )}
          {canClose && <Button size="sm" variant="outline" onClick={() => onClose(l)}>Close</Button>}
        </span>
      </motion.li>
    );
  };

  const list = show === 'running' ? running : shownPast;
  if (show === 'past' && !past.length)
    return <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">No earlier lunches yet. Finished and called-off lunches show up here.</p>;
  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        <AnimatePresence initial={false}>{list.map(row)}</AnimatePresence>
      </ul>
      {show === 'running' && running.length > 1 && (
        <p className="text-[13px] text-muted-foreground">Only one lunch runs at a time. Close the older ones.</p>
      )}
      {show === 'past' && past.length > 3 && (
        <Button size="sm" variant="link" className="h-auto w-fit px-0" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all ${past.length}`}
        </Button>
      )}
    </div>
  );
}

// Closing a lunch so the next one can start. Not ordered yet: it is called off and the picks are
// dropped. Ordered: it ends at the last step, Enjoy your meal, after the food is collected and handed
// out; this points the host there.
export function CloseLunchDialog({ lunch, onOpenChange }: { lunch: ApiLunch | null; onOpenChange: (open: boolean) => void }) {
  const { live } = useStore();
  const steps = useLunchSteps();
  const ordered = !!lunch && ORDERED.has(lunch.status);
  const cancel = useCancel();
  const name = lunch ? lunchName(lunch) : 'this lunch';
  const here = lunch?.id === live?.lunchId;
  const stepRoute = STEPS.find((s) => s.id === steps.current)?.route ?? '/';
  const done = () => {
    toast.success('Lunch called off', { description: 'You can start the next one now.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!lunch} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ordered ? `Finish ${name}` : `Close ${name}?`}</DialogTitle>
          <DialogDescription>
            {!ordered
              ? "Nothing has been ordered yet, so closing calls it off: everyone's picks are dropped and nothing is ordered. This can't be undone."
              : 'It was ordered on Swiggy, so it ends at the last step: collect the food, hand it out, then complete the lunch in Enjoy your meal. A new party can start after that.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep it running</Button>
          {!ordered ? (
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() =>
                lunch &&
                cancel.mutate(lunch.id, {
                  onSuccess: done,
                  onError: (e) => toast.error("Couldn't close the lunch", { description: e.message }),
                })
              }
            >
              {cancel.isPending ? 'Closing…' : 'Call off and close'}
            </Button>
          ) : (
            <Button asChild onClick={() => onOpenChange(false)}>
              <a href={here ? `#${stepRoute}` : `#/lunch/${lunch?.id}`}>Go to the steps</a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
