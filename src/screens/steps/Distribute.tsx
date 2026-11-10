import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Command as CommandPrimitive } from 'cmdk';
import { dishById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { Avatar, FoodPhoto, Icon, rupees, VegMark } from '@/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { NextStep, StepPage } from '@/components/steps';
import { useCelebrate } from '@/components/celebrate';
import { ReviewProgress } from '../ReviewCard';
import { cn, spring } from '@/lib/cn';
import type { Person } from '@/data/demo';

// Step 5 (distribute): hand out the food. Each person's card shows exactly what they ordered, so the
// right bag goes to the right person; tick them as they collect it. Search suggests names as you type.
export default function Distribute() {
  const { state, dispatch } = useStore();
  const lunch = useLunch();
  const { session, picks } = state;
  const celebrate = useCelebrate();
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const handed = (id: string) => !!session.handedOut[id];
  const count = lunch.picked.filter((p) => handed(p.id)).length;
  const all = lunch.picked.length > 0 && count === lunch.picked.length;
  const q = query.trim().toLowerCase();

  const orderOf = (p: Person) => {
    const pick = picks[p.id];
    const lines = (pick?.items ?? []).flatMap((l) => {
      const f = dishById(l.dishId);
      return f ? [{ qty: l.qty, dish: f.dish, restaurant: f.restaurant }] : [];
    });
    return { lines, note: pick?.note.trim() ?? '', total: lines.reduce((n, l) => n + l.qty * l.dish.price, 0) };
  };

  // Still to hand out first, then by name; a search narrows the cards to the people it matches.
  const list = lunch.picked
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => Number(handed(a.id)) - Number(handed(b.id)) || a.name.localeCompare(b.name));
  const suggestions = q ? lunch.picked.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6) : [];

  const choose = (p: Person) => {
    setQuery(p.name);
    setSuggest(false);
    setFlash(p.id);
    window.setTimeout(() => document.getElementById(`serve-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    window.setTimeout(() => setFlash(null), 1600);
  };

  const toggle = (p: Person, done: boolean) => {
    dispatch({ type: 'handOut', userId: p.id, done });
    // The last person served: the glass clink and the violet moment.
    if (done && count + 1 === lunch.picked.length)
      celebrate({ x: innerWidth / 2, y: innerHeight / 2, title: "Everyone's served", sub: `All ${lunch.picked.length} people have their lunch.`, tone: 'violet', icon: 'cloche', sound: 'served' });
  };

  return (
    <StepPage id="distribute">
      <Card>
        <CardContent>
          <ReviewProgress done={count} of={lunch.picked.length} label="people have their food" />

          <Command
            ref={root}
            shouldFilter={false}
            label="Find a person"
            className="relative z-20 mb-4 overflow-visible rounded-none! bg-transparent p-0"
            onBlur={(e) => !root.current?.contains(e.relatedTarget as Node) && setSuggest(false)}
          >
            <div className="flex h-11 items-center gap-2.5 rounded-full border border-input bg-background px-4 shadow-xs focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 dark:bg-input/30">
              <Icon name="search" size={16} className="text-muted-foreground" />
              <CommandPrimitive.Input
                value={query}
                onValueChange={(v) => {
                  setQuery(v);
                  setSuggest(true);
                }}
                onFocus={() => setSuggest(true)}
                placeholder="Find a person by name"
                aria-label="Find a person by name"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Clear the search" onClick={() => setQuery('')}>
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
            <AnimatePresence>
              {suggest && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                  className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl bg-popover shadow-float"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <CommandList className="max-h-72 p-1.5">
                    {suggestions.map((p) => {
                      const o = orderOf(p);
                      const dishes = o.lines.reduce((n, l) => n + l.qty, 0);
                      return (
                        <CommandItem key={p.id} value={p.id} onSelect={() => choose(p)} className="gap-3 rounded-lg py-2">
                          <Avatar person={p} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{dishes} {dishes === 1 ? 'dish' : 'dishes'} · {rupees(o.total)}</span>
                          </span>
                          {handed(p.id) ? <span className="text-xs text-ok">Has it</span> : <span className="text-xs text-muted-foreground">To hand over</span>}
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </motion.div>
              )}
            </AnimatePresence>
          </Command>

          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((p) => {
              const done = handed(p.id);
              const o = orderOf(p);
              const id = `hand-${p.id}`;
              return (
                <motion.li
                  key={p.id}
                  id={`serve-${p.id}`}
                  layout="position"
                  transition={spring}
                  className={cn(
                    'scroll-mt-24 rounded-2xl p-4 transition-[background-color,box-shadow] duration-300',
                    done ? 'bg-ok-soft/70' : 'bg-card shadow-card',
                    flash === p.id && 'ring-2 ring-ring',
                  )}
                >
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
                    <Avatar person={p} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-semibold', done && 'text-ok')}>{p.name}</span>
                      <span className="block text-[13px] text-muted-foreground num">Owes {rupees(o.total)}</span>
                    </span>
                    <span className={cn('text-xs font-medium', done ? 'text-ok' : 'text-muted-foreground')}>{done ? 'Handed over' : 'Hand over'}</span>
                    <Checkbox id={id} className="size-5" checked={done} onCheckedChange={(v) => toggle(p, v === true)} aria-label={`${p.name} has their food`} />
                  </label>
                  <ul className="mt-3 grid gap-2 border-t border-dashed pt-3">
                    {o.lines.map((l) => (
                      <li key={l.dish.id} className="flex items-center gap-3 text-sm">
                        <FoodPhoto size={36} src={l.dish.photo} className="rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <VegMark veg={l.dish.veg} />
                            <span className="truncate">{l.qty > 1 && <span className="font-semibold num">{l.qty} × </span>}{l.dish.name}</span>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{l.restaurant.name}</span>
                        </span>
                        <span className="text-muted-foreground num">{rupees(l.qty * l.dish.price)}</span>
                      </li>
                    ))}
                  </ul>
                  {o.note && (
                    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-[13px]"><span className="font-medium">Note:</span> <span className="text-muted-foreground">{o.note}</span></p>
                  )}
                </motion.li>
              );
            })}
          </ul>
          {list.length === 0 && (
            <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">Nobody's name matches “{query.trim()}”.</p>
          )}
        </CardContent>
      </Card>
      {all && <NextStep to="finish">Everyone has their food. Last step: enjoy your meal.</NextStep>}
    </StepPage>
  );
}
