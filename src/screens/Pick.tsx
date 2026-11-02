import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ME_ID } from '@/data/demo';
import { dishById, useMenus, type Dish } from '@/data/menus';
import { useMenu, type Load } from '@/data/swiggy';
import { offeredRestaurants, useStore } from '@/store';
import { FoodPhoto, Icon, rupees, VegMark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { PageTitle } from '@/components/PageTitle';
import { originOf, useCelebrate } from '@/components/celebrate';
import { useFlyToCart } from '@/components/fly';
import { cn, spring } from '@/lib/cn';

export default function PickScreen() {
  const { state, dispatch } = useStore();
  const celebrate = useCelebrate();
  const { fly, layer } = useFlyToCart();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLAnchorElement>(null);
  const { session } = state;
  useMenus(); // live menus arrive after the first render
  const restaurants = offeredRestaurants(session).filter((r) => !!r);
  const existing = state.picks[ME_ID];
  const [items, setItems] = useState(existing?.items ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const [tab, setTab] = useState(
    existing?.items[0] ? dishById(existing.items[0].dishId)?.restaurant.id ?? restaurants[0]!.id : restaurants[0]!.id,
  );
  const menu = useMenu(tab, state.org.office);
  const [saved, setSaved] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const open = session.status === 'open';
  // Compare what the pick is, not the order dishes were added in, so adding and removing a dish relocks Save.
  const key = (lines: { dishId: string; qty: number }[]) => lines.map((l) => `${l.dishId}x${l.qty}`).sort().join('|');
  const dirty = key(items) !== key(existing?.items ?? []) || note.trim() !== (existing?.note ?? '').trim();
  // Nothing changed since the last save: the button rests as "Saved" until a dish, quantity or note changes.
  const savedAlready = !dirty && !!existing?.items.length && !existing.skipped;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const qty = (id: string) => items.find((l) => l.dishId === id)?.qty ?? 0;
  const setQty = (dish: Dish, n: number) => {
    setSaved(null);
    setItems((cur) => {
      const rest = cur.filter((l) => l.dishId !== dish.id);
      return n > 0 ? [...rest, { dishId: dish.id, qty: n }] : rest;
    });
  };
  // Add-to-cart: the dish's photo flies to the pick card on desktop, or the phone's cart bar.
  const addOne = (d: Dish, n: number, el: Element) => {
    setQty(d, n);
    fly(el, [badgeRef.current, barRef.current], d.photo);
  };
  const total = items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);
  const count = items.reduce((n, l) => n + l.qty, 0);

  const save = (e: React.MouseEvent<HTMLButtonElement>) => {
    dispatch({ type: 'savePick', userId: ME_ID, items, note });
    setSaved('Saved. The host sees it on the live board.');
    celebrate({
      ...originOf(e),
      title: 'Pick saved',
      sub: `${count} ${count === 1 ? 'dish' : 'dishes'}, ${rupees(total)}. It's on the live board for the ${session.cutoff} cutoff.`,
    });
  };
  const skip = () => {
    dispatch({ type: 'skip', userId: ME_ID });
    setItems([]);
    setNote('');
    setSaved('You are skipping today.');
  };

  return (
    <>
      <PageTitle
        title="Pick my lunch"
        sub={
          open
            ? <>Pick from any of today's {restaurants.length} restaurants. Picks close at <strong className="font-semibold text-foreground">{session.cutoff}</strong>.</>
            : 'Picks are closed for today. Ask the host if you need a change.'
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8" aria-label="Menus">
          <CardContent>
            <Tabs value={tab} onValueChange={setTab} className="gap-0">
              <PillTabsList
                label="Restaurants"
                value={tab}
                className="flex w-full lg:w-fit lg:flex-wrap lg:rounded-2xl"
                options={restaurants.map((r) => ({ value: r.id, label: <><FoodPhoto size={20} src={r.photo} className="rounded-full" />{r.name}</> }))}
              />
              {restaurants.map((restaurant) => (
                <TabsContent key={restaurant.id} value={restaurant.id}>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em]">{restaurant.name}</h2>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {[restaurant.cuisines?.join(', '), restaurant.rating && `${restaurant.rating} rating`, restaurant.eta, restaurant.distanceKm && `${restaurant.distanceKm} km away`]
                          .filter(Boolean).join(' · ') || 'Dishes the team has ordered here before'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Switch id={`veg-${restaurant.id}`} checked={vegOnly} onCheckedChange={setVegOnly} />
                      <Label htmlFor={`veg-${restaurant.id}`} className="text-[13px] font-normal">Veg only</Label>
                    </div>
                  </div>

                  {restaurant.id === tab && <MenuStatus load={menu} empty={!restaurant.categories.length} />}

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={restaurant.id + vegOnly}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                    >
                      {restaurant.categories.map((c) => {
                        const dishes = c.dishes.filter((d) => !vegOnly || d.veg);
                        if (!dishes.length) return null;
                        return (
                          <div key={c.name}>
                            <h3 className="mt-6 mb-1 text-sm font-semibold text-body">{c.name}</h3>
                            <ul>
                              {dishes.map((d) => {
                                const n = qty(d.id);
                                return (
                                  <li key={d.id} className={cn('-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 rounded-xl px-2 py-3 transition-colors duration-200', n > 0 ? 'bg-muted/60' : 'hover:bg-muted/60')}>
                                    <FoodPhoto size={48} src={d.photo} className="rounded-xl" />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-sm font-medium"><VegMark veg={d.veg} /> <span>{d.name}</span></div>
                                      {d.desc && <div className="mt-0.5 line-clamp-2 max-w-[60ch] text-[13px] text-muted-foreground">{d.desc}</div>}
                                      <div className="mt-1 text-sm num">{rupees(d.price)}</div>
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
                                          <Button variant="ghost" size="icon" className="text-lg" aria-label={`One less ${d.name}`} disabled={!open} onClick={() => setQty(d, n - 1)}>−</Button>
                                          <span className="relative w-5 overflow-hidden text-center text-sm font-semibold num" aria-live="polite">
                                            <AnimatePresence mode="popLayout" initial={false}>
                                              <motion.span key={n} className="block" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={spring}>
                                                {n}
                                              </motion.span>
                                            </AnimatePresence>
                                          </span>
                                          <Button variant="ghost" size="icon" className="text-lg" aria-label={`One more ${d.name}`} disabled={!open} onClick={(e) => addOne(d, n + 1, e.currentTarget)}>+</Button>
                                        </motion.div>
                                      ) : (
                                        <motion.div key="add" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
                                          <Button size="sm" variant="outline" disabled={!open} onClick={(e) => addOne(d, 1, e.currentTarget)} aria-label={`Add ${d.name}`}>Add</Button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card id="your-pick" className="lg:sticky lg:top-8 lg:col-span-4" aria-labelledby="pick-title">
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
              <ul className="grid">
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
                          </span>
                          <span className="num">{rupees(f.dish.price * l.qty)}</span>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                <Separator className="my-1.5" />
                <li className="flex justify-between pt-1.5 text-sm font-semibold">
                  <span>You owe the host</span><span className="num">{rupees(total)}</span>
                </li>
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-input p-4 text-center text-sm text-muted-foreground">Add dishes from any restaurant.</p>
            )}

            <Field>
              <FieldLabel htmlFor="note">Note for the restaurant</FieldLabel>
              <Textarea id="note" name="note" autoComplete="off" value={note} disabled={!open} onChange={(e) => { setNote(e.target.value); setSaved(null); }} placeholder="Less spicy, no onion…" />
            </Field>

            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Button disabled={!open || !items.length || !dirty} onClick={save} className="flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={savedAlready ? 'saved' : 'save'}
                      className="flex items-center gap-1.5"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {savedAlready ? <><Icon name="check" size={14} /> Saved</> : 'Save my pick'}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                <Button variant="outline" disabled={!open} onClick={skip}>Skip today</Button>
              </div>
              <FieldDescription role="status" className="empty:hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={saved ?? String(dirty)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {saved ?? (dirty ? 'Not saved yet' : existing?.updatedAt ? `Last saved at ${existing.updatedAt}` : '')}
                    {saved && <> <a className="font-medium text-foreground underline-offset-4 hover:underline" href="#/">See the board</a></>}
                  </motion.span>
                </AnimatePresence>
              </FieldDescription>
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {count > 0 && (
          <motion.a
            ref={barRef}
            href="#your-pick"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring}
            onClick={(e) => { e.preventDefault(); document.getElementById('your-pick')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}
            className="fixed inset-x-4 bottom-4 z-20 flex h-14 items-center justify-between gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-modal lg:hidden"
          >
            <span className="num">{count} {count === 1 ? 'dish' : 'dishes'} · {rupees(total)}</span>
            <span>Review my pick</span>
          </motion.a>
        )}
      </AnimatePresence>
      {layer}
    </>
  );
}

// While a live menu loads: placeholder rows if there's nothing to show yet. If it fails: the reason
// and a retry, above the saved dishes when there are some.
function MenuStatus({ load, empty }: { load: Load; empty: boolean }) {
  if (load.status === 'loading' && empty) {
    return (
      <ul className="mt-6 grid gap-3" aria-busy="true" aria-label="Loading the menu">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 py-1">
            <span className="size-12 animate-pulse rounded-xl bg-muted" />
            <span className="grid gap-2">
              <span className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
              <span className="h-3 w-1/5 animate-pulse rounded bg-muted" />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (load.status === 'error') {
    return (
      <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-4 text-sm">
        <span className="text-muted-foreground">
          {empty ? "This menu didn't load. " : "Showing saved dishes; the live menu didn't load. "}
          {load.error}
        </span>
        <Button size="sm" variant="outline" onClick={load.retry}>Try again</Button>
      </div>
    );
  }
  if (load.status === 'ready' && empty) {
    return <p className="mt-6 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">Swiggy shows no dishes here right now. The restaurant may be closed.</p>;
  }
  return null;
}
