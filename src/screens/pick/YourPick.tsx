import { AnimatePresence, motion } from 'motion/react';
import type { RefObject } from 'react';
import type { PickLine } from '@/model';
import { dishById } from '@/data/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { FoodPhoto, rupees } from '@/ui';
import { cn, spring } from '@/lib/cn';

// The cart: what you have picked, what you owe, a note, and Complete my order or Skip today.
export function YourPick({ items, count, total, note, onNote, open, done, soldOut, sending, onComplete, onSkip, badgeRef }: {
  items: PickLine[];
  count: number; // dishes in the cart
  total: number; // rupees
  note: string;
  onNote: (text: string) => void;
  open: boolean; // picks are open
  done: boolean; // completed or skipped: final
  soldOut: PickLine[]; // in the cart but out of stock now
  sending: boolean;
  onComplete: () => void;
  onSkip: () => void;
  badgeRef: RefObject<HTMLSpanElement | null>; // where a dish's photo flies to
}) {
  return (
    <Card id="your-pick" aria-labelledby="pick-title">
      <CardHeader>
        <CardTitle id="pick-title">Your pick</CardTitle>
        <CardAction>
          <motion.span ref={badgeRef} key={count} className="inline-flex" animate={count ? { scale: [1, 1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 1.05, times: [0, 0.6, 0.78, 1], ease: 'easeOut' }}>
            <Badge variant={count ? 'info' : 'secondary'}>{count} {count === 1 ? 'dish' : 'dishes'}</Badge>
          </motion.span>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        {items.length ? (
          <div>
            {/* Three dishes show at once; more scroll here, so the note and Complete my order stay in view. */}
            <ul className={cn('grid', items.length > 3 && 'max-h-[13.5rem] overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]')} tabIndex={items.length > 3 ? 0 : undefined} aria-label="Dishes in your pick">
            <AnimatePresence initial={false}>
              {items.map((l) => {
                const f = dishById(l.dishId)!;
                return (
                  <motion.li
                    key={l.dishId}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={spring}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 py-2.5 text-sm">
                      <FoodPhoto size={32} src={f.dish.photo} className="rounded-md" />
                      <span className="min-w-0 flex-1">
                        {l.qty > 1 ? <span className="num">{l.qty} × </span> : ''}{f.dish.name}
                        <span className="block text-xs text-muted-foreground">{f.restaurant.name}</span>
                        {f.dish.inStock === false && <span className="block text-xs font-medium text-destructive">Out of stock</span>}
                      </span>
                      <span className="num">{rupees(f.dish.price * l.qty)}</span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            </ul>
            {items.length > 3 && <p className="mt-1.5 text-xs text-muted-foreground">Scroll to see all {items.length}.</p>}
            <Separator className="my-1.5" />
            <p className="flex justify-between pt-1.5 text-sm font-semibold">
              <span>You owe the host</span><span className="num">{rupees(total)}</span>
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-input p-4 text-center text-sm text-muted-foreground">Add dishes from any restaurant.</p>
        )}

        <Field>
          <FieldLabel htmlFor="note">Note for the restaurant</FieldLabel>
          <Textarea id="note" name="note" autoComplete="off" value={note} disabled={!open || done} onChange={(e) => onNote(e.target.value)} placeholder="Less spicy, no onion…" />
        </Field>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button disabled={!open || done || !items.length || soldOut.length > 0 || sending} onClick={onComplete} className="flex-1">
              {sending ? 'Sending…' : 'Complete my order'}
            </Button>
            <Button variant="outline" disabled={!open || done || sending} onClick={onSkip}>Skip today</Button>
          </div>
          <FieldDescription role="status">
            {open && !done && (soldOut.length
              ? `${soldOut.length === 1 ? 'A dish in your cart is' : `${soldOut.length} dishes in your cart are`} out of stock. Remove ${soldOut.length === 1 ? 'it' : 'them'} to complete your order.`
              : items.length
              ? "Your cart is saved on this device. Complete your order to put it on the board."
              : "Add dishes, then complete your order. Your cart is saved on this device until then.")}
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  );
}
