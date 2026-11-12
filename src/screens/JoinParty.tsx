import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCelebrate } from '@/components/celebrate';
import type { Live } from '@/store';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// Someone shared a party's link and this person isn't in it yet: a pop-up asks first. Joining plays
// a colourful burst with a cheer, then opens Pick my lunch.
export function JoinParty({ invite }: { invite: NonNullable<Live['invite']> }) {
  const celebrate = useCelebrate();
  const button = useRef<HTMLButtonElement>(null);

  const join = async () => {
    const r = button.current?.getBoundingClientRect();
    const board = await invite.join();
    if (!board) return; // the error shows in the pop-up
    window.location.hash = '#/pick';
    celebrate({
      x: r ? r.left + r.width / 2 : innerWidth / 2,
      y: r ? r.top + r.height / 2 : innerHeight / 2,
      title: "You're in!",
      sub: `${board.name ? `Welcome to “${board.name}”. ` : ''}Pick your food before ${hhmm(board.cutoff_at)}.`,
      tone: 'violet',
      icon: 'cutlery',
      sound: 'cheer',
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && (window.location.hash = '#/')}>
      <DialogContent className="sm:max-w-[420px]">
        <div className="grid justify-items-center gap-4 pt-2 text-center">
          <img src="/illustrations/tiffin.png" alt="" width={96} height={120} className="h-auto w-20 select-none dark:invert" />
          <div className="grid gap-1.5">
            <DialogTitle className="text-xl tracking-[-0.03em]">You're invited to a lunch party</DialogTitle>
            <DialogDescription>
              Join to pick your own food before picks close. Everything goes into one order, and you'll see what you owe.
            </DialogDescription>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => (window.location.hash = '#/')}>Not now</Button>
            <Button ref={button} size="lg" autoFocus onClick={() => void join()} disabled={invite.joining}>{invite.joining ? 'Joining…' : 'Join the party'}</Button>
          </div>
          {invite.error && <p role="alert" className="text-[13px] text-destructive">Couldn't join this party. {invite.error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
