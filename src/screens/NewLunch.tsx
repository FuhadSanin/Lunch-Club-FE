import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { PlaceInput } from '@/components/PlaceInput';
import { useLunches } from '@/api/queries';
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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList } from '@/components/ui/segmented';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { StepPage } from '@/components/steps';
import { useCelebrate } from '@/components/celebrate';
import { CloseLunchDialog, ExistingLunches, useRunningLunches } from './ExistingLunches';
import type { ApiLunch, ApiPlace } from '@/api/types';
import { cn, easeOut, spring } from '@/lib/cn';

const km = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;
// Cutoffs: every quarter hour from just after now until a day later (the API takes up to 24 hours).
// Times before now aren't offered; a time earlier in the day than now means tomorrow.
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const cutoffsFrom = (now: string) => {
  const first = Math.ceil((toMin(now) + 10) / 15) * 15;
  return Array.from({ length: 92 }, (_, i) => hhmm((first + i * 15) % 1440));
};
// "Office, 4th floor, Infopark Phase 2, Kakkanad" → "Office, 4th floor" over "Infopark Phase 2, Kakkanad".
const splitAddress = (a: string) => {
  const parts = a.split(', ');
  return parts.length > 2 ? [parts.slice(0, 2).join(', '), parts.slice(2).join(', ')] : [a, ''];
};
const meta = (r: Restaurant) =>
  [r.open === false && 'Closed now', r.cuisines?.join(', '), r.eta].filter(Boolean).join(' · ') || `${allDishes(r).length} dishes from past team orders`;

export default function NewLunch() {
  const { state, dispatch, now: DEMO_NOW, live } = useStore();
  const [sending, setSending] = useState(false);
  const celebrate = useCelebrate();
  // One lunch at a time: while one is running, the form waits until it is closed.
  const { running } = useRunningLunches();
  // A company runs one lunch at a time. A personal party can start another while it is in others'.
  const hasActive = live ? !live.personal && (!!live.lunchId || running.length > 0) : !state.session.completed;
  const [tab, setTab] = useState<'active' | 'history'>('active');
  // Closing: on the API through the close dialog (call off, or mark arrived); the demo just ends its lunch.
  const close = (l: ApiLunch) => {
    if (live) setClosing(l);
    else {
      dispatch({ type: 'finishLunch' });
      toast("Closed the demo lunch", { description: 'Start the next one below.' });
    }
  };
  const [closing, setClosing] = useState<ApiLunch | null>(null);
  const [mode, setMode] = useState<RestaurantMode>(state.org.restaurantMode);
  const [radius, setRadius] = useState(state.org.radiusKm);
  const cutoffs = cutoffsFrom(DEMO_NOW);
  // 12:30 if it's still ahead today, otherwise about an hour from now.
  const [cutoff, setCutoff] = useState(() => (toMin('12:30') > toMin(DEMO_NOW) + 10 ? '12:30' : cutoffs[Math.min(3, cutoffs.length - 1)]));
  // A personal party has no saved office addresses: the host searches for the place instead.
  const [address, setAddress] = useState(live?.personal ? '' : (state.org.addresses[0] ?? ''));
  const [picked, setPicked] = useState<string[]>(state.session.restaurantIds.slice(0, 3));
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [lunchName, setLunchName] = useState('');
  // A place chosen from the suggestions: restaurants are offered near it instead of near the office.
  const [place, setPlace] = useState<ApiPlace | null>(null);
  const [createdId, setCreatedId] = useState<string>();
  // Each lunch has its own link, made from its id: opening it takes anyone in the company to that lunch.
  const linkFor = (id?: string) => `${window.location.origin}${window.location.pathname}#/${live && id ? `lunch/${id}` : 'pick'}`;
  const link = linkFor(createdId ?? live?.lunchId ?? undefined);
  useMenus();

  // Swiggy's restaurants around the office; the sample ones if the API can't be reached.
  const around = place ? { lat: place.lat, lng: place.lng } : state.org.office;
  const nearby = useRestaurants(around);
  const pool = nearby.status === 'ready' ? nearby.restaurants : byDistance();
  const searching = query.trim().length >= 2;
  const search = useRestaurants(around, query, !searching);

  // Nearby: every restaurant within the range, nearest first.
  const inRange = restaurantsWithin(radius, pool);
  const chosen = mode === 'nearby' ? inRange.map((r) => r.id) : picked;
  // Choose myself: what's ticked stays on top, then the search results or everything nearby.
  const listed = [
    ...picked.map((id) => restaurantById(id)).filter((r): r is Restaurant => !!r),
    ...(searching ? search.restaurants : pool).filter((r) => !picked.includes(r.id)),
  ];

  // The saved addresses, plus one just added that the API hasn't echoed back yet.
  const addresses = !address || state.org.addresses.includes(address) ? state.org.addresses : [address, ...state.org.addresses];
  // A place picked from the suggestions: deliver there, and (for a company) keep it with the saved addresses.
  const choosePlace = (p: ApiPlace) => {
    setPlace(p);
    setAddress(p.address);
    setNewAddr('');
    setError('');
    if (!live?.personal && !state.org.addresses.includes(p.address)) {
      void dispatch({ type: 'updateOrg', org: { addresses: [...state.org.addresses, p.address] } });
      toast.success('Address saved', { description: p.address });
    }
  };

  const setRadiusKm = (v: number) => {
    if (Number.isNaN(v)) return;
    setRadius(Math.min(RADIUS_RANGE.max, Math.max(RADIUS_RANGE.min, Math.round(v * 10) / 10)));
    setError('');
  };

  const toggle = (id: string) => {
    setError('');
    setPicked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasActive) return;
    if (!address.trim() || (live?.personal && !place)) {
      setError(live?.personal ? 'Search for the delivery place and choose it from the list.' : 'Add a delivery address first.');
      return;
    }
    if (!chosen.length) {
      setError(mode === 'nearby' ? `No restaurants within ${km(radius)}. Widen the range or choose them yourself.` : 'Choose at least one restaurant.');
      return;
    }
    setSending(true);
    Promise.resolve(dispatch({ type: 'newSession', cutoff, address, restaurantIds: chosen, name: lunchName, lat: place?.lat, lng: place?.lng }))
      .then((id) => {
        const url = linkFor(typeof id === 'string' ? id : undefined);
        if (typeof id === 'string') setCreatedId(id);
        setStarted(true);
        celebrate({ x: innerWidth / 2, y: innerHeight / 2, title: 'Lunch started', sub: `Picks close at ${cutoff}. Share the link and the team can pick.`, tone: 'gold', icon: 'megaphone', sound: 'start' });
        // The page moves on to Review & lock; the link to share stays one tap away.
        toast.success('Lunch started. Share it with the team', { description: url, duration: 12000, action: { label: 'Copy link', onClick: () => void copy(url) } });
      }, () => undefined) // a failure is already on screen as a toast
      .finally(() => setSending(false));
  };

  const copy = async (url = link) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { description: 'Paste it in the team chat.' });
    } catch {
      toast.error("Couldn't copy the link", { description: 'Select it and copy it by hand.' });
    }
  };

  return (
    <StepPage id="start" sub="Offer the restaurants near the office, or choose them yourself. Everyone gets one link.">
      <CloseLunchDialog lunch={closing} onOpenChange={(open) => !open && setClosing(null)} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'history')} className="gap-4">
        <PillTabsList label="Lunches" value={tab} options={[{ value: 'active', label: 'Active lunch' }, { value: 'history', label: 'History' }]} className="w-fit" />
        <TabsContent value="active" className="grid gap-4">
          {live?.personal && <MyLunches />}
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
                  <Button variant="outline" onClick={() => void copy()}>Copy link</Button>
                </div>
                <Button asChild className="w-fit"><a href="#/">Go to the live board</a></Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : hasActive ? (
          // One lunch at a time: while one is running, this tab shows only that lunch.
          <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
            <Card>
              <CardContent className="grid gap-3">
                <ExistingLunches show="running" onClose={close} />
                {/* The link to share is always here while the lunch runs, not just right after starting it. */}
                <div className="grid gap-2 rounded-xl bg-muted/60 p-3">
                  <Label htmlFor="share-link" className="text-[13px]">Share this link with the team</Label>
                  <div className="flex gap-2 max-sm:flex-col">
                    <Input id="share-link" readOnly spellCheck={false} value={link} onFocus={(e) => e.currentTarget.select()} className="h-10 bg-background font-mono text-[13px]" />
                    <Button variant="outline" onClick={() => void copy()}>Copy link</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">It opens Pick my lunch, so everyone can choose before the cutoff.</p>
                </div>
                <p className="text-[13px] text-muted-foreground">One lunch runs at a time. Once this one is complete, or you close it, you can start the next.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0, scale: 0.98 }}>
          <form onSubmit={start} className="grid items-start gap-4 lg:grid-cols-12">
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
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          name="radius-km"
                          aria-label="Distance in km"
                          min={RADIUS_RANGE.min}
                          max={RADIUS_RANGE.max}
                          step={0.1}
                          value={radius}
                          onChange={(e) => setRadiusKm(e.target.valueAsNumber)}
                          className="h-9 w-24 num"
                        />
                        <span className="text-[13px] text-muted-foreground">km, from {RADIUS_RANGE.min} to {RADIUS_RANGE.max}</span>
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
                  <TimePicker id="cutoff" value={cutoff} onValueChange={setCutoff} options={cutoffs} now={DEMO_NOW} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lunch-name">Lunch name <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                  <Input id="lunch-name" name="lunch-name" autoComplete="off" maxLength={80} value={lunchName} onChange={(e) => setLunchName(e.target.value)} placeholder="Friday team lunch" className="h-10" />
                </Field>
                {live?.personal ? (
                  <Field>
                    <FieldLabel htmlFor="addr">Deliver to</FieldLabel>
                    <PlaceInput id="addr" value={address} onChange={(t) => { setAddress(t); setPlace(null); }} onPlace={choosePlace} placeholder="Search your office, building or area…" />
                    <FieldDescription>{place ? `Restaurants are offered near ${place.address}.` : 'Choose a place from the suggestions; restaurants are offered near it.'}</FieldDescription>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="addr">Deliver to</FieldLabel>
                    <Select value={address} onValueChange={(a) => { setAddress(a); setPlace(null); }}>
                      <SelectTrigger id="addr" className="w-full">
                        <SelectValue placeholder="Choose or search an address">
                          {splitAddress(address)[0]}
                          {splitAddress(address)[1] && <span className="text-muted-foreground"> · {splitAddress(address)[1]}</span>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((a) => {
                          const [where, area] = splitAddress(a);
                          return <SelectItem key={a} value={a} description={area || undefined}>{where}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                    <PlaceInput value={newAddr} onChange={setNewAddr} onPlace={choosePlace} placeholder="Or search a new address…" />
                    <FieldDescription>{place ? `Restaurants are offered near ${place.address}.` : "Pick a saved address or search a new one. It must match an address on the host's Swiggy account."}</FieldDescription>
                  </Field>
                )}
                <FieldDescription>{live ? 'The team can pick as soon as it starts, until the cutoff.' : "Starting a new lunch replaces today's demo lunch and clears its picks."}</FieldDescription>
                <Button size="lg" type="submit" disabled={sending}>{sending ? "Starting…" : "Start the lunch"}</Button>
                <p role="alert" className="text-[13px] text-destructive empty:hidden">{error}</p>
              </CardContent>
            </Card>
          </form>
          </motion.div>
        )}
      </AnimatePresence>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent>
              <ExistingLunches show="past" onClose={close} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </StepPage>
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

const STATUS_LABEL: Record<string, string> = { open: 'Picking', locked: 'Locked', confirmed: 'Ordering', placed: 'Ordered', delivered: 'Arrived', cancelled: 'Called off' };

// A personal party's two sections, the first of them: the lunches you are in (ones you host and ones you
// joined by link). The second is the form below, to start a new one.
function MyLunches() {
  const lunches = useLunches(true);
  const { live } = useStore();
  const running = (lunches.data ?? []).filter((l) => ['open', 'locked', 'confirmed', 'placed'].includes(l.status));
  const copy = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/lunch/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { description: 'Send it to the people you are eating with.' });
    } catch {
      toast.error("Couldn't copy the link", { description: url });
    }
  };
  return (
    <Card aria-labelledby="mine-h">
      <CardHeader>
        <CardTitle id="mine-h">Lunches you're in</CardTitle>
        <CardDescription>Ones you started and ones you joined by link. Open one to pick or run it.</CardDescription>
        <CardAction><Badge variant={running.length ? 'info' : 'secondary'}>{running.length}</Badge></CardAction>
      </CardHeader>
      <CardContent className="grid gap-2">
        {running.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{l.name || `${l.host.name.split(' ')[0]}'s lunch`}</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {l.joined ? `Hosted by ${l.host.name}` : 'You are hosting'} · {STATUS_LABEL[l.status] ?? l.status} · picks close {new Date(l.cutoff_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
            {l.id === live?.lunchId && <Badge variant="secondary">Showing now</Badge>}
            {!l.joined && <Button type="button" size="sm" variant="outline" onClick={() => void copy(l.id)}>Copy link</Button>}
            <Button asChild size="sm"><a href={`#/lunch/${l.id}`}>Open</a></Button>
          </div>
        ))}
        {!running.length && <p className="rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">You're not in a lunch yet. Open a link someone sent you, or start one below.</p>}
      </CardContent>
    </Card>
  );
}
