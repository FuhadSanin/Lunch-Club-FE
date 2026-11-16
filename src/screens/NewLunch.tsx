import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PlaceInput } from '@/components/PlaceInput';
import { toast } from 'sonner';
import type { RestaurantMode } from '@/model';
import { RADIUS_RANGE } from '@/data/demo';
import type { Restaurant } from '@/model';
import { allDishes, byDistance, restaurantById, restaurantsWithin, useMenus } from '@/data/catalog';
import { useRestaurants } from '@/data/swiggy';
import { useLocalMenus, useLunches } from '@/api/queries';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store';
import { FoodPhoto, Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TimePicker } from '@/components/ui/time-picker';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList } from '@/components/ui/segmented';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { StepPage } from '@/components/steps';
import { useCelebrate } from '@/components/celebrate';
import { CloseLunchDialog, ExistingLunches, useRunningLunches } from './ExistingLunches';
import type { ApiLunch, ApiPlace } from '@/api/types';
import { cn, easeOut, spring } from '@/lib/cn';
import { ShareLunch, lunchLink } from '@/components/share-lunch';
import { ExitParty, useActiveParty } from '@/components/party-card';

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
  const { state, dispatch, now: DEMO_NOW, live, meId } = useStore();
  const lunches = useLunches(!!live);
  // The host's own menus for restaurants that aren't on Swiggy: a section of their own below the Swiggy restaurants.
  const localMenus = useLocalMenus(!!live);
  const [localPicked, setLocalPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const celebrate = useCelebrate();
  // One lunch at a time: while one is running, the form waits until it is closed.
  const { running } = useRunningLunches();
  // One lunch at a time. A company: any running lunch. A personal party: one you host or joined; you
  // close it or exit it first (the sidebar has the way out, and so does the notice below).
  const party = useActiveParty();
  const hasActive = live ? (live.personal ? !!party : !!live.lunchId || running.length > 0) : !state.session.completed;
  const [tab, setTab] = useState<'active' | 'history'>('active');
  // Closing: on the API through the close dialog (call off, or mark arrived); the demo just ends its lunch.
  const close = (l: ApiLunch) => {
    if (live) setClosing(l);
    else {
      dispatch({ type: 'finishLunch' });
      toast("Closed the demo food party", { description: 'Start the next one below.' });
    }
  };
  const [closing, setClosing] = useState<ApiLunch | null>(null);
  const [mode, setMode] = useState<RestaurantMode>(state.org.restaurantMode);
  const [radius, setRadius] = useState(state.org.radiusKm);
  const cutoffs = cutoffsFrom(DEMO_NOW);
  // 12:30 if it's still ahead today, otherwise about an hour from now.
  const [cutoff, setCutoff] = useState(() => (toMin('12:30') > toMin(DEMO_NOW) + 10 ? '12:30' : cutoffs[Math.min(3, cutoffs.length - 1)]));
  // A personal party has no saved addresses: the host searches for the place instead.
  const [address, setAddress] = useState(live?.personal ? '' : (state.org.addresses[0] ?? ''));
  const [picked, setPicked] = useState<string[]>(state.session.restaurantIds.slice(0, 3));
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [adding, setAdding] = useState(false); // the search box for a new address (a company's list of addresses comes first)
  const [lunchName, setLunchName] = useState('');
  const NAME_MISSING = 'Give the food party a name, like Friday team food party.';
  const nameMissing = error === NAME_MISSING;
  // A place chosen from the suggestions: restaurants are offered near it instead of near the office.
  const [place, setPlace] = useState<ApiPlace | null>(null);
  const [createdId, setCreatedId] = useState<string>();
  // Each lunch has its own link, made from its id: opening it takes anyone in the company to that lunch.
  const linkFor = (id?: string) => lunchLink(live ? id : undefined);
  const link = linkFor(createdId ?? live?.lunchId ?? undefined);
  useMenus();

  // Swiggy's restaurants around the office; the sample ones if the API can't be reached.
  // A saved address that says where it is works like a chosen place.
  const around = place ? { lat: place.lat, lng: place.lng } : (state.org.places?.[address] ?? state.org.office);
  // No delivery place yet (a personal party must choose one; a company must have an address): no restaurants,
  // since distances and delivery depend on it. The Restaurants card asks for the place instead.
  const noPlace = live?.personal ? !place : !address.trim();
  const nearby = useRestaurants(around, '', noPlace);
  // Loading a new place's restaurants shows loading rows, not the last place's list; samples only if it fails.
  const pool = nearby.status === 'ready' ? nearby.restaurants : nearby.status === 'loading' ? [] : byDistance();
  const nearWhat = place ? place.address.split(',')[0] : 'the office';
  const searching = query.trim().length >= 2;
  const search = useRestaurants(around, query, noPlace || !searching);

  // Nearby: every restaurant within the range, nearest first.
  const inRange = restaurantsWithin(radius, pool);
  const chosen = noPlace ? [] : mode === 'nearby' ? inRange.map((r) => r.id) : picked;
  // Choose myself: what's ticked stays on top, then the search results or everything nearby.
  const listed = [
    ...picked.map((id) => restaurantById(id)).filter((r): r is Restaurant => !!r),
    ...(searching ? search.restaurants : pool).filter((r) => !picked.includes(r.id)),
  ];

  // Where earlier lunches were delivered, newest first, each address once, with where it is: the host's own
  // for a party, the company's for a company. Those with a known place can be chosen in one tap.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    return (lunches.data ?? [])
      .filter((l) => live?.personal ? l.host.id === meId && !l.joined : true)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .flatMap((l) => (l.address?.lat != null && l.address.lng != null && !seen.has(l.address.address.toLowerCase()) && seen.add(l.address.address.toLowerCase()) ? [l.address as Required<NonNullable<ApiLunch['address']>>] : []))
      .slice(0, 10);
  }, [lunches.data, live?.personal, meId]);
  const chooseRecent = (a: (typeof recent)[number]) => {
    setPlace({ place_id: a.id, address: a.address, lat: a.lat as number, lng: a.lng as number });
    setAddress(a.address);
    setNewAddr('');
    setError('');
  };
  // The saved addresses, then where earlier lunches went, plus one just added that the API hasn't echoed back yet.
  const known = [...state.org.addresses, ...recent.map((a) => a.address).filter((a) => !state.org.addresses.includes(a))];
  const addresses = !address || known.includes(address) ? known : [address, ...known];
  // What the list shows: a company's addresses; a party host's own earlier places (and the one just searched for).
  const shown = live?.personal ? [...(place && !recent.some((r) => r.address === place.address) ? [place.address] : []), ...recent.map((r) => r.address)] : addresses;
  // A place picked from the suggestions: deliver there, and (for a company) keep it with the saved addresses.
  const choosePlace = (p: ApiPlace) => {
    setPlace(p);
    setAddress(p.address);
    setNewAddr('');
    setError('');
    if (!live?.personal && !state.org.addresses.includes(p.address)) {
      void dispatch({ type: 'updateOrg', org: { addresses: [...state.org.addresses, p.address], places: { ...state.org.places, [p.address]: { lat: p.lat, lng: p.lng } } } });
      toast.success('Address saved', { description: `Restaurants are now offered near ${p.address.split(',')[0]}.` });
    } else toast.success(`Finding restaurants near ${p.address.split(',')[0]}`, { description: p.address });
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
    if (!lunchName.trim()) {
      setError(NAME_MISSING);
      document.getElementById('lunch-name')?.focus();
      return;
    }
    if (!address.trim() || (live?.personal && !place)) {
      setError(live?.personal ? 'Search for the delivery place and choose it from the list.' : 'Add a delivery address first.');
      return;
    }
    if (!chosen.length && !localPicked.length) {
      setError(mode === 'nearby' ? `No restaurants within ${km(radius)}. Widen the range or choose them yourself.` : 'Choose at least one restaurant.');
      return;
    }
    setSending(true);
    Promise.resolve(dispatch({ type: 'newSession', cutoff, address, restaurantIds: chosen, localMenuIds: localPicked, name: lunchName, lat: place?.lat, lng: place?.lng }))
      .then((id) => {
        const url = linkFor(typeof id === 'string' ? id : undefined);
        if (typeof id === 'string') setCreatedId(id);
        setStarted(true);
        celebrate({ x: innerWidth / 2, y: innerHeight / 2, title: 'Food party started', sub: `Picks close at ${cutoff}. Share the link and the team can pick.`, tone: 'gold', icon: 'megaphone', sound: 'start' });
        // The page moves on to Review & lock; the link to share stays one tap away.
        toast.success('Food party started. Share it with the team', { description: url, duration: 12000, action: { label: 'Copy link', onClick: () => void copy(url) } });
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
        <PillTabsList label="Parties" value={tab} options={[{ value: 'active', label: 'Active food party' }, { value: 'history', label: 'History' }]} className="w-fit" />
        <TabsContent value="active" className="grid gap-4">
      <AnimatePresence mode="wait" initial={false}>
        {started ? (
          <motion.div key="started" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
            <Card className="max-w-[720px]" aria-labelledby="share-h">
              <CardHeader>
                <motion.div className="mb-3 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 }} aria-hidden="true">
                  <Icon name="check" size={26} />
                </motion.div>
                <CardTitle id="share-h" className="text-2xl tracking-[-0.03em]">Food party started. Share this link with the team.</CardTitle>
                <CardDescription>Picks close at {cutoff}. {chosen.length} {chosen.length === 1 ? 'restaurant' : 'restaurants'}, delivery to {address}.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="flex gap-2 max-sm:flex-col">
                  <Input name="lunch-link" readOnly spellCheck={false} value={link} aria-label="Food party link" className="h-10 font-mono text-[13px]" />
                  <Button variant="outline" onClick={() => void copy()}>Copy link</Button>
                  <ShareLunch link={link} cutoff={cutoff} label="QR & share" />
                </div>
                <Button asChild className="w-fit"><a href="#/">Go to the live board</a></Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : party ? (
          // In a running personal party: no new one until it is closed (host) or exited (guest).
          <motion.div key="party" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
            <Card>
              <CardContent className="grid gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-muted text-muted-foreground"><Icon name="lock" size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">You're in “{party.name || `${party.host.name.split(' ')[0]}'s food party`}”</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      One food party at a time.{' '}
                      {party.joined
                        ? 'Exit it from the sidebar, or here, and then you can start your own.'
                        : party.status === 'open' || party.status === 'locked'
                          ? 'Call it off from the sidebar or here, or run it to the last step, Enjoy your meal. Then you can start your own.'
                          : 'It ends at the last step, Enjoy your meal, once the food is collected and handed out. Then you can start your own.'}
                    </p>
                  </div>
                  <ExitParty lunch={party} size="default" />
                </div>
                {/* The party's link, so anyone in it can bring people in; the host also gets the QR code and share options. */}
                <div className="grid gap-2 rounded-xl bg-muted/60 p-3">
                  <Label htmlFor="party-link" className="text-[13px]">Food party link</Label>
                  <div className="flex gap-2 max-sm:flex-col">
                    <Input id="party-link" readOnly spellCheck={false} value={lunchLink(party.id)} onFocus={(e) => e.currentTarget.select()} className="h-10 bg-background font-mono text-[13px]" />
                    <Button type="button" variant="outline" onClick={() => void copy(lunchLink(party.id))}>Copy link</Button>
                    {!party.joined && (
                      <ShareLunch
                        link={lunchLink(party.id)}
                        name={party.name || undefined}
                        cutoff={new Date(party.cutoff_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                        label="QR & share"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">It opens the food party, so people can join and pick before the cutoff.</p>
                </div>
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
                    <ShareLunch link={link} cutoff={state.session.cutoff} name={live?.lunchName} label="QR & share" />
                  </div>
                  <p className="text-xs text-muted-foreground">It opens Pick my food, so everyone can choose before the cutoff.</p>
                </div>
                <p className="text-[13px] text-muted-foreground">One food party at a time. It ends at the last step, Enjoy your meal (or when it's called off before ordering); then you can start the next.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0, scale: 0.98 }}>
          <form onSubmit={start} className="grid items-start gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8 lg:col-start-1 lg:row-start-1" aria-labelledby="rest-h">
              <CardHeader>
                <CardTitle id="rest-h">Restaurants</CardTitle>
                <CardDescription>Everything the team picks goes into one Swiggy cart.</CardDescription>
                <CardAction>
                  <Badge variant={chosen.length ? 'info' : 'secondary'}>{chosen.length} {chosen.length === 1 ? 'restaurant' : 'restaurants'}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                {noPlace ? (
                  <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-input p-6">
                    <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground"><Icon name="search" size={18} /></span>
                    <div>
                      <p className="text-sm font-medium">Choose where to deliver first</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">Restaurants are offered near the delivery place, so they show up once you choose it under Deliver to.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => { const el = document.getElementById('addr'); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true }); }}>
                      Choose a place
                    </Button>
                  </div>
                ) : (
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
                        <FieldLabel htmlFor="radius">Within {km(radius)} of {nearWhat}</FieldLabel>
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
                        aria-label={`Distance from ${nearWhat}`}
                      />
                      <FieldDescription>Every restaurant in range is offered. Distances are from {address}.</FieldDescription>
                    </Field>
                    <LoadNote load={nearby} what={`restaurants near ${nearWhat}`} />
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
                    {searching ? <LoadNote load={search} what="the search" sample={false} /> : <LoadNote load={nearby} what={`restaurants near ${nearWhat}`} />}
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
                        <p className="mt-2 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">No restaurants on Swiggy match “{query.trim()}” near {nearWhat}.</p>
                      )}
                    </fieldset>
                  </TabsContent>
                </Tabs>
                )}
              </CardContent>
            </Card>

            {live && (
              <Card className="lg:col-span-8 lg:col-start-1 lg:row-start-2" aria-labelledby="local-h">
                <CardHeader>
                  <CardTitle id="local-h">Local menu</CardTitle>
                  <CardDescription>Restaurants you saved that aren't on Swiggy. You order these directly with the restaurant.</CardDescription>
                  <CardAction>
                    <Badge variant={localPicked.length ? 'info' : 'secondary'}>{localPicked.length} offered</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {localMenus.isPending && <Skeleton className="h-16 w-full rounded-xl" />}
                  {localMenus.isError && <p className="rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">Couldn't load your local menus. {localMenus.error.message}</p>}
                  {localMenus.isSuccess && !localMenus.data.length && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">
                      <span>You haven't saved a local menu yet.</span>
                      <Button asChild variant="outline" size="sm"><a href="#/menus">Add a local menu</a></Button>
                    </div>
                  )}
                  {localMenus.isSuccess && localMenus.data.length > 0 && (
                    <ul className="grid gap-2" aria-label="Local menus">
                      {localMenus.data.map((m) => {
                        const id = `local-${m.id}`;
                        const on = localPicked.includes(m.id);
                        return (
                          <li key={m.id}>
                            <label htmlFor={id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors', on ? 'border-brand/50 bg-brand-soft/40' : 'hover:bg-muted/50')}>
                              <Checkbox id={id} checked={on} onCheckedChange={() => { setError(''); setLocalPicked((c) => (on ? c.filter((x) => x !== m.id) : [...c, m.id])); }} />
                              <FoodPhoto size={44} src={m.image || undefined} className="rounded-xl" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{m.name}</span>
                                <span className="block text-[13px] text-muted-foreground num">
                                  {[m.rating != null ? `${m.rating} rating` : '', m.distance_km != null ? `${m.distance_km} km` : '', `${m.items.length} ${m.items.length === 1 ? 'dish' : 'dishes'}`].filter(Boolean).join(' · ')}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="overflow-visible lg:sticky lg:top-8 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1" aria-labelledby="when-h">
              <CardHeader><CardTitle id="when-h">When and where</CardTitle></CardHeader>
              <CardContent className="grid gap-5">
                <Field>
                  <FieldLabel htmlFor="cutoff" required>Picks close at</FieldLabel>
                  <TimePicker id="cutoff" value={cutoff} onValueChange={setCutoff} options={cutoffs} now={DEMO_NOW} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lunch-name" required>Food party name</FieldLabel>
                  <Input id="lunch-name" name="lunch-name" autoComplete="off" maxLength={80} aria-required="true" aria-invalid={nameMissing || undefined} value={lunchName} onChange={(e) => { setLunchName(e.target.value); if (nameMissing) setError(''); }} placeholder="Friday team food party" className="h-10" />
                </Field>
                <Field>
                  <FieldLabel id="addr-label" required>Deliver to</FieldLabel>
                  {/* Every address already added (a company's saved ones and where earlier food parties went; a host's own earlier places): press one to deliver there. */}
                  <div id="addr" role="radiogroup" aria-labelledby="addr-label" aria-required="true" tabIndex={-1} className={cn('grid gap-1.5 rounded-xl outline-none', shown.length > 5 && 'max-h-[300px] overflow-y-auto pr-1')}>
                    {shown.map((a) => {
                      const [where, area] = splitAddress(a);
                      const on = live?.personal ? place?.address === a : a === address;
                      return (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => { const r = recent.find((x) => x.address === a); if (r) chooseRecent(r); else if (!live?.personal) { setAddress(a); setPlace(null); setError(''); } setAdding(false); }}
                          className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-ink/60 bg-muted' : 'border-border hover:bg-muted/50')}
                        >
                          <Icon name="pin" size={15} className="shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{where}</span>
                            {area && <span className="block truncate text-[13px] text-muted-foreground">{area}</span>}
                          </span>
                          <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center rounded-full border', on ? 'border-ink bg-ink text-on-ink' : 'border-input')}>{on && <Icon name="check" size={12} />}</span>
                        </button>
                      );
                    })}
                    {!shown.length && <p className="rounded-xl border border-dashed border-input p-3 text-[13px] text-muted-foreground">No address yet. Add the first one below.</p>}
                  </div>
                  {adding ? (
                    <div className="grid gap-1.5">
                      <PlaceInput value={newAddr} near={around} onChange={setNewAddr} onPlace={(p) => { choosePlace(p); setAdding(false); }} placeholder="Search a building or area…" />
                      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => { setAdding(false); setNewAddr(''); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}><Icon name="new" size={14} /> Add a new address</Button>
                  )}
                {live?.personal && <FieldDescription>{place ? `Restaurants are offered near ${place.address}.` : 'Choose a place; restaurants are offered near it.'}</FieldDescription>}
                </Field>
                <FieldDescription>{live ? 'The team can pick as soon as it starts, until the cutoff.' : "Starting a new food party replaces today's demo food party and clears its picks."}</FieldDescription>
                <Button size="lg" type="submit" disabled={sending}>{sending ? "Starting…" : "Start the food party"}</Button>
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


