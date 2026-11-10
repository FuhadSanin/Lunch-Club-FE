import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { restaurantById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { FoodPhoto, Icon, rupees } from '@/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NextStep, StepPage } from '@/components/steps';
import { UnlockPicks } from '@/components/unlock';
import { originOf, useCelebrate } from '@/components/celebrate';
import { ReviewProgress } from '../ReviewCard';
import { SwiggyOrders } from '../SwiggyOrders';
import { cn, spring } from '@/lib/cn';

// Step 4: the host confirms, and the Swiggy bot adds each restaurant's dishes to one cart and checks
// out. Each restaurant shows "Adding to cart…", then "Added to cart", as the bot gets to it.
//
// On the live API there is no bot: Swiggy's website refuses automated browsers, so the host checks out
// each restaurant in Swiggy (the order card lists its link, dishes and cooking note), ticks it here and
// enters the order number. Only the demo runs a simulated bot.
export default function PlaceOrder() {
  const { state, dispatch, live } = useStore();
  const lunch = useLunch();
  const celebrate = useCelebrate();
  const [confirming, setConfirming] = useState(false);
  const timers = useRef<number[]>([]);
  const { session } = state;
  const st = session.status;
  const added = (id: string) => !!session.checked?.[`r:${id}`];
  const addedCount = lunch.cart.filter((g) => added(g.restaurantId)).length;
  const working = st === 'placing';
  const nextUp = working ? lunch.cart.find((g) => !added(g.restaurantId))?.restaurantId : undefined;

  // After the cart: the bot checks the total, then checks out. 'idle' until the cart is full.
  const [phase, setPhase] = useState<'idle' | 'checking' | 'paying'>('idle');
  const origin = useRef({ x: innerWidth / 2, y: innerHeight / 2 });
  const summary = `${lunch.dishes} dishes from ${lunch.cart.length} restaurants, ${rupees(lunch.total)}, cash on delivery.`;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The order-placed moment plays only once the bot has filled the cart and checked out, never before.
  const was = useRef(st);
  useEffect(() => {
    if (was.current === 'placing' && st === 'placed') {
      setPhase('idle');
      celebrate({ ...origin.current, title: 'Order placed', sub: summary, icon: 'cart', sound: 'money' });
    }
    was.current = st;
  }, [st, celebrate, summary]);

  const place = (e: React.MouseEvent<HTMLButtonElement>) => {
    origin.current = originOf(e);
    setConfirming(false);
    if (live) {
      // The API confirms the cart; the restaurants then go in one by one (by the bot, or ticked here).
      void Promise.resolve(dispatch({ type: 'startPlacing' })).catch(() => undefined);
      return;
    }
    // The demo's bot: opens Swiggy, adds one restaurant at a time, checks the total, checks out.
    dispatch({ type: 'startPlacing' });
    const open = 900;
    lunch.cart.forEach((g, i) => {
      timers.current.push(window.setTimeout(() => dispatch({ type: 'check', key: `r:${g.restaurantId}`, done: true }), open + (i + 1) * 1200));
    });
    const filled = open + lunch.cart.length * 1200;
    timers.current.push(window.setTimeout(() => setPhase('checking'), filled + 300));
    timers.current.push(window.setTimeout(() => setPhase('paying'), filled + 1300));
    timers.current.push(window.setTimeout(() => dispatch({ type: 'placed', orderRef: '#1842209731 (demo)' }), filled + 2400));
  };

  // The bot's progress as a list anyone can follow, and one overall percentage.
  const allAdded = lunch.cart.length > 0 && addedCount === lunch.cart.length;
  const placedNow = st === 'placed' || st === 'delivered';
  const activity: { text: string; state: 'done' | 'now' | 'todo' }[] =
    st === 'locked'
      ? []
      : [
          { text: 'Opened Swiggy on your account', state: 'done' },
          ...lunch.cart.map((g) => ({
            text: `Adding ${g.name}: ${g.dishes} ${g.dishes === 1 ? 'dish' : 'dishes'}`,
            state: (added(g.restaurantId) ? 'done' : g.restaurantId === nextUp ? 'now' : 'todo') as 'done' | 'now' | 'todo',
          })),
          { text: `Checking the cart total: ${rupees(lunch.total)}`, state: placedNow || phase === 'paying' ? 'done' : phase === 'checking' || (live && allAdded) ? 'now' : 'todo' },
          { text: 'Placing the order, cash on delivery', state: placedNow ? 'done' : phase === 'paying' ? 'now' : 'todo' },
        ];
  const doneSteps = activity.filter((a) => a.state === 'done').length;
  const percent = activity.length ? Math.round((doneSteps / activity.length) * 100) : 0;
  const nowText = activity.find((a) => a.state === 'now')?.text;

  return (
    <StepPage
      id="order"
      sub={live ? 'Check out each restaurant in Swiggy yourself, then enter its order number here.' : undefined}
      actions={st === 'locked' && (
        <>
          <UnlockPicks variant="ghost" />
          <Button disabled={!lunch.dishes} onClick={() => setConfirming(true)}>Confirm and place order</Button>
        </>
      )}
    >
      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7" aria-labelledby="bot-h">
          <CardHeader>
            <CardTitle id="bot-h">Swiggy cart</CardTitle>
            <CardDescription>
              {live
                ? st === 'locked'
                  ? "Confirm the cart, then check out in Swiggy: each restaurant's link, dishes and cooking note are listed for you."
                  : 'Swiggy takes one restaurant per cart. Open it in Swiggy, add its dishes, paste the cooking note and place the order, then tick it here.'
                : st === 'locked'
                  ? 'Confirm, and the Swiggy bot adds every restaurant to one cart on your account, checks the total and pays cash on delivery.'
                  : 'The bot is adding each restaurant to the cart.'}
            </CardDescription>
            <CardAction>
              <Badge variant={st === 'locked' ? 'secondary' : working ? 'warning' : 'success'}>
                {st === 'locked' ? 'Waiting' : working ? (live ? 'Your turn' : 'Working') : 'Placed'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {st !== 'locked' && <ReviewProgress done={addedCount} of={lunch.cart.length} label="restaurants added to the cart" />}
            <ul className="grid gap-2">
              {lunch.cart.map((g) => {
                const done = added(g.restaurantId);
                const busy = !live && working && g.restaurantId === nextUp;
                return (
                  <motion.li
                    key={g.restaurantId}
                    layout
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300', done ? 'bg-ok-soft/70' : 'shadow-ring')}
                  >
                    <FoodPhoto size={36} src={restaurantById(g.restaurantId)?.photo} className="rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-medium', done && 'text-ok')}>{g.name}</span>
                      <span className="block text-[13px] text-muted-foreground num">{g.dishes} {g.dishes === 1 ? 'dish' : 'dishes'} · {rupees(g.total)}</span>
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      {done ? (
                        <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="flex items-center gap-1.5 text-[13px] font-medium text-ok">
                          <Icon name="check" size={14} /> Added to cart
                        </motion.span>
                      ) : busy ? (
                        <motion.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                          <motion.span className="size-3.5 rounded-full border-2 border-input border-t-foreground" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                          Adding to cart…
                        </motion.span>
                      ) : live && st !== 'locked' ? (
                        <Button key="tick" size="sm" variant="outline" onClick={() => dispatch({ type: 'check', key: `r:${g.restaurantId}`, done: true })}>
                          Added to cart
                        </Button>
                      ) : (
                        <span key="wait" className="text-[13px] text-muted-foreground">Waiting</span>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t pt-4 text-sm font-semibold">
              <span>Items total, {lunch.dishes} dishes</span>
              <span className="num">{rupees(lunch.total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-5">
          {st !== 'locked' && !live && (
            <Card aria-labelledby="progress-h">
              <CardHeader>
                <CardTitle id="progress-h">Bot progress</CardTitle>
                <CardAction><span className={cn('text-sm font-semibold num', percent === 100 && 'text-ok')}>{percent}%</span></CardAction>
              </CardHeader>
              <CardContent>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Order progress">
                  <motion.div className="h-full origin-left rounded-full bg-ok" initial={false} animate={{ scaleX: percent / 100 }} transition={spring} />
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground" aria-live="polite">
                  {placedNow ? 'Done. The order is placed.' : nowText ? `Now: ${nowText.replace(/^Adding/, 'adding').replace(/^Checking/, 'checking').replace(/^Placing/, 'placing').replace(/^Opened/, 'opening')}` : live ? 'Tick each restaurant as you add it in the Swiggy app.' : 'Starting…'}
                </p>
                <ol className="mt-4 grid gap-2.5">
                  {activity.map((a) => (
                    <li key={a.text} className={cn('flex items-center gap-2.5 text-sm', a.state === 'todo' && 'text-muted-foreground')}>
                      {a.state === 'done' ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="grid size-[18px] flex-none place-items-center rounded-full bg-ok text-white"><Icon name="check" size={11} /></motion.span>
                      ) : a.state === 'now' ? (
                        <motion.span className="size-[18px] flex-none rounded-full border-2 border-input border-t-foreground" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                      ) : (
                        <span className="size-[18px] flex-none rounded-full shadow-[0_0_0_1.5px_var(--color-line-strong)]" />
                      )}
                      <span className={cn(a.state === 'now' && 'font-medium')}>{a.text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
          {live && st !== 'locked' && <SwiggyOrders orders={live.orders} />}
          {!live && session.orderRef && (
            <Card>
              <CardHeader><CardTitle>Swiggy order</CardTitle></CardHeader>
              <CardContent className="text-sm">Order <span className="font-mono">{session.orderRef}</span>, cash on delivery to {session.address}.</CardContent>
            </Card>
          )}
          {st === 'locked' && (
            <Card>
              <CardContent className="grid gap-3 py-6 text-center text-sm">
                <p className="text-muted-foreground">Delivered to {session.address}. Swiggy adds its delivery fee and taxes.</p>
                <Button size="lg" disabled={!lunch.dishes} onClick={() => setConfirming(true)}>Confirm and place order</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {(st === 'placed' || st === 'delivered') && <NextStep to="collect">The order is placed. Next, collect the food as each restaurant arrives.</NextStep>}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place one Swiggy order for {rupees(lunch.total)}?</DialogTitle>
            <DialogDescription>
              {live
                ? `This locks in ${lunch.dishes} dishes from ${lunch.cart.length} restaurants for delivery to ${session.address}. You then place each restaurant's order in Swiggy, where it adds its delivery fee and taxes.`
                : `The bot orders ${lunch.dishes} dishes from ${lunch.cart.length} restaurants on your Swiggy account, cash on delivery, to ${session.address}. Swiggy adds its delivery fee and taxes. Orders can't be cancelled from Lunch Board.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Keep checking</Button>
            <Button onClick={place}>{live ? 'Confirm the cart' : 'Place the order'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepPage>
  );
}
