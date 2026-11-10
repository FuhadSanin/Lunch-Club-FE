import { motion } from 'motion/react';
import type { Restaurant } from '@/data/menus';
import { Badge } from '@/components/ui/badge';
import { FoodPhoto, Rating } from '@/ui';
import { spring } from '@/lib/cn';

// One of today's restaurants, as a card with its photo. Opens its menu.
export function RestaurantCard({ restaurant: r, inPick, onOpen }: { restaurant: Restaurant; inPick: number; onOpen: () => void }) {
  const facts = [r.eta, r.distanceKm !== undefined && `${r.distanceKm} km`].filter(Boolean);
  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-card outline-none transition-shadow duration-200 hover:shadow-float focus-visible:ring-4 focus-visible:ring-ring/25"
      aria-label={`${r.name}: open the menu`}
    >
      <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
        <FoodPhoto cover src={r.photo} className="size-full rounded-none ring-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
        <span className="absolute inset-x-2 top-2 flex justify-between gap-2">
          {inPick > 0 ? <Badge variant="info" className="shadow-card">{inPick} in your pick</Badge> : <span />}
          {r.open === false && <Badge variant="secondary" className="shadow-card">Closed now</Badge>}
        </span>
      </span>
      <span className="grid gap-0.5 p-3.5">
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{r.name}</span>
        <span className="truncate text-[13px] text-muted-foreground">{r.cuisines?.join(', ') || 'Dishes the team has ordered here before'}</span>
        {r.rating ? <Rating value={r.rating} size={13} className="mt-1.5 text-[13px]" /> : null}
        {facts.length > 0 && <span className="truncate text-xs text-muted-foreground num">{facts.join(' · ')}</span>}
      </span>
    </motion.button>
  );
}
