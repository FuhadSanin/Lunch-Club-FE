import { motion } from 'motion/react';
import type { Restaurant } from '@/model';
import { RestaurantCard } from './RestaurantCard';
import { VegSwitch } from './VegSwitch';

// Today's restaurants as cards. Opening one shows its menu.
export function RestaurantList({ restaurants, where, vegOnly, onVegOnly, inPickAt, onOpen }: {
  restaurants: Restaurant[];
  where: string; // the delivery place's short name, if known
  vegOnly: boolean;
  onVegOnly: (v: boolean) => void;
  inPickAt: (restaurantId: string) => number; // how many dishes of this restaurant are in the cart
  onOpen: (restaurantId: string) => void;
}) {
  return (
    <motion.section
      aria-labelledby="today-title"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="today-title" className="text-sm font-semibold">
          {where ? <>Restaurants near {where}</> : "Today's restaurants"} <span className="font-normal text-muted-foreground num">{restaurants.length}</span>
        </h2>
        <VegSwitch id="veg-all" checked={vegOnly} onChange={onVegOnly} />
      </div>
      {restaurants.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} inPick={inPickAt(r.id)} onOpen={() => onOpen(r.id)} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">
          No restaurants on today's list yet. Search above for any restaurant or dish on Swiggy.
        </p>
      )}
    </motion.section>
  );
}
