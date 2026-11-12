import { useState } from 'react';
import { toast } from 'sonner';
import { useLeaveLunch } from '@/api/queries';
import type { ApiLunch } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CloseLunchDialog, useRunningLunches } from '@/screens/ExistingLunches';
import { useStore } from '@/store';

const nameOf = (l: ApiLunch) => l.name || `${l.host.name.split(' ')[0]}'s party`;
const STATUS: Record<string, string> = { open: 'Picking', locked: 'Locked', confirmed: 'Ordering', placed: 'On its way', delivered: 'Arrived' };
const ORDERED = new Set(['confirmed', 'placed', 'delivered']);

// The running party a personal-party person is in: the one they host first, then one they joined.
// While there is one they can't start another; the host finishes it (Enjoy your meal) or calls it off,
// a guest leaves it.
export function useActiveParty() {
  const { live } = useStore();
  const { running } = useRunningLunches();
  if (!live?.personal) return null;
  return running.find((l) => !l.joined) ?? running.find((l) => l.id === live.lunchId) ?? running[0] ?? null;
}

// Exit a party: the host closes it (the usual close dialog), a guest leaves it after a confirm.
export function ExitParty({ lunch, size = 'sm', className }: { lunch: ApiLunch; size?: 'sm' | 'default'; className?: string }) {
  const [closing, setClosing] = useState<ApiLunch | null>(null);
  const [leaving, setLeaving] = useState(false);
  const leave = useLeaveLunch();
  const confirmLeave = () =>
    leave.mutate(lunch.id, {
      onSuccess: () => {
        setLeaving(false);
        toast.success(`You left “${nameOf(lunch)}”`, { description: 'You can start your own party now.' });
        window.location.hash = '#/new';
      },
      onError: (e) => toast.error("Couldn't leave the party", { description: e.message }),
    });

  return (
    <>
      <Button type="button" variant="outline" size={size} className={className} onClick={() => (lunch.joined ? setLeaving(true) : setClosing(lunch))}>
        {lunch.joined ? 'Exit party' : ORDERED.has(lunch.status) ? 'Finish party' : 'Close party'}
      </Button>
      <CloseLunchDialog lunch={closing} onOpenChange={(open) => !open && setClosing(null)} />
      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Exit “{nameOf(lunch)}”?</DialogTitle>
            <DialogDescription>
              Your picks in this party are dropped. While picks are still open you can join again with its link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaving(false)}>Stay</Button>
            <Button variant="destructive" onClick={confirmLeave} disabled={leave.isPending}>{leave.isPending ? 'Leaving…' : 'Exit party'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// The sidebar's card for a personal party you're in: what it is, where it stands, and the way out.
export function ActivePartyCard({ lunch, onNavigate }: { lunch: ApiLunch; onNavigate?: () => void }) {
  return (
    <div className="grid gap-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mute uppercase">
          <span className="size-1.5 rounded-full bg-[#12a150]" aria-hidden="true" />
          Active party
        </div>
        <div className="mt-1 truncate text-sm font-semibold">{nameOf(lunch)}</div>
        <div className="truncate text-xs text-mute">
          {lunch.joined ? `Hosted by ${lunch.host.name.split(' ')[0]}` : 'You are hosting'} · {STATUS[lunch.status] ?? lunch.status}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="secondary"><a href={`#/lunch/${lunch.id}`} onClick={onNavigate}>Open</a></Button>
        <ExitParty lunch={lunch} />
      </div>
    </div>
  );
}
