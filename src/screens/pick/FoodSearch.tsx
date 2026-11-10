import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Command as CommandPrimitive } from 'cmdk';
import { allDishes, type Restaurant } from '@/data/menus';
import { useDishSearch, useRestaurants, type FoundDish } from '@/data/swiggy';
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FoodPhoto, Icon, Rating, rupees, VegMark } from '@/ui';
import { cn } from '@/lib/cn';

type Place = { lat: number; lng: number };

const POPULAR = ['Biryani', 'Dosa', 'Meals', 'Burger', 'Shawarma', 'Pizza', 'Fried rice', 'Ice cream'];
const RECENT_KEY = 'lunchboard-recent-searches';
const loadRecent = (): string[] => {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const has = (text: string, q: string) => text.toLowerCase().includes(q.toLowerCase());

// The matched part of a name in bold, like Swiggy's suggestions.
function Highlight({ text, q }: { text: string; q: string }) {
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-foreground">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

const meta = (r: Restaurant) =>
  [r.cuisines?.slice(0, 2).join(', '), r.eta, r.distanceKm !== undefined && `${r.distanceKm} km`].filter(Boolean).join(' · ');

// Search today's restaurants, any restaurant on Swiggy near the office, and dishes, with suggestions as
// you type. Picking a restaurant opens its menu; picking a dish adds it to your pick.
export function FoodSearch({
  restaurants,
  place,
  vegOnly,
  disabled,
  qty,
  onOpenRestaurant,
  onAddDish,
}: {
  restaurants: Restaurant[];
  place: Place;
  vegOnly: boolean;
  disabled: boolean;
  qty: (dishId: string) => number;
  onOpenRestaurant: (r: Restaurant) => void;
  onAddDish: (found: FoundDish, el: Element | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(loadRecent);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const q = query.trim();

  const swiggy = useRestaurants(place, q, q.length < 2);
  const dishSearch = useDishSearch(place, q);

  // "/" jumps to the search, as on Swiggy and most search-first sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));
      if (e.key === '/' && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const remember = (term: string) => {
    const next = [term, ...recent.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const today = useMemo(
    // Name matches first, then cuisine matches.
    () =>
      q
        ? restaurants
            .filter((r) => has(r.name, q) || r.cuisines?.some((c) => has(c, q)))
            .sort((a, b) => Number(!has(a.name, q)) - Number(!has(b.name, q)))
            .slice(0, 4)
        : [],
    [restaurants, q],
  );
  const more = q.length >= 2 ? swiggy.restaurants.filter((r) => !restaurants.some((t) => t.id === r.id)).slice(0, 4) : [];

  // Dishes on today's loaded menus first (instant), then the rest of Swiggy.
  const dishes = useMemo(() => {
    if (q.length < 2) return [];
    const local: FoundDish[] = restaurants.flatMap((r) => allDishes(r).filter((d) => has(d.name, q)).map((dish) => ({ dish, restaurant: r })));
    const all = [...local, ...dishSearch.dishes.filter((f) => !local.some((l) => l.dish.id === f.dish.id))];
    return all.filter((f) => !vegOnly || f.dish.veg).slice(0, 8);
  }, [q, restaurants, dishSearch.dishes, vegOnly]);

  const searching = q.length >= 2 && (!dishSearch.settled || swiggy.status === 'loading');
  const nothing = q.length >= 2 && !searching && !today.length && !more.length && !dishes.length;

  const close = () => setOpen(false);
  const choose = (term: string) => {
    setQuery(term);
    input.current?.focus();
  };

  return (
    <Command
      ref={root}
      shouldFilter={false}
      loop
      label="Search restaurants and dishes"
      className="relative z-30 overflow-visible rounded-none! bg-transparent p-0"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          if (query) setQuery('');
          else input.current?.blur();
          close();
        }
      }}
    >
      <div
        className={cn(
          'flex h-12 items-center gap-3 rounded-full border border-input bg-background px-4 shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 dark:bg-input/30',
          disabled && 'opacity-60',
        )}
      >
        <Icon name="search" size={18} className="text-muted-foreground" />
        <CommandPrimitive.Input
          ref={input}
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder="Search for restaurants and dishes"
          aria-label="Search for restaurants and dishes"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <Button type="button" variant="ghost" size="icon-sm" className="-mr-2 text-muted-foreground" aria-label="Clear the search" onClick={() => choose('')}>
            <Icon name="close" size={14} />
          </Button>
        ) : (
          <kbd className="hidden rounded-md border px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground sm:inline">/</kbd>
        )}
      </div>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full mt-2 origin-top overflow-hidden rounded-2xl bg-popover shadow-float"
            onMouseDown={(e) => e.preventDefault()} // keep focus in the search while clicking suggestions
          >
            <CommandList className="max-h-[min(60vh,460px)] p-1.5">
              {!q && (
                <>
                  {recent.length > 0 && (
                    <CommandGroup heading="Recent searches">
                      {recent.map((t) => (
                        <CommandItem key={`r-${t}`} value={`recent ${t}`} onSelect={() => choose(t)} className="h-9 gap-3 rounded-lg">
                          <Icon name="clock" size={15} className="text-muted-foreground" />
                          {t}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandGroup heading="Popular near the office">
                    <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                      {POPULAR.map((t) => (
                        <CommandItem
                          key={`p-${t}`}
                          value={`popular ${t}`}
                          onSelect={() => choose(t)}
                          className="h-8 rounded-full border px-3 text-[13px] data-selected:border-foreground/30"
                        >
                          {t}
                        </CommandItem>
                      ))}
                    </div>
                  </CommandGroup>
                  {restaurants.length > 0 && (
                    <CommandGroup heading="Today's restaurants">
                      {restaurants.slice(0, 5).map((r) => (
                        <RestaurantItem key={r.id} r={r} q="" onSelect={() => { onOpenRestaurant(r); close(); }} />
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}

              {q.length === 1 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Keep typing: two letters or more.</p>}

              {today.length > 0 && (
                <CommandGroup heading="Today's restaurants">
                  {today.map((r) => (
                    <RestaurantItem key={r.id} r={r} q={q} onSelect={() => { remember(q); onOpenRestaurant(r); close(); }} />
                  ))}
                </CommandGroup>
              )}

              {dishes.length > 0 && (
                <>
                  {today.length > 0 && <CommandSeparator className="my-1" />}
                  <CommandGroup heading="Dishes">
                    {dishes.map((f) => (
                      <DishItem
                        key={f.dish.id}
                        found={f}
                        q={q}
                        count={qty(f.dish.id)}
                        onSelect={(el) => { remember(q); onAddDish(f, el); }}
                      />
                    ))}
                  </CommandGroup>
                </>
              )}

              {more.length > 0 && (
                <>
                  <CommandSeparator className="my-1" />
                  <CommandGroup heading="More on Swiggy near the office">
                    {more.map((r) => (
                      <RestaurantItem key={r.id} r={r} q={q} onSelect={() => { remember(q); onOpenRestaurant(r); close(); }} />
                    ))}
                  </CommandGroup>
                </>
              )}

              {searching && (
                <div role="status" className="flex items-center gap-2.5 px-3 py-3 text-[13px] text-muted-foreground">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-input border-t-foreground" aria-hidden="true" />
                  Searching Swiggy for “{q}”…
                </div>
              )}
              {dishSearch.status === 'error' && q.length >= 2 && (
                <div role="status" className="flex items-center justify-between gap-3 px-3 py-3 text-[13px] text-muted-foreground">
                  <span>Swiggy search didn't answer. {dishSearch.error}</span>
                  <Button size="sm" variant="outline" onClick={dishSearch.retry}>Try again</Button>
                </div>
              )}
              {nothing && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No restaurant or dish matches “{q}”{vegOnly ? ' with Veg only on' : ''}.
                </p>
              )}
            </CommandList>
          </motion.div>
        )}
      </AnimatePresence>
    </Command>
  );
}

function RestaurantItem({ r, q, onSelect }: { r: Restaurant; q: string; onSelect: () => void }) {
  return (
    <CommandItem value={`restaurant ${r.id}`} onSelect={onSelect} className="gap-3 rounded-lg py-2">
      <FoodPhoto size={40} src={r.photo} className="rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm"><Highlight text={r.name} q={q} /></span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {r.rating ? <Rating value={r.rating} size={12} className="text-xs" /> : 'Restaurant'}
          <span className="truncate">{meta(r) ? ` · ${meta(r)}` : ''}</span>
        </span>
      </span>
      {r.open === false && <Badge variant="secondary">Closed</Badge>}
      <Icon name="arrow" size={14} className="text-muted-foreground" />
    </CommandItem>
  );
}

function DishItem({ found, q, count, onSelect }: { found: FoundDish; q: string; count: number; onSelect: (el: Element | null) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const { dish, restaurant } = found;
  const out = dish.inStock === false;
  const add: ReactNode = count ? (
    <Badge variant="info" className="num">{count} in pick</Badge>
  ) : out ? (
    <Badge variant="secondary">Out of stock</Badge>
  ) : (
    <span className="rounded-full px-3 py-1 text-xs font-medium shadow-ring group-data-selected/command-item:bg-foreground group-data-selected/command-item:text-background">Add</span>
  );
  return (
    <CommandItem ref={row} value={`dish ${dish.id}`} disabled={out} onSelect={() => onSelect(row.current)} className={cn('gap-3 rounded-lg py-2', out && 'opacity-60')}>
      <FoodPhoto size={40} src={dish.photo} className="rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm"><VegMark veg={dish.veg} /><span className="truncate"><Highlight text={dish.name} q={q} /></span></span>
        <span className="block truncate text-xs text-muted-foreground">{restaurant.name} · {rupees(dish.price)}</span>
      </span>
      {add}
    </CommandItem>
  );
}
