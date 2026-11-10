import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { dishById, rememberDish, restaurantById, restaurantsWithin, useMenus, type Dish } from '@/data/menus';
import { useMenu, useRestaurants, type FoundDish, type Load } from '@/data/swiggy';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';
import { LockScene, SHACKLE_SHUT } from '@/components/lock-scene';
import { personById, type Pick, type PickLine, type SessionStatus } from '@/data/demo';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FoodSearch } from './pick/FoodSearch';
import { RestaurantCard } from './pick/RestaurantCard';
import { Input } from '@/components/ui/input';
import { offeredRestaurants, useLunch, useStore } from '@/store';
import { FoodPhoto, Icon, Rating, rupees, VegMark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const { state, dispatch, meId: ME_ID, live } = useStore();
  const celebrate = useCelebrate();
  const { fly, layer } = useFlyToCart();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLAnchorElement>(null);
  const { session } = state;
  useMenus(); // live menus arrive after the first render
  // A lunch that doesn't say which restaurants it offers (started in another browser) offers the ones
  // near the office within the company's distance. Fetched here only, never on other pages.
  const unknownOffer = !!live && !session.restaurantIds.length;
  const nearby = useRestaurants(state.org.office, '', !unknownOffer);
  const restaurants = unknownOffer
    ? restaurantsWithin(state.org.radiusKm, nearby.restaurants)
    : offeredRestaurants(session).filter((r) => !!r);
  const existing = state.picks[ME_ID];
  // Completed or skipped: final until the host reopens it.
  const done = !!existing?.done;
  // The cart lives in this browser until it's completed, so a reload or a closed tab doesn't lose it.
  const draftKey = `lunchboard-cart-v1:${session.id}:${ME_ID}`;
  const [items, setItems] = useState<PickLine[]>(() => (!done && readDraft(draftKey)?.items) || existing?.items || []);
  const [note, setNote] = useState(() => (!done ? readDraft(draftKey)?.note : undefined) ?? existing?.note ?? '');
  const [confirm, setConfirm] = useState<'complete' | 'skip' | null>(null);
  const [sending, setSending] = useState(false);
  // null: the restaurant cards; otherwise that restaurant's menu.
  const [openId, setOpenId] = useState<string | null>(null);
  const current = openId ? restaurantById(openId) : undefined;
  const menu = useMenu(openId ?? '', state.org.office);
  const [menuQuery, setMenuQuery] = useState('');
  const openRestaurant = (id: string) => {
    setOpenId(id);
    setMenuQuery('');
    document.getElementById('pick-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [vegOnly, setVegOnly] = useState(false);
  const open = session.status === 'open';
  // Picks locking while this page is open: the latch click as the lock card comes down.
  const was = useRef(session.status);
  useEffect(() => {
    // playSound adds 20 ms and the snap comes 45 ms into the sound, so it lands as the shackle shuts.
    if (was.current === 'open' && session.status === 'locked') playSound('lock', SHACKLE_SHUT - 0.065);
    // The order going out while this page is open: the till rings as the check draws.
    if ((was.current === 'open' || was.current === 'locked') && (session.status === 'placing' || session.status === 'placed'))
      playSound('money', ORDER_CHECK - 0.1);
    was.current = session.status;
  }, [session.status]);
  const savedTotal = existing?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0;
  useEffect(() => {
    if (!open || done) return;
    writeDraft(draftKey, items.length || note.trim() ? { items, note } : null);
  }, [items, note, open, done, draftKey]);

  const qty = (id: string) => items.find((l) => l.dishId === id)?.qty ?? 0;
  const setQty = (dish: Dish, n: number) => {
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
  // Adding from the search: the dish may come from a menu that isn't loaded yet, so keep it first.
  const addFromSearch = (f: FoundDish, el: Element | null) => {
    rememberDish(f.restaurant, f.dish);
    const before = qty(f.dish.id);
    setQty(f.dish, before + 1);
    if (el) fly(el, [badgeRef.current, barRef.current], f.dish.photo);
    toast.success(`Added ${f.dish.name}`, {
      description: `${f.restaurant.name} · ${rupees(f.dish.price)}`,
      action: { label: 'Undo', onClick: () => setQty(f.dish, before) },
    });
  };
  // The menu section in view, for the Menu panel; and jumping to one.
  const [activeCat, setActiveCat] = useState(0);
  const jumpTo = (n: number) => {
    setActiveCat(n);
    document.getElementById(`menu-cat-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const inPickAt = (restaurantId: string) =>
    items.reduce((n, l) => n + (dishById(l.dishId)?.restaurant.id === restaurantId ? l.qty : 0), 0);
  const categories = (current?.categories ?? [])
    .map((c) => ({ ...c, dishes: c.dishes.filter((d) => (!vegOnly || d.veg) && (!menuQuery.trim() || d.name.toLowerCase().includes(menuQuery.trim().toLowerCase()))) }))
    .filter((c) => c.dishes.length);

  const sectionKey = categories.map((c) => c.name).join('|');
  useEffect(() => {
    setActiveCat(0);
    let io: IntersectionObserver | undefined;
    let timer = 0;
    // The menu fades in after the cards fade out, so its sections may not exist yet.
    const watch = () => {
      const sections = [...document.querySelectorAll<HTMLElement>('[id^="menu-cat-"]')];
      if (!sections.length) {
        timer = window.setTimeout(watch, 150);
        return;
      }
      const seen = new Map<Element, boolean>();
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => seen.set(e.target, e.isIntersecting));
          const first = sections.findIndex((el) => seen.get(el));
          if (first >= 0) setActiveCat(first);
        },
        { rootMargin: '-15% 0px -70% 0px' },
      );
      sections.forEach((el) => io!.observe(el));
    };
    if (openId) watch();
    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [sectionKey, openId]);

  const total = items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);
  const count = items.reduce((n, l) => n + l.qty, 0);
  // Dishes Swiggy now shows as out of stock can't be ordered, so they hold the order back.
  const soldOut = items.filter((l) => dishById(l.dishId)?.dish.inStock === false);

  // Completing puts the cart on the board and makes it final; skipping is final too. Either way the
  // host can reopen it.
  const completeOrder = (e: React.MouseEvent<HTMLButtonElement>) => {
    const from = originOf(e);
    setConfirm(null);
    setSending(true);
    Promise.resolve(dispatch({ type: 'completePick', userId: ME_ID, items, note }))
      .then(() => {
        writeDraft(draftKey, null);
        celebrate({
          ...from,
          title: 'Order complete',
          sub: `${count} ${count === 1 ? 'dish' : 'dishes'}, ${rupees(total)}. It's on the live board for the ${session.cutoff} cutoff.`,
          sound: 'saved',
        });
      }, () => undefined) // the reason is already on screen as a toast
      .finally(() => setSending(false));
  };
  const skipToday = () => {
    setConfirm(null);
    setSending(true);
    Promise.resolve(dispatch({ type: 'skip', userId: ME_ID }))
      .then(() => {
        writeDraft(draftKey, null);
        setItems([]);
        setNote('');
        toast("You're skipping today", { description: 'Ask the host if you change your mind.' });
      }, () => undefined)
      .finally(() => setSending(false));
  };

  return (
    <>
      <PageTitle
        title="Pick my lunch"
        sub={
          open
            ? <>Search any restaurant or dish on Swiggy, or open one of today's {restaurants.length} restaurants. Picks close at <strong className="font-semibold text-foreground">{session.cutoff}</strong>.</>
            : session.status === 'locked'
              ? 'Picks are closed for today. Ask the host if you need a change.'
              : session.status === 'delivered'
                ? "Today's lunch has arrived."
                : "Today's order is placed on Swiggy."
        }
      />

      <div className="relative">
      <div
        id="pick-top"
        inert={!open || done}
        className={cn('grid scroll-mt-20 items-start gap-4 transition-[filter,opacity] duration-500 lg:grid-cols-12', (!open || done) && 'pointer-events-none opacity-70 blur-[3px] select-none')}
      >
        <Card className="lg:col-span-8" aria-label="Restaurants and menus">
          <CardContent>
            <FoodSearch
              restaurants={restaurants}
              place={state.org.office}
              vegOnly={vegOnly}
              disabled={!open}
              qty={qty}
              onOpenRestaurant={(r) => openRestaurant(r.id)}
              onAddDish={addFromSearch}
            />

            <AnimatePresence mode="wait" initial={false}>
              {current ? (
                <motion.section
                  key={current.id}
                  aria-labelledby="menu-title"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Button variant="ghost" size="sm" className="mt-5 -ml-2.5 text-muted-foreground" onClick={() => setOpenId(null)}>
                    <Icon name="arrow" size={14} className="rotate-180" /> All restaurants
                  </Button>
                  <div className="mt-2 flex flex-wrap items-start gap-4">
                    <FoodPhoto size={64} src={current.photo} className="rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <h2 id="menu-title" className="text-xl font-semibold tracking-[-0.03em]">{current.name}</h2>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{current.cuisines?.join(', ') || 'Dishes the team has ordered here before'}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground num">
                        <Rating value={current.rating} />
                        {[current.eta, current.distanceKm !== undefined && `${current.distanceKm} km away`].filter(Boolean).map((t) => (
                          <span key={String(t)} className="before:mr-2 before:content-['·']">{t}</span>
                        ))}
                      </p>
                      {!restaurants.some((r) => r.id === current.id) && (
                        <Badge variant="secondary" className="mt-2">Not on today's list: it joins the same cart</Badge>
                      )}
                    </div>
                    <VegSwitch id="veg-menu" checked={vegOnly} onChange={setVegOnly} />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <label className="relative min-w-[200px] flex-1">
                      <span className="sr-only">Find a dish in this menu</span>
                      <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                      <Input type="search" value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder={`Find in ${current.name}`} className="h-9 rounded-full pl-8" />
                    </label>
                  </div>
                  {categories.length > 1 && (
                    <nav aria-label="Menu sections" className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
                      {categories.map((c, n) => (
                        <Button key={c.name} size="sm" variant="outline" className="h-8 flex-none rounded-full text-[13px] font-normal" onClick={() => jumpTo(n)}>
                          {c.name} <span className="text-muted-foreground num">{c.dishes.length}</span>
                        </Button>
                      ))}
                    </nav>
                  )}

                  <MenuStatus load={menu} empty={!current.categories.length} />

                  {categories.map((c, n) => (
                    <div key={c.name} id={`menu-cat-${n}`} className="scroll-mt-24">
                      <h3 className="mt-6 mb-1 text-sm font-semibold text-body">{c.name}</h3>
                      <ul>
                        {c.dishes.map((d) => {
                          const n = qty(d.id);
                          const out = d.inStock === false;
                          return (
            <li key={d.id} className={cn('-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 rounded-xl px-2 py-3 transition-colors duration-200', n > 0 ? 'bg-muted/60' : !out && 'hover:bg-muted/60')}>
              <FoodPhoto size={48} src={d.photo} className={cn('rounded-xl', out && 'opacity-50 grayscale')} />
              <div className={cn('min-w-0', out && n === 0 && 'opacity-60')}>
                <div className="flex items-center gap-2 text-sm font-medium"><VegMark veg={d.veg} /> <span>{d.name}</span></div>
                {d.desc && <div className="mt-0.5 line-clamp-2 max-w-[60ch] text-[13px] text-muted-foreground">{d.desc}</div>}
                <div className="mt-1 text-sm num">{rupees(d.price)}</div>
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
                    <Button variant="ghost" size="icon" className="text-lg" aria-label={`One less ${d.name}`} disabled={!open} onClick={() => setQty(d, n - 1)}>−</Button>
                    <span className="relative w-5 overflow-hidden text-center text-sm font-semibold num" aria-live="polite">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span key={n} className="block" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={spring}>
                          {n}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <Button variant="ghost" size="icon" className="text-lg" aria-label={`One more ${d.name}`} disabled={!open || out} onClick={(e) => addOne(d, n + 1, e.currentTarget)}>+</Button>
                  </motion.div>
                ) : (
                  <motion.div key="add" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
                    {out ? (
                      <Button size="sm" variant="outline" disabled aria-label={`${d.name} is out of stock`}>Out of stock</Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={!open} onClick={(e) => addOne(d, 1, e.currentTarget)} aria-label={`Add ${d.name}`}>Add</Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {current.categories.length > 0 && !categories.length && (
                    <p className="mt-6 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">
                      Nothing here matches{menuQuery.trim() ? ` “${menuQuery.trim()}”` : ''}{vegOnly ? ' with Veg only on' : ''}.
                    </p>
                  )}
                </motion.section>
              ) : (
                <motion.section
                  key="all"
                  aria-labelledby="today-title"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="today-title" className="text-sm font-semibold">
                      Today's restaurants <span className="font-normal text-muted-foreground num">{restaurants.length}</span>
                    </h2>
                    <VegSwitch id="veg-all" checked={vegOnly} onChange={setVegOnly} />
                  </div>
                  {restaurants.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {restaurants.map((r) => (
                        <RestaurantCard key={r.id} restaurant={r} inPick={inPickAt(r.id)} onOpen={() => openRestaurant(r.id)} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">
                      No restaurants on today's list yet. Search above for any restaurant or dish on Swiggy.
                    </p>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:sticky lg:top-8 lg:col-span-4">
        <Card id="your-pick" aria-labelledby="pick-title">
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
                            {f.dish.inStock === false && <span className="block text-xs font-medium text-destructive">Out of stock</span>}
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
              <Textarea id="note" name="note" autoComplete="off" value={note} disabled={!open || done} onChange={(e) => setNote(e.target.value)} placeholder="Less spicy, no onion…" />
            </Field>

            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Button disabled={!open || done || !items.length || soldOut.length > 0 || sending} onClick={() => setConfirm('complete')} className="flex-1">
                  {sending ? 'Sending…' : 'Complete my order'}
                </Button>
                <Button variant="outline" disabled={!open || done || sending} onClick={() => setConfirm('skip')}>Skip today</Button>
              </div>
              <FieldDescription role="status">
                {open && !done && (soldOut.length
                  ? `${soldOut.length === 1 ? 'A dish in your cart is' : `${soldOut.length} dishes in your cart are`} out of stock. Remove ${soldOut.length === 1 ? 'it' : 'them'} to complete your order.`
                  : items.length
                  ? "Your cart is saved on this device. Complete your order to put it on the board."
                  : "Add dishes, then complete your order. Your cart is saved on this device until then.")}
              </FieldDescription>
            </div>
          </CardContent>
        </Card>

        <AnimatePresence>
          {current && categories.length > 1 && (
            <motion.div
              key={current.id}
              className="max-lg:hidden"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={spring}
            >
              <Card aria-labelledby="menu-nav-title" className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle id="menu-nav-title">Menu</CardTitle>
                  <CardAction><span className="text-xs text-muted-foreground num">{categories.reduce((n, c) => n + c.dishes.length, 0)} dishes</span></CardAction>
                </CardHeader>
                <CardContent className="px-2">
                  <nav aria-label={`${current.name} menu sections`} className="no-scrollbar max-h-[min(44vh,420px)] overflow-y-auto">
                    <ul className="grid gap-0.5">
                      {categories.map((c, n) => {
                        const on = activeCat === n;
                        return (
                          <li key={c.name}>
                            <button
                              type="button"
                              onClick={() => jumpTo(n)}
                              aria-current={on ? 'location' : undefined}
                              className={cn(
                                'relative flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                on ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              {on && <motion.span layoutId="menu-nav-pill" transition={spring} className="absolute inset-0 rounded-lg bg-muted" />}
                              {on && <motion.span layoutId="menu-nav-bar" transition={spring} className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-foreground" />}
                              <span className="relative truncate">{c.name}</span>
                              <span className="relative text-xs text-muted-foreground num">{c.dishes.length}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {!open ? (
          <LockedOver key="locked" status={session.status} mine={existing} total={savedTotal} />
        ) : done ? (
          <DoneOver key="done" mine={existing!} total={savedTotal} />
        ) : null}
      </AnimatePresence>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm === 'skip' ? (
            <>
              <DialogHeader>
                <DialogTitle>Skip today's lunch?</DialogTitle>
                <DialogDescription>
                  {items.length ? 'Your cart is cleared, and you' : 'You'} won't be able to pick today unless the host reopens it for you.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>Keep picking</Button>
                <Button variant="destructive" onClick={skipToday}>Skip today</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Complete your order?</DialogTitle>
                <DialogDescription>
                  It goes on the board for the {session.cutoff} cutoff. After this you can't change it; if you need to, ask the host to reopen it.
                </DialogDescription>
              </DialogHeader>
              <ul className="grid gap-2 rounded-xl bg-muted/60 p-3">
                {items.map((l) => {
                  const f = dishById(l.dishId);
                  return f ? (
                    <li key={l.dishId} className="flex items-center gap-3 text-sm">
                      <FoodPhoto size={28} src={f.dish.photo} className="rounded-md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{l.qty > 1 && <span className="num">{l.qty} × </span>}{f.dish.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{f.restaurant.name}</span>
                      </span>
                      <span className="num">{rupees(f.dish.price * l.qty)}</span>
                    </li>
                  ) : null;
                })}
                <li className="flex justify-between border-t pt-2 text-sm font-semibold">
                  <span>You owe the host</span><span className="num">{rupees(total)}</span>
                </li>
              </ul>
              {note.trim() && <p className="text-[13px] text-muted-foreground"><span className="font-medium text-foreground">Note:</span> {note.trim()}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>Keep editing</Button>
                <Button onClick={completeOrder}>Complete my order</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>

      <AnimatePresence>
        {count > 0 && open && !done && (
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

type Draft = { items: PickLine[]; note: string };
const readDraft = (key: string): Draft | null => {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};
const writeDraft = (key: string, draft: Draft | null) => {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable: the cart lasts until the page closes */
  }
};

// Over the menus once your order is complete or you skipped: it's final, and only the host can reopen it.
function DoneOver({ mine, total }: { mine: Pick; total: number }) {
  const { state } = useStore();
  const host = personById(state.session.hostId)?.name.split(' ')[0] ?? 'the host';
  const dishes = mine.items.reduce((n, l) => n + l.qty, 0);
  return (
    <motion.div
      className="absolute inset-0 z-20 rounded-2xl bg-background/30 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sticky top-24 flex justify-center px-4 pt-12 pb-10">
        <motion.div
          role="status"
          className="grid w-full max-w-md justify-items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
        >
          <span className={cn('grid size-14 place-items-center rounded-full', mine.skipped ? 'bg-muted text-muted-foreground' : 'bg-ok-soft text-ok')} aria-hidden="true">
            <Icon name={mine.skipped ? 'close' : 'check'} size={24} />
          </span>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">{mine.skipped ? "You're skipping today" : 'Your order is complete'}</h2>
          {!mine.skipped && (
            <ul className="grid w-full gap-2 rounded-xl bg-muted/60 p-3 text-left">
              {mine.items.map((l) => {
                const f = dishById(l.dishId);
                return f ? (
                  <li key={l.dishId} className="flex items-center gap-3 text-sm">
                    <FoodPhoto size={28} src={f.dish.photo} className="rounded-md" />
                    <span className="min-w-0 flex-1 truncate">{l.qty > 1 && <span className="num">{l.qty} × </span>}{f.dish.name}</span>
                    <span className="num">{rupees(f.dish.price * l.qty)}</span>
                  </li>
                ) : null;
              })}
              <li className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>{dishes} {dishes === 1 ? 'dish' : 'dishes'}</span><span className="num">{rupees(total)}</span>
              </li>
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            It's on the board for the {state.session.cutoff} cutoff. Need a change? Ask {host} to reopen it for you.
          </p>
          <Button asChild className="w-full">
            <a href="#/">See the board</a>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function VegSwitch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-[13px] font-normal">Veg only</Label>
    </div>
  );
}

// Over the menus once picks lock: everything behind is blurred and can't be used. The lock comes
// down over the latest picks with the cutoff stamped on it (as in "How lunch runs"), then what you
// ended up with.
function LockedOver({ status, mine, total }: { status: SessionStatus; mine?: Pick; total: number }) {
  const { state } = useStore();
  const lunch = useLunch();
  const rows = [...lunch.picked]
    .sort((a, b) => (state.picks[b.id]?.updatedAt ?? '').localeCompare(state.picks[a.id]?.updatedAt ?? ''))
    .map((person) => ({
      person,
      amount: state.picks[person.id]?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0,
    }));
  const dishes = mine?.items.reduce((n, l) => n + l.qty, 0) ?? 0;
  const ordered = status !== 'locked';
  const why =
    status === 'locked'
      ? 'The host is checking the cart.'
      : status === 'placing'
        ? 'The host confirmed the cart. The Swiggy order is going out now.'
        : status === 'placed'
          ? 'Lunch is on its way. Your name is on your food.'
          : 'Lunch has arrived. Collect yours from the host.';
  return (
    <motion.div
      className="absolute inset-0 z-20 rounded-2xl bg-background/30 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sticky top-24 flex justify-center px-4 pt-12 pb-10">
        <motion.div
          key={ordered ? 'ordered' : 'locked'}
          role="status"
          aria-label={ordered ? 'Order placed' : `Picks locked at ${state.session.cutoff}`}
          className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
        >
          {ordered ? (
            <OrderedScene
              status={status}
              orderRef={state.session.orderRef}
              people={lunch.picked.length}
              dishes={lunch.dishes}
              total={lunch.total}
            />
          ) : (
            <LockScene
              large
              rows={rows}
              cutoff={state.session.cutoff}
              people={lunch.picked.length}
              dishes={lunch.dishes}
              waiting={lunch.waiting.length}
            />
          )}
          <p className="mt-4 text-sm text-muted-foreground">{why}</p>
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm">
            {mine?.skipped
              ? 'You skipped today.'
              : dishes
                ? <>Your pick: <span className="font-semibold num">{dishes} {dishes === 1 ? 'dish' : 'dishes'}, {rupees(total)}</span></>
                : "You didn't pick today."}
          </p>
          <Button asChild className="mt-4 w-full">
            <a href="#/">See the board</a>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// When the check finishes drawing in the order scene, for lining the till sound up with it.
const ORDER_CHECK = 0.6;

// Once the host has placed the order: a green check draws itself, then what went out.
function OrderedScene({ status, orderRef, people, dishes, total }: { status: SessionStatus; orderRef: string | null; people: number; dishes: number; total: number }) {
  const title = status === 'placing' ? 'Order going out' : status === 'delivered' ? 'Lunch has arrived' : 'Order placed';
  return (
    <div className="grid justify-items-center gap-3 py-4 text-center">
      <motion.div
        className="grid size-20 place-items-center rounded-full bg-ok-soft text-ok"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring, delay: 0.1 }}
      >
        <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
          <motion.circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }} />
          <motion.path d="M19 33 l9 9 l17 -19" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: 'easeOut', delay: 0.45 }} />
        </svg>
      </motion.div>
      <motion.h2 className="text-2xl font-semibold tracking-[-0.03em]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        {title}
      </motion.h2>
      {orderRef && (
        <motion.span initial={{ scale: 1.6, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: -3 }} transition={{ ...spring, delay: 0.75 }}
          className="inline-block rounded-lg border-2 border-ok px-3 py-1 text-sm font-semibold text-ok num">
          Swiggy {orderRef}
        </motion.span>
      )}
      <motion.p className="text-[13px] text-muted-foreground num" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }}>
        {people} {people === 1 ? 'person' : 'people'} · {dishes} {dishes === 1 ? 'dish' : 'dishes'} · {rupees(total)}
      </motion.p>
    </div>
  );
}
