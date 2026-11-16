import { motion } from 'motion/react';
import type { Category, Dish, Restaurant } from '@/model';
import type { Load } from '@/data/swiggy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FoodPhoto, Icon, Rating } from '@/ui';
import { DishRow } from './DishRow';
import { MenuStatus } from './MenuStatus';
import { VegSwitch } from './VegSwitch';

// One restaurant's menu: who it is, a search within it, its sections, and every dish with Add.
// `categories` is the menu after the Veg only switch and the search have been applied.
export function RestaurantMenu({ restaurant, onTodaysList, categories, load, vegOnly, onVegOnly, query, onQuery, open, qty, onSet, onAdd, onBack, onJump }: {
  restaurant: Restaurant;
  onTodaysList: boolean; // one of the restaurants the host offered
  categories: Category[];
  load: Load; // the live menu: loading, ready or failed
  vegOnly: boolean;
  onVegOnly: (v: boolean) => void;
  query: string;
  onQuery: (text: string) => void;
  open: boolean; // picks are open
  qty: (dishId: string) => number;
  onSet: (dish: Dish, n: number) => void;
  onAdd: (dish: Dish, n: number, from: Element) => void;
  onBack: () => void;
  onJump: (section: number) => void;
}) {
  return (
    <motion.section
      key={restaurant.id}
      aria-labelledby="menu-title"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <Button variant="ghost" size="sm" className="mt-5 -ml-2.5 text-muted-foreground" onClick={() => onBack()}>
        <Icon name="arrow" size={14} className="rotate-180" /> All restaurants
      </Button>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <FoodPhoto size={64} src={restaurant.photo} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 id="menu-title" className="text-2xl font-semibold tracking-[-0.035em]">{restaurant.name}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{restaurant.cuisines?.join(', ') || 'Dishes the team has ordered here before'}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground num">
            <Rating value={restaurant.rating} />
            {[restaurant.eta, restaurant.distanceKm !== undefined && `${restaurant.distanceKm} km away`].filter(Boolean).map((t) => (
              <span key={String(t)} className="before:mr-2 before:content-['·']">{t}</span>
            ))}
          </p>
          {!onTodaysList && (
            <Badge variant="secondary" className="mt-2">Not on today's list: it joins the same cart</Badge>
          )}
        </div>
        <VegSwitch id="veg-menu" checked={vegOnly} onChange={onVegOnly} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Find a dish in this menu</span>
          <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={`Find in ${restaurant.name}`} className="h-9 rounded-full pl-8" />
        </label>
      </div>
      {categories.length > 1 && (
        <nav aria-label="Menu sections" className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
          {categories.map((c, n) => (
            <Button key={c.name} size="sm" variant="outline" className="h-8 flex-none rounded-full text-[13px] font-normal" onClick={() => onJump(n)}>
              {c.name} <span className="text-muted-foreground num">{c.dishes.length}</span>
            </Button>
          ))}
        </nav>
      )}

      <MenuStatus load={load} empty={!restaurant.categories.length} />

      {categories.map((c, n) => (
        <div key={c.name} id={`menu-cat-${n}`} className="scroll-mt-24">
          <h3 className="mt-9 mb-2 flex items-center gap-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                <span>{c.name}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <span className="font-medium tracking-normal normal-case num">{c.dishes.length}</span>
              </h3>
          <ul>
            {c.dishes.map((d) => (
              <DishRow key={d.id} dish={d} n={qty(d.id)} open={open} onSet={(n) => onSet(d, n)} onAdd={(n, el) => onAdd(d, n, el)} />
            ))}
          </ul>
        </div>
      ))}
      {restaurant.categories.length > 0 && !categories.length && (
        <p className="mt-6 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">
          Nothing here matches{query.trim() ? ` “${query.trim()}”` : ''}{vegOnly ? ' with Veg only on' : ''}.
        </p>
      )}
    </motion.section>
  );
}
