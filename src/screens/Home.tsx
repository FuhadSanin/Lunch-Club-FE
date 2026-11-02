import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { DEMO_NOW, ME_ID, PEOPLE, personById } from '@/data/demo';
import { dishById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { Avatar, FoodPhoto, Icon, LiveDot, rupees } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Segmented } from '@/components/ui/segmented';
import { AnimatedNumber } from '@/components/ui/number';
import { PageTitle } from '@/components/PageTitle';
import { spring } from '@/lib/cn';
import OrderSteps from './OrderSteps';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

type Filter = 'all' | 'picked' | 'waiting' | 'skipped';

export default function Home() {
  const { state } = useStore();
  const lunch = useLunch();
  const { session, picks, org } = state;
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  const minsLeft = toMin(session.cutoff) - toMin(DEMO_NOW);
  const isOpen = session.status === 'open';
  const hour = Number(DEMO_NOW.slice(0, 2));
  const hello = hour < 12 ? 'Morning' : 'Afternoon';

  const statusLine = isOpen
    ? `${lunch.picked.length} of ${lunch.team} have picked. Picks close at ${session.cutoff}, ${minsLeft} min from now.`
    : session.status === 'locked'
      ? `Picks are locked. ${lunch.picked.length} people, ${lunch.dishes} dishes, waiting for the host to confirm.`
      : session.status === 'placing'
        ? 'The order bot is placing the order on Swiggy now.'
        : session.status === 'placed'
          ? `Ordered on Swiggy at ${session.bot.at(-1)?.at ?? DEMO_NOW}. Food is on its way.`
          : 'Lunch has arrived. The host is handing it out.';

  const rows = useMemo(() => {
    const status = (id: string): Filter =>
      picks[id]?.skipped ? 'skipped' : picks[id]?.items.length ? 'picked' : 'waiting';
    return PEOPLE.filter((p) => filter === 'all' || status(p.id) === filter)
      .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => (a.id === ME_ID ? -1 : b.id === ME_ID ? 1 : 0));
  }, [picks, filter, q]);
  const visible = showAll ? rows : rows.slice(0, 8);

  const mine = picks[ME_ID];
  const mineTotal = mine?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0;

  const counts: Record<Filter, number> = {
    all: lunch.team,
    picked: lunch.picked.length,
    waiting: lunch.waiting.length,
    skipped: lunch.skipped.length,
  };

  const stateWord = isOpen ? session.cutoff : session.status === 'locked' ? 'Locked' : session.status === 'placing' ? 'Placing' : session.status === 'placed' ? 'On its way' : 'Arrived';

  return (
    <>
      <PageTitle
        large
        title={<>{hello}, {org.team}.</>}
        sub={statusLine}
        actions={
          <>
            {isOpen && (
              <Button asChild>
                <a href="#/pick">{mine && !mine.skipped && mine.items.length ? 'Change my pick' : 'Pick my lunch'}</a>
              </Button>
            )}
            {state.role === 'host' && session.status !== 'delivered' && (
              <Button asChild variant="outline">
                <a href="#/order">Review and order</a>
              </Button>
            )}
          </>
        }
      />

      <Card className="grid grid-cols-2 gap-px bg-line py-0 md:grid-cols-4" aria-label="Today in numbers">
        {[
          { label: 'Picked', value: <><AnimatedNumber value={lunch.picked.length} /><span className="text-mute">/{lunch.team}</span></>, caption: `${lunch.waiting.length} still to pick, ${lunch.skipped.length} skipping` },
          { label: 'Restaurants in the cart', value: <AnimatedNumber value={lunch.cart.length} />, caption: 'All in one Swiggy cart' },
          { label: 'Items total', value: <AnimatedNumber value={lunch.total} format={(n) => rupees(Math.abs(n - lunch.total) < 0.01 ? lunch.total : Math.round(n))} />, caption: `${lunch.dishes} dishes, before Swiggy's fees` },
          { label: isOpen ? 'Picks close' : 'Order', value: <span className="num">{stateWord}</span>, caption: isOpen ? `in ${minsLeft} min` : session.orderRef ? `Swiggy order ${session.orderRef}` : 'Host confirms next' },
        ].map((k) => (
          <div key={k.label} className="flex min-h-32 flex-col bg-card p-5">
            <span className="text-[13px] text-muted-foreground">{k.label}</span>
            <span className="mt-2 text-[28px] leading-9 font-medium tracking-[-0.03em]">{k.value}</span>
            <span className="mt-auto pt-2 text-[13px] text-muted-foreground">{k.caption}</span>
          </div>
        ))}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-8">
          <Card aria-labelledby="board-title">
            <CardHeader className="flex flex-wrap items-center gap-3">
              <CardTitle id="board-title" className="flex items-center gap-2.5">
                Live board
                {isOpen && <span className="flex items-center gap-1.5 text-xs font-normal text-ok"><LiveDot /> Live</span>}
              </CardTitle>
              <label className="relative ml-auto w-full sm:w-56">
                <span className="sr-only">Find a person</span>
                <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  name="person"
                  autoComplete="off"
                  placeholder="Find a person…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 rounded-full pl-8"
                />
              </label>
            </CardHeader>
            <CardContent>
              <Segmented
                label="Show"
                className="mb-3"
                value={filter}
                onChange={(f) => { setFilter(f); setShowAll(false); }}
                options={(['all', 'picked', 'waiting', 'skipped'] as Filter[]).map((f) => ({
                  value: f,
                  label: <>{f === 'all' ? 'Everyone' : f === 'picked' ? 'Picked' : f === 'waiting' ? 'To pick' : 'Skipping'} <span className="num text-muted-foreground">{counts[f]}</span></>,
                }))}
              />
              <ul className="grid">
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((p) => {
                    const pk = picks[p.id];
                    const lines = pk?.items.map((l) => dishById(l.dishId)).filter((x) => !!x) ?? [];
                    const amount = pk?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0;
                    return (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={spring}
                        className="-mx-2 flex min-h-[60px] items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-muted/60"
                      >
                        <Avatar person={p} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.name}{p.id === ME_ID && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
                          <div className="truncate text-[13px] text-muted-foreground">
                            {pk?.skipped
                              ? 'Skipping today'
                              : lines.length
                                ? `${lines.map((x) => x!.dish.name).join(', ')} · ${lines[0]!.restaurant.name}`
                                : 'Has not picked yet'}
                            {pk?.note ? ` · “${pk.note}”` : ''}
                          </div>
                        </div>
                        <div className="text-right text-sm num">
                          {lines.length ? <div>{rupees(amount)}</div> : <div className="text-muted-foreground">—</div>}
                          <div className="text-xs text-muted-foreground">{pk ? pk.updatedAt : ''}</div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {rows.length === 0 && <li className="rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">Nobody matches “{q}”.</li>}
              </ul>
              {rows.length > 8 && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show fewer' : `Show all ${rows.length}`}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card aria-labelledby="order-title">
            <CardHeader>
              <CardTitle id="order-title">Order</CardTitle>
              {state.role === 'host' && (
                <CardAction>
                  <Button asChild variant="link" size="sm" className="h-auto px-0">
                    <a href="#/order">Open</a>
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <OrderSteps />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-4 lg:col-span-4">
          <Card aria-labelledby="mine-title">
            <CardHeader>
              <CardTitle id="mine-title">Your pick</CardTitle>
            </CardHeader>
            <CardContent>
              {mine?.skipped ? (
                <p className="text-sm text-muted-foreground">You are skipping today.</p>
              ) : mine?.items.length ? (
                <div className="grid gap-3">
                  {mine.items.map((l) => {
                    const f = dishById(l.dishId);
                    return f ? (
                      <div key={l.dishId} className="flex gap-3">
                        <FoodPhoto size={40} src={f.dish.photo} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{l.qty > 1 ? `${l.qty} × ` : ''}{f.dish.name}</div>
                          <div className="text-[13px] text-muted-foreground">{f.restaurant.name} · {rupees(f.dish.price * l.qty)}</div>
                        </div>
                      </div>
                    ) : null;
                  })}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>You owe the host</span><span className="num">{rupees(mineTotal)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You have not picked yet.</p>
              )}
              {isOpen && (
                <Button asChild variant="link" className="group mt-3 h-auto px-0">
                  <a href="#/pick">
                    {mine?.items.length ? 'Change it' : 'Pick now'}
                    <Icon name="arrow" size={14} className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card aria-labelledby="waiting-title">
            <CardHeader>
              <CardTitle id="waiting-title" className="flex items-center gap-2">Still to pick <Badge variant="secondary">{lunch.waiting.length}</Badge></CardTitle>
            </CardHeader>
            <CardContent>
              {lunch.waiting.length ? (
                <ul className="grid gap-2.5">
                  {lunch.waiting.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 text-sm"><Avatar person={p} size="sm" />{p.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Everyone has answered.</p>
              )}
            </CardContent>
          </Card>

          <Card aria-labelledby="deliver-title">
            <CardHeader>
              <CardTitle id="deliver-title">Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-[13px] text-muted-foreground">To</dt><dd>{session.address}</dd></div>
                <div><dt className="text-[13px] text-muted-foreground">Host</dt><dd>{personById(session.hostId)?.name}, on their Swiggy account</dd></div>
                <div><dt className="text-[13px] text-muted-foreground">Payment</dt><dd>Cash on delivery; everyone pays the host back</dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
