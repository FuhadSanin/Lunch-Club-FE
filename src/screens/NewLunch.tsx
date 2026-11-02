import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { RADIUS_RANGE, type RestaurantMode } from '@/data/demo';
import { allDishes, byDistance, restaurantById, restaurantsWithin, useMenus, type Restaurant } from '@/data/menus';
import { useRestaurants } from '@/data/swiggy';
import { useStore } from '@/store';
import { FoodPhoto, Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList } from '@/components/ui/segmented';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { PageTitle } from '@/components/PageTitle';
import { cn, easeOut, spring } from '@/lib/cn';

const km = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;
// Cutoffs every 15 minutes over the lunch hours, shown as "12:30 pm".
const CUTOFFS = Array.from({ length: 15 }, (_, i) => {
  const m = 11 * 60 + i * 15;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
const clock = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
const meta = (r: Restaurant) =>
  [r.open === false && 'Closed now', r.cuisines?.join(', '), r.eta].filter(Boolean).join(' · ') || `${allDishes(r).length} dishes from past team orders`;

export default function NewLunch() {
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState<RestaurantMode>(state.org.restaurantMode);
  const [radius, setRadius] = useState(state.org.radiusKm);
  const [cutoff, setCutoff] = useState('12:30');
  const [address, setAddress] = useState(state.org.addresses[0] ?? '');
  const [picked, setPicked] = useState<string[]>(state.session.restaurantIds.slice(0, 3));
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const link = `${window.location.origin}${window.location.pathname}#/pick`;
  useMenus();

  // Swiggy's restaurants around the office; the sample ones if the API can't be reached.
  const nearby = useRestaurants(state.org.office);
  const pool = nearby.status === 'ready' ? nearby.restaurants : byDistance();
  const searching = query.trim().length >= 2;
  const search = useRestaurants(state.org.office, query, !searching);

  // Nearby: every restaurant within the range, nearest first.
  const inRange = restaurantsWithin(radius, pool);
  const chosen = mode === 'nearby' ? inRange.map((r) => r.id) : picked;
  // Choose myself: what's ticked stays on top, then the search results or everything nearby.
  const listed = [
    ...picked.map((id) => restaurantById(id)).filter((r): r is Restaurant => !!r),
    ...(searching ? search.restaurants : pool).filter((r) => !picked.includes(r.id)),
  ];

  const toggle = (id: string) => {
    setError('');
    setPicked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen.length) {
      setError(mode === 'nearby' ? `No restaurants within ${km(radius)}. Widen the range or choose them yourself.` : 'Choose at least one restaurant.');
      return;
    }
    dispatch({ type: 'newSession', cutoff, address, restaurantIds: chosen });
    setStarted(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied', { description: 'Paste it in the team chat.' });
    } catch {
      toast.error("Couldn't copy the link", { description: 'Select it and copy it by hand.' });
    }
  };

  return (
    <>
      <PageTitle title="Start a lunch" sub="Offer the restaurants near the office, or choose them yourself. Everyone gets one link." />

      <AnimatePresence mode="wait" initial={false}>
        {started ? (
          <motion.div key="started" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
            <Card className="max-w-[720px]" aria-labelledby="share-h">
              <CardHeader>
                <motion.div className="mb-3 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 }} aria-hidden="true">
                  <Icon name="check" size={26} />
                </motion.div>
                <CardTitle id="share-h" className="text-2xl tracking-[-0.03em]">Lunch started. Share this link with the team.</CardTitle>
                <CardDescription>Picks close at {cutoff}. {chosen.length} {chosen.length === 1 ? 'restaurant' : 'restaurants'}, delivery to {address}.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="flex gap-2 max-sm:flex-col">
                  <Input name="lunch-link" readOnly spellCheck={false} value={link} aria-label="Lunch link" className="h-10 font-mono text-[13px]" />
                  <Button variant="outline" onClick={copy}>Copy link</Button>
                </div>
                <Button asChild className="w-fit"><a href="#/">Go to the live board</a></Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.form key="form" exit={{ opacity: 0, scale: 0.98 }} className="grid items-start gap-4 lg:grid-cols-12" onSubmit={start}>
            <Card className="lg:col-span-8" aria-labelledby="rest-h">
              <CardHeader>
                <CardTitle id="rest-h">Restaurants</CardTitle>
                <CardDescription>Everything the team picks goes into one Swiggy cart.</CardDescription>
                <CardAction>
                  <Badge variant={chosen.length ? 'info' : 'secondary'}>{chosen.length} {chosen.length === 1 ? 'restaurant' : 'restaurants'}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Tabs value={mode} onValueChange={(v) => { setMode(v as RestaurantMode); setError(''); }} className="gap-5">
                  <PillTabsList<RestaurantMode>
                    label="How to choose restaurants"
                    value={mode}
                    options={[
                      { value: 'nearby', label: 'Nearby' },
                      { value: 'manual', label: 'Choose myself' },
                    ]}
                  />

                  <TabsContent value="nearby" className="grid gap-5">
                    <Field>
                      <div className="flex items-baseline justify-between gap-3">
                        <FieldLabel htmlFor="radius">Within {km(radius)} of the office</FieldLabel>
                        <span className="text-[13px] text-muted-foreground num">{inRange.length} in range</span>
                      </div>
                      <Slider
                        id="radius"
                        min={RADIUS_RANGE.min}
                        max={RADIUS_RANGE.max}
                        step={RADIUS_RANGE.step}
                        value={[radius]}
                        onValueChange={([v]) => { setRadius(v); setError(''); }}
                        aria-label="Distance from the office"
                      />
                      <FieldDescription>Every restaurant in range is offered. Distances are from {address}.</FieldDescription>
                    </Field>
                    <LoadNote load={nearby} what="restaurants near the office" />
                    <ul className="grid gap-2">
                      <AnimatePresence initial={false} mode="popLayout">
                        {inRange.map((r) => {
                          return (
                            <motion.li
                              key={r.id}
                              layout
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                              transition={spring}
                              className="flex items-center gap-3 rounded-xl bg-muted/60 p-3"
                            >
                              <FoodPhoto size={44} src={r.photo} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{r.name}</span>
                                <span className="block truncate text-[13px] text-muted-foreground">{meta(r)}</span>
                              </span>
                              <span className="text-right">
                                <span className="block text-sm num">{km(r.distanceKm ?? 0)}</span>
                                <span className="block text-xs text-muted-foreground">Offered</span>
                              </span>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                      {nearby.status === 'loading' && <RowsLoading />}
                      {nearby.status !== 'loading' && inRange.length === 0 && (
                        <li className="rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">
                          No restaurants within {km(radius)}. Widen the range, or choose them yourself.
                        </li>
                      )}
                    </ul>
                  </TabsContent>

                  <TabsContent value="manual" className="grid gap-4">
                    <Field>
                      <FieldLabel htmlFor="find">Find on Swiggy</FieldLabel>
                      <Input id="find" type="search" name="find" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Paragon, biryani…" className="h-10" />
                    </Field>
                    {searching ? <LoadNote load={search} what="the search" sample={false} /> : <LoadNote load={nearby} what="restaurants near the office" />}
                    <fieldset>
                      <legend className="sr-only">Restaurants to offer</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {listed.map((r) => {
                          const on = picked.includes(r.id);
                          const id = `r-${r.id}`;
                          return (
                            <motion.label
                              key={r.id}
                              htmlFor={id}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                'flex items-center gap-3 rounded-xl p-3 transition-[background-color,box-shadow,opacity] duration-200',
                                on ? 'bg-muted/60 shadow-[0_0_0_1.5px_var(--color-ink)]' : 'shadow-ring hover:bg-muted/60',
                                'cursor-pointer',
                              )}
                            >
                              <FoodPhoto size={44} src={r.photo} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{r.name}</span>
                                <span className="block truncate text-[13px] text-muted-foreground">{[r.distanceKm && km(r.distanceKm), meta(r)].filter(Boolean).join(' · ')}</span>
                              </span>
                              <Checkbox id={id} checked={on} onCheckedChange={() => toggle(r.id)} />
                            </motion.label>
                          );
                        })}
                      </div>
                      {(searching ? search : nearby).status === 'loading' && <RowsLoading />}
                      {searching && search.status === 'ready' && !search.restaurants.length && (
                        <p className="mt-2 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">No restaurants on Swiggy match “{query.trim()}” near the office.</p>
                      )}
                    </fieldset>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="lg:sticky lg:top-8 lg:col-span-4" aria-labelledby="when-h">
              <CardHeader><CardTitle id="when-h">When and where</CardTitle></CardHeader>
              <CardContent className="grid gap-5">
                <Field>
                  <FieldLabel htmlFor="cutoff">Picks close at</FieldLabel>
                  <Select value={cutoff} onValueChange={setCutoff}>
                    <SelectTrigger id="cutoff" className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CUTOFFS.map((t) => <SelectItem key={t} value={t}>{clock(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="addr">Deliver to</FieldLabel>
                  <Select value={address} onValueChange={setAddress}>
                    <SelectTrigger id="addr" className="h-auto min-h-10 w-full py-2 text-left whitespace-normal *:data-[slot=select-value]:line-clamp-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {state.org.addresses.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldDescription>Addresses come from your Swiggy account. Add more in Settings.</FieldDescription>
                </Field>
                <FieldDescription>Starting a new lunch replaces today's demo lunch and clears its picks.</FieldDescription>
                <Button size="lg" type="submit">Start the lunch</Button>
                <p role="alert" className="text-[13px] text-destructive empty:hidden">{error}</p>
              </CardContent>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}

function RowsLoading() {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2" aria-busy="true" aria-label="Loading restaurants">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <span className="size-11 animate-pulse rounded-lg bg-muted" />
          <span className="grid flex-1 gap-2">
            <span className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
            <span className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </span>
        </div>
      ))}
    </div>
  );
}

// Why live restaurants are missing, with a retry; nothing while they load or once they're in.
function LoadNote({ load, what, sample = true }: { load: { status: string; error?: string; retry: () => void }; what: string; sample?: boolean }) {
  if (load.status !== 'error') return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-3 text-[13px] text-muted-foreground">
      <span>Couldn't load {what}{sample ? ', so these are sample restaurants' : ''}. {load.error}</span>
      <Button type="button" size="sm" variant="outline" onClick={load.retry}>Try again</Button>
    </div>
  );
}
