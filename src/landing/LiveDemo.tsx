import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PickLine } from '@/model';
import { ME_ID, PEOPLE } from '@/data/demo';
import type { Dish } from '@/model';
import { allDishes, dishById, restaurantById } from '@/data/catalog';
import { offeredRestaurants, summarise, useStore } from '@/store';
import { useSignIn } from '@/auth';
import { FoodPhoto, Icon, LiveDot, Mark, rupees, VegMark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList } from '@/components/ui/segmented';
import { AnimatedNumber } from '@/components/ui/number';
import { originOf, useCelebrate } from '@/components/celebrate';
import { useFlyToCart } from '@/components/fly';
import { cn, spring } from '@/lib/cn';
import { BowlScrollbar } from '@/components/bowl-scroll';

const amountOf = (items: PickLine[]) => items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);

// The landing page's live board, in one window: today's menus on the left, the one Swiggy cart on
// the right. The team's picks keep arriving (a ticker in the header, the cart counting up); add a
// dish and it flies into its restaurant's row in the cart, and "Put it on the board" saves it for real,
// right here: the pick-saved moment and its ding play, and the page stays where it is.
// Placed by its section (the board and the host's tiles are one section), so it brings no outer margins.
export default function LiveDemo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cartList = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.15'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, 0]);
  const active = useInView(ref, { margin: '0px 0px -20% 0px' });

  const { state, dispatch } = useStore();
  const celebrate = useCelebrate();
  const { fly, layer } = useFlyToCart();
  const { shown, latest } = useLiveFeed(active);
  const restaurants = offeredRestaurants(state.session).filter((r) => !!r);
  const [tab, setTab] = useState(restaurants[0]?.id ?? '');
  const [tray, setTray] = useState<PickLine[]>([]);
  const open = state.session.status === 'open';

  // The cart is the team's picks so far plus your tray, which stands in for your own pick.
  const picks = Object.fromEntries(shown.map((p) => [p.id, state.picks[p.id]]));
  if (tray.length) picks[ME_ID] = { items: tray, note: '', skipped: false, updatedAt: 'now' };
  const cart = summarise(state.session, picks);
  const count = tray.reduce((n, l) => n + l.qty, 0);
  const total = amountOf(tray);

  const add = (d: Dish, restaurantId: string, el: HTMLElement) => {
    setTray((cur) => {
      const has = cur.find((l) => l.dishId === d.id);
      return has ? cur.map((l) => (l.dishId === d.id ? { ...l, qty: l.qty + 1 } : l)) : [...cur, { dishId: d.id, qty: 1 }];
    });
    const slot = document.querySelector(`[data-cart-id="${restaurantId}"]`) ?? document.querySelector('[data-cart-id="end"]');
    fly(el, [slot], d.photo);
  };
  const less = (id: string) =>
    setTray((cur) => cur.flatMap((l) => (l.dishId !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [])));

  // What was last put on the board, so the button can say when the tray already matches it.
  const [saved, setSaved] = useState('');
  const trayKey = tray.map((l) => `${l.dishId}×${l.qty}`).join(',');
  const onBoard = !!saved && saved === trayKey;

  const putOnBoard = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!open || !tray.length) return;
    dispatch({ type: 'savePick', userId: ME_ID, items: tray, note: '' });
    setSaved(trayKey);
    celebrate({ ...originOf(e), title: 'Pick saved', sub: `${count} ${count === 1 ? 'dish' : 'dishes'}, ${rupees(total)}. You're on today's board.`, sound: 'saved' });
  };
  // The real board: sign in with Google (the tray above is only a taste of it).
  const signIn = useSignIn();
  const openBoard = () => void signIn();

  return (
    <div id="pick" className={cn('scroll-mt-24 [perspective:1600px]', className)}>
      <motion.div
        ref={ref}
        style={{ rotateX, scale, y, transformOrigin: '50% 0%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.7 }}
      >
        <Card data-ui className="gap-0 overflow-hidden rounded-3xl py-0 shadow-modal" aria-label="Today's food party: pick a dish and watch it land in the team's cart">
          <div className="flex items-center gap-3 border-b px-5 py-3.5">
            <Mark size={22} />
            <span className="text-sm font-semibold">Today's food party</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">{state.org.team}</span>
            <div className="relative ml-4 hidden h-5 min-w-0 flex-1 overflow-hidden md:block" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                {latest && (
                  <motion.span
                    key={latest.id}
                    className="absolute inset-0 truncate text-[13px] text-muted-foreground"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -18, opacity: 0 }}
                    transition={spring}
                  >
                    <span className="font-medium text-foreground">{latest.name}</span> picked {latest.dish} · {latest.at}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="ml-auto flex flex-none items-center gap-2 text-[13px] text-body">
              <LiveDot /> <span className="num">{cart.picked.length} of {cart.team}</span> · closes {state.session.cutoff}
            </span>
          </div>

          <div className="grid lg:h-[580px] lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="no-scrollbar min-h-0 min-w-0 overflow-y-auto p-5 sm:p-7">
              <Tabs value={tab} onValueChange={setTab} className="gap-0">
                <PillTabsList
                  label="Today's restaurants"
                  value={tab}
                  className="flex w-full"
                  options={restaurants.map((r) => ({ value: r.id, label: <><FoodPhoto size={20} src={r.photo} className="rounded-full" />{r.name}</> }))}
                />
                {restaurants.map((r) => {
                  const dishes = allDishes(r).slice(0, 6);
                  const more = allDishes(r).length - dishes.length;
                  return (
                    <TabsContent key={r.id} value={r.id} className="mt-5">
                      <p className="mb-4 text-[13px] text-muted-foreground">
                        {[r.cuisines?.join(', '), r.rating && `${r.rating} rating`, r.eta, r.distanceKm && `${r.distanceKm} km away`].filter(Boolean).join(' · ')}
                      </p>
                      <motion.ul
                        key={r.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        {dishes.map((d) => (
                          <li key={d.id} className="group flex items-center gap-3 rounded-xl bg-muted/60 p-2.5 transition-colors duration-200 hover:bg-muted">
                            <span className="size-12 flex-none overflow-hidden rounded-lg">
                              <FoodPhoto size={48} src={d.photo} className="rounded-none transition-transform duration-500 ease-out-expo group-hover:scale-110" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-sm font-medium"><VegMark veg={d.veg} /><span className="truncate">{d.name}</span></div>
                              <div className="mt-0.5 text-[13px] text-muted-foreground num">{rupees(d.price)}</div>
                            </div>
                            <Button size="sm" variant="outline" aria-label={`Add ${d.name}`} onClick={(e) => add(d, r.id, e.currentTarget)}>Add</Button>
                          </li>
                        ))}
                      </motion.ul>
                      {more > 0 && <p className="mt-3 text-[13px] text-muted-foreground">And {more} more from {r.name} inside the app.</p>}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>

            {/* The one cart: every restaurant with the team's dishes, and yours inside its restaurant. */}
            <div className="flex min-h-0 flex-col bg-muted/50 p-5 sm:p-7">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">One Swiggy cart</span>
                <span className="text-[13px] text-muted-foreground num">
                  {cart.cart.length} {cart.cart.length === 1 ? 'restaurant' : 'restaurants'}{count > 0 && ` · ${count} ${count === 1 ? 'dish' : 'dishes'} yours`}
                </span>
              </div>
              <div className="relative -mx-1 mt-3 flex min-h-0 flex-1 flex-col max-lg:max-h-[360px]">
                <ul ref={cartList} className="no-scrollbar grid min-h-0 flex-1 content-start gap-2 overflow-y-auto p-1 data-[overflows=true]:pr-7" aria-live="polite">
                  <AnimatePresence initial={false}>
                    {cart.cart.map((g) => {
                      const mine = tray.filter((l) => dishById(l.dishId)?.restaurant.id === g.restaurantId);
                      return (
                        <motion.li
                          layout
                          key={g.restaurantId}
                          data-cart-id={g.restaurantId}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={spring}
                          className={cn('rounded-xl bg-card px-3 py-2.5 shadow-card transition-shadow duration-300', mine.length > 0 && 'shadow-[0_0_0_1.5px_var(--color-ink)]')}
                        >
                          <div className="flex items-center gap-3">
                            <FoodPhoto size={28} src={restaurantById(g.restaurantId)?.photo} className="rounded-md" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.name}</span>
                            <span className="text-[13px] text-muted-foreground num">{g.dishes} ×</span>
                            <motion.span key={g.total} initial={{ opacity: 0.3, y: -4 }} animate={{ opacity: 1, y: 0 }} className="w-16 text-right text-sm num">
                              {rupees(g.total)}
                            </motion.span>
                          </div>
                          <AnimatePresence initial={false}>
                            {mine.length > 0 && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                                <ul className="mt-2 grid gap-1 border-t border-dashed pt-2" aria-label={`Your dishes from ${g.name}`}>
                                  {mine.map((l) => {
                                    const f = dishById(l.dishId)!;
                                    return (
                                      <li key={l.dishId} className="flex items-center gap-2.5 text-[13px]">
                                        <Badge variant="info" className="px-1.5">You</Badge>
                                        <span className="min-w-0 flex-1 truncate">{l.qty > 1 && <span className="num">{l.qty} × </span>}{f.dish.name}</span>
                                        <span className="text-muted-foreground num">{rupees(f.dish.price * l.qty)}</span>
                                        <Button variant="ghost" size="icon-sm" className="-my-1 text-muted-foreground" aria-label={`Remove one ${f.dish.name}`} onClick={() => less(l.dishId)}>−</Button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                  {cart.cart.length === 0 && (
                    <li className="rounded-xl border border-dashed border-input px-4 py-5 text-center text-[13px] text-muted-foreground">
                      Nobody has picked yet. Add a dish and the cart starts with yours.
                    </li>
                  )}
                  <li data-cart-id="end" aria-hidden="true" className="h-0" />
                </ul>
                <BowlScrollbar target={cartList} />
              </div>

              <div className="mt-4 flex-none border-t pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-body">Items total, {cart.dishes} dishes</span>
                  <span className="text-lg font-semibold tracking-[-0.02em]"><AnimatedNumber value={cart.total} format={(n) => rupees(Math.round(n))} /></span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[13px] text-body">{tray.length ? 'You owe the host' : 'Add a dish: it lands in its restaurant above.'}</span>
                  <span className="text-sm font-semibold num">{rupees(total)}</span>
                </div>
                <Button size="lg" className="mt-4 w-full" disabled={!open || !tray.length || onBoard} onClick={putOnBoard}>
                  {onBoard ? <><Icon name="check" size={16} /> On the board</> : saved ? 'Update my pick' : 'Put it on the board'}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {!open ? 'Picks are closed for the demo food party. ' : saved ? `Saved for the ${state.session.cutoff} cutoff. ` : `Saves your pick for the ${state.session.cutoff} cutoff. `}
                  <button type="button" onClick={openBoard} className="font-medium text-foreground underline-offset-2 hover:underline">Open the board</button>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
      {layer}
    </div>
  );
}

// Replays the last eight picks of today's demo board in the order they came in.
function useLiveFeed(active: boolean) {
  const { state } = useStore();
  const reduce = useReducedMotion();
  const order = useMemo(
    () =>
      PEOPLE.filter((p) => p.id !== ME_ID && state.picks[p.id]?.items.length && !state.picks[p.id].skipped).sort((a, b) =>
        state.picks[a.id].updatedAt.localeCompare(state.picks[b.id].updatedAt),
      ),
    [state.picks],
  );
  const start = Math.max(0, order.length - 8);
  const [n, setN] = useState(reduce ? order.length : start);

  useEffect(() => {
    if (reduce) return setN(order.length);
    if (!active || n >= order.length) return;
    const t = window.setTimeout(() => setN((x) => x + 1), n === start ? 1600 : 2600);
    return () => clearTimeout(t);
  }, [active, n, order.length, start, reduce]);

  const shown = order.slice(0, Math.min(n, order.length));
  const last = shown.at(-1);
  const pick = last && state.picks[last.id];
  const dish = pick && dishById(pick.items[0].dishId);
  return {
    shown,
    latest: last && pick && dish ? { id: last.id, name: last.name.split(' ')[0], dish: dish.dish.name, at: pick.updatedAt } : null,
  };
}
