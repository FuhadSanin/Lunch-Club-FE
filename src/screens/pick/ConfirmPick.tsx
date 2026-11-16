import type { PickLine } from '@/model';
import { dishById } from '@/data/catalog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FoodPhoto, rupees } from '@/ui';

// "Are you sure?" before completing the order or skipping the day: both are final.
export function ConfirmPick({ confirm, onClose, items, total, note, cutoff, onComplete, onSkip }: {
  confirm: 'complete' | 'skip' | null; // which question is open
  onClose: () => void;
  items: PickLine[];
  total: number; // rupees
  note: string;
  cutoff: string; // HH:MM
  onComplete: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSkip: () => void;
}) {
  return (
    <Dialog open={!!confirm} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {confirm === 'skip' ? (
          <>
            <DialogHeader>
              <DialogTitle>Skip today's lunch?</DialogTitle>
              <DialogDescription>
                {items.length ? 'Your cart is cleared, and you' : 'You'} won't be able to pick today unless the host reopens it for you.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Keep picking</Button>
              <Button variant="destructive" onClick={onSkip}>Skip today</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete your order?</DialogTitle>
              <DialogDescription>
                It goes on the board for the {cutoff} cutoff. After this you can't change it; if you need to, ask the host to reopen it.
              </DialogDescription>
            </DialogHeader>
            <ul className="grid gap-2 rounded-xl bg-muted/60 p-3">
              {items.map((l) => {
                const f = dishById(l.dishId);
                return f ? (
                  <li key={l.dishId} className="flex items-center gap-3 text-sm">
                    <FoodPhoto size={28} src={f.dish.photo} className="rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{l.qty > 1 && <span className="num">{l.qty} × </span>}{f.dish.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{f.restaurant.name}</span>
                    </span>
                    <span className="num">{rupees(f.dish.price * l.qty)}</span>
                  </li>
                ) : null;
              })}
              <li className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>You owe the host</span><span className="num">{rupees(total)}</span>
              </li>
            </ul>
            {note.trim() && <p className="text-[13px] text-muted-foreground"><span className="font-medium text-foreground">Note:</span> {note.trim()}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Keep editing</Button>
              <Button onClick={onComplete}>Complete my order</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
