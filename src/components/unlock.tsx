import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '@/store';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Reopening locked picks, before the order goes out: after asking, everyone can change their pick
// again, and the lunch goes back to Review & lock.
export function UnlockPicks({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const { state, dispatch } = useStore();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (state.session.status !== 'locked' || state.role !== 'host') return null;

  const unlock = () => {
    setBusy(true);
    Promise.resolve(dispatch({ type: 'reopen' }))
      .then(() => {
        setAsking(false);
        toast.success('Picks are open again', { description: 'Everyone can change their pick. Lock again when they are done.' });
        window.location.hash = '/review';
      }, () => undefined) // the reason is already on screen as a toast
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Button variant={variant} onClick={() => setAsking(true)}>
        <Icon name="lock" size={14} /> Unlock picks
      </Button>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock the picks?</DialogTitle>
            <DialogDescription>
              Nothing has been ordered yet. Everyone can change or add their pick again, and the cart is rebuilt when you lock it
              again. If the cutoff has passed, it moves 30 minutes ahead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsking(false)}>Keep them locked</Button>
            <Button disabled={busy} onClick={unlock}>{busy ? 'Unlocking…' : 'Unlock picks'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
