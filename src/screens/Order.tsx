import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { personById } from '@/data/demo';
import { dishById, restaurantById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { Avatar, FoodPhoto, firstName, Icon, rupees, VegMark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageTitle } from '@/components/PageTitle';
import { originOf, useCelebrate } from '@/components/celebrate';
import { cn, easeOut, spring } from '@/lib/cn';
import OrderSteps from './OrderSteps';

// The order bot is simulated in this build: these are the steps it reports from the Swiggy website.
const BOT_SCRIPT = (restaurants: number, dishes: number, total: string) => [
  { after: 600, text: "Opened Swiggy on the host's account" },
  { after: 1400, text: `Added ${dishes} dishes from ${restaurants} restaurants to one cart` },
  { after: 2200, text: `Checked the cart: items ${total}, matches the board` },
  { after: 3000, text: 'Checked recent orders first: no order placed yet' },
  { after: 3800, text: 'Placed the order, cash on delivery' },
];

export default function OrderScreen() {
  const { state, dispatch } = useStore();
  const lunch = useLunch();
  const { session, picks } = state;
  const [confirming, setConfirming] = useState(false);
  const celebrate = useCelebrate();
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const place = (e: React.MouseEvent<HTMLButtonElement>) => {
    const from = originOf(e);
    const summary = `${lunch.dishes} dishes from ${lunch.cart.length} restaurants, ${rupees(lunch.total)}, cash on delivery.`;
    setConfirming(false);
    dispatch({ type: 'startPlacing' });
    const script = BOT_SCRIPT(lunch.cart.length, lunch.dishes, rupees(lunch.total));
    script.forEach((s, i) => {
      timers.current.push(
        window.setTimeout(() => {
          dispatch({ type: 'botStep', step: { at: i < 3 ? '12:31' : '12:32', text: s.text } });
          if (i === script.length - 1) {
            dispatch({ type: 'placed', orderRef: '#1842209731 (demo)' });
            celebrate({ ...from, title: 'Order placed', sub: summary });
          }
        }, s.after),
      );
    });
  };

  const handed = Object.values(session.handedOut).filter(Boolean).length;
  const st = session.status;

  return (
    <>
      <PageTitle
        title="Review and order"
        sub={
          <>
            <strong className="font-semibold text-foreground">{lunch.cart.length} restaurants, {lunch.dishes} dishes, {rupees(lunch.total)}</strong> for {lunch.picked.length} people.{' '}
            All in one Swiggy order.
          </>
        }
        actions={
          <>
            {st === 'open' && <Button onClick={() => dispatch({ type: 'lock' })}><Icon name="lock" size={14} /> Lock picks now</Button>}
            {st === 'locked' && (
              <>
                <Button variant="outline" onClick={() => dispatch({ type: 'reopen' })}>Reopen picks</Button>
                <Button disabled={!lunch.dishes} onClick={() => setConfirming(true)}>Confirm and place order</Button>
              </>
            )}
            {st === 'placed' && <Button onClick={() => dispatch({ type: 'delivered' })}>Mark as arrived</Button>}
          </>
        }
      />

      <AnimatePresence initial={false}>
        {st === 'open' && lunch.waiting.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mb-4 flex gap-2.5 rounded-xl bg-warn-soft px-4 py-3 text-[13px] leading-5 text-warn">
              <Icon name="clock" className="mt-0.5" />
              <span>{lunch.waiting.length} people have not picked yet: {lunch.waiting.map((p) => p.name.split(' ')[0]).join(', ')}. Locking now leaves them out.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8" aria-labelledby="cart-h">
          <CardHeader>
            <CardTitle id="cart-h">The cart, by restaurant</CardTitle>
            <CardDescription>Swiggy adds its delivery fee and taxes at checkout. Each person's name goes in the restaurant note so the food comes labelled.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="max-sm:hidden">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Dish</TableHead>
                  <TableHead>For</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              {lunch.cart.map((g) => (
                <TableBody key={g.restaurantId}>
                  <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                    <TableCell colSpan={2}>
                      <span className="flex items-center gap-2.5"><FoodPhoto size={24} src={restaurantById(g.restaurantId)?.photo} className="rounded-md" />{g.name}</span>
                    </TableCell>
                    <TableCell className="text-right num">{g.dishes}</TableCell>
                    <TableCell className="text-right num">{rupees(g.total)}</TableCell>
                  </TableRow>
                  {g.lines.map((l) => (
                    <TableRow key={l.dishId}>
                      <TableCell className="whitespace-normal">
                        <div className="flex items-center gap-2"><VegMark veg={l.veg} /> {l.name}</div>
                        <div className="mt-0.5 text-[13px] text-muted-foreground">{rupees(l.price)} each<span className="sm:hidden"> · {l.people.map(firstName).join(', ')}</span></div>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground max-sm:hidden">{l.people.map(firstName).join(', ')}</TableCell>
                      <TableCell className="text-right num">{l.qty}</TableCell>
                      <TableCell className="text-right num">{rupees(l.qty * l.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ))}
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={2}>Items total</TableCell>
                  <TableCell className="text-right num">{lunch.dishes}</TableCell>
                  <TableCell className="text-right num">{rupees(lunch.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:sticky lg:top-8 lg:col-span-4">
          <Card aria-labelledby="steps-h">
            <CardHeader><CardTitle id="steps-h">Order</CardTitle></CardHeader>
            <CardContent><OrderSteps /></CardContent>
          </Card>
          <Card aria-labelledby="bot-h">
            <CardHeader>
              <CardTitle id="bot-h">Order bot</CardTitle>
              <CardAction>
                <Badge variant={st === 'placing' ? 'warning' : st === 'placed' || st === 'delivered' ? 'success' : 'secondary'}>
                  {st === 'placing' ? 'Working' : st === 'placed' || st === 'delivered' ? 'Done' : 'Waiting'}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              {session.bot.length ? (
                <ol className="grid gap-3" aria-live="polite">
                  <AnimatePresence initial={false}>
                    {session.bot.map((b, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        transition={{ duration: 0.45, ease: easeOut }}
                        className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2.5 text-sm"
                      >
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.1 }} className="mt-0.5 grid size-[18px] place-items-center rounded-full bg-ok text-on-ink">
                          <Icon name="check" size={11} />
                        </motion.span>
                        <span>{b.text}</span>
                        <time className="text-[13px] text-muted-foreground num">{b.at}</time>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {st === 'placing' && (
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <motion.span className="size-[18px] rounded-full border-2 border-input border-t-foreground" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                      Working…
                    </li>
                  )}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Starts when you confirm. It orders on your Swiggy account, checks the total against the board, and never places the same order twice.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {(st === 'placed' || st === 'delivered') && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
            <Card className="mt-4" aria-labelledby="hand-h">
              <CardHeader>
                <CardTitle id="hand-h">Hand out</CardTitle>
                <CardAction><Badge variant={handed === lunch.picked.length ? 'success' : 'secondary'}>{handed}/{lunch.picked.length}</Badge></CardAction>
              </CardHeader>
              <CardContent>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <motion.div className="h-full origin-left rounded-full bg-primary" animate={{ scaleX: lunch.picked.length ? handed / lunch.picked.length : 0 }} transition={spring} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {lunch.picked.map((p) => {
                    const owed = picks[p.id].items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);
                    const done = !!session.handedOut[p.id];
                    const id = `hand-${p.id}`;
                    return (
                      <label key={p.id} htmlFor={id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200', done ? 'bg-muted/60' : 'shadow-ring hover:bg-muted/60')}>
                        <Avatar person={personById(p.id)!} />
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-sm font-medium transition-colors', done && 'text-muted-foreground line-through')}>{p.name}</span>
                          <span className="block text-[13px] text-muted-foreground num">Owes {rupees(owed)}</span>
                        </span>
                        <Checkbox id={id} className="size-5" checked={done} onCheckedChange={(v) => dispatch({ type: 'handOut', userId: p.id, done: v === true })} aria-label={`Handed out to ${p.name}`} />
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place one Swiggy order for {rupees(lunch.total)}?</DialogTitle>
            <DialogDescription>
              The bot orders {lunch.dishes} dishes from {lunch.cart.length} restaurants on your Swiggy account, cash on delivery, to {session.address}. Swiggy adds its delivery fee and taxes. Orders can't be cancelled from Lunch Board.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Keep checking</Button>
            <Button onClick={place}>Place the order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
