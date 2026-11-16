import { AnimatePresence, motion } from 'motion/react';
import type { Dish } from '@/model';
import { Button } from '@/components/ui/button';
import { FoodPhoto, rupees, VegMark } from '@/ui';
import { cn, spring } from '@/lib/cn';

// One dish in a menu: its photo, name and price, and Add, or the quantity once it's in the cart.
// `n` is how many are in the cart; `onAdd` also gets the button, for the photo that flies to the cart.
export function DishRow({ dish: d, n, open, onSet, onAdd }: {
  dish: Dish;
  n: number;
  open: boolean; // picks are open
  onSet: (n: number) => void;
  onAdd: (n: number, from: Element) => void;
}) {
  const out = d.inStock === false;
  return (
    <li className={cn('-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 rounded-xl px-2 py-3 transition-colors duration-200', n > 0 ? 'bg-muted/60' : !out && 'hover:bg-muted/60')}>
      <FoodPhoto size={48} src={d.photo} className={cn('rounded-xl', out && 'opacity-50 grayscale')} />
      <div className={cn('min-w-0', out && n === 0 && 'opacity-60')}>
        <div className="flex items-center gap-2 text-[15px] font-semibold leading-snug tracking-[-0.015em]"><VegMark veg={d.veg} /> <span>{d.name}</span></div>
        {d.desc && <div className="mt-1 line-clamp-2 max-w-[56ch] text-[13px] leading-5 tracking-[0.005em] text-muted-foreground">{d.desc}</div>}
        <div className="mt-1.5 text-[15px] font-medium tracking-[-0.01em] num">{rupees(d.price)}</div>
        {out && n > 0 && <div className="mt-1 text-[13px] text-destructive">Out of stock now. Remove it and pick something else.</div>}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {n > 0 ? (
          <motion.div
            key="stepper"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex items-center rounded-full bg-background shadow-ring"
            aria-label={`${d.name} quantity`}
            role="group"
          >
            <Button variant="ghost" size="icon" className="text-lg" aria-label={`One less ${d.name}`} disabled={!open} onClick={() => onSet(n - 1)}>−</Button>
            <span className="relative w-5 overflow-hidden text-center text-sm font-semibold num" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={n} className="block" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={spring}>
                  {n}
                </motion.span>
              </AnimatePresence>
            </span>
            <Button variant="ghost" size="icon" className="text-lg" aria-label={`One more ${d.name}`} disabled={!open || out} onClick={(e) => onAdd(n + 1, e.currentTarget)}>+</Button>
          </motion.div>
        ) : (
          <motion.div key="add" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
            {out ? (
              <Button size="sm" variant="outline" disabled aria-label={`${d.name} is out of stock`}>Out of stock</Button>
            ) : (
              <Button size="sm" variant="outline" disabled={!open} onClick={(e) => onAdd(1, e.currentTarget)} aria-label={`Add ${d.name}`}>Add</Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
