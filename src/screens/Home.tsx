import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { personById, type Person } from '@/data/demo';
import { dishById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { Avatar, FoodPhoto, Icon, LiveDot, rupees } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, StatusBar, StatusDot, WithStatus, STATUS, type PickStatus } from '@/components/status';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Segmented } from '@/components/ui/segmented';
import { AnimatedNumber } from '@/components/ui/number';
import { PageTitle } from '@/components/PageTitle';
import { spring } from '@/lib/cn';
import { StepTracker, useLunchSteps } from '@/components/steps';
import { STEPS } from '@/lib/steps';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const until = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

type Filter = 'all' | 'picked' | 'waiting' | 'skipped';

export default function Home() {
  const { state, people: PEOPLE, meId: ME_ID, now: DEMO_NOW, live } = useStore();
  const steps = useLunchSteps();
  // The lunch's host, and whether you may let someone who completed or skipped pick again.
  const host = personById(state.session.hostId);
  const canManage = state.session.status === 'open' && (live ? live.canReopen : state.role === 'host');
  const lunch = useLunch();
  const { session, picks, org } = state;
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  // On the API a cutoff can be tomorrow (a time already past today rolls over), so count the days too.
  const days = live ? Math.round((Date.parse(`${session.date}T00:00`) - Date.parse(`${localDate(new Date())}T00:00`)) / 864e5) || 0 : 0;
  const minsLeft = toMin(session.cutoff) + days * 1440 - toMin(DEMO_NOW);
  const closesAt = days === 1 ? `tomorrow at ${session.cutoff}` : session.cutoff;
  const isOpen = session.status === 'open';
  const hour = Number(DEMO_NOW.slice(0, 2));
  const hello = hour < 12 ? 'Morning' : 'Afternoon';

  const statusLine = isOpen
    ? `${lunch.picked.length} of ${lunch.team} have picked. Picks close ${closesAt}, ${minsLeft > 0 ? `in ${until(minsLeft)}` : 'any moment now'}.`
    : session.status === 'locked'
      ? `Picks are locked. ${lunch.picked.length} people, ${lunch.dishes} dishes, waiting for the host to confirm.`
      : session.status === 'placing'
        ? 'The order bot is placing the order on Swiggy now.'
        : session.status === 'placed'
          ? `Ordered on Swiggy at ${session.bot.at(-1)?.at ?? DEMO_NOW}. Food is on its way.`
          : 'Lunch has arrived. The host is handing it out.';

  const statusOf = (id: string): PickStatus =>
    picks[id]?.skipped ? 'skipped' : picks[id]?.items.length ? 'picked' : 'waiting';
  const rows = useMemo(() => {
    const status = statusOf;
    return PEOPLE.filter((p) => filter === 'all' || status(p.id) === filter)
      .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => (a.id === ME_ID ? -1 : b.id === ME_ID ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, filter, q, PEOPLE, ME_ID]);
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
                <a href="#/pick">{mine?.done ? 'See my order' : mine?.items.length ? 'Finish my order' : 'Pick my lunch'}</a>
              </Button>
            )}
          </>
        }
      />

      <NowBanner />

      <Card className="grid grid-cols-2 gap-px bg-line py-0 md:grid-cols-4" aria-label="Today in numbers">
        {[
          { label: 'Picked', value: <><span className="text-ok"><AnimatedNumber value={lunch.picked.length} /></span><span className="text-mute">/{lunch.team}</span></>, caption: (
            <span className="grid gap-2">
              <StatusBar counts={{ picked: lunch.picked.length, waiting: lunch.waiting.length, skipped: lunch.skipped.length }} />
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5"><StatusDot status="waiting" />{lunch.waiting.length} to pick</span>
                <span className="inline-flex items-center gap-1.5"><StatusDot status="skipped" />{lunch.skipped.length} skipping</span>
              </span>
            </span>
          ) },
          { label: 'Restaurants in the cart', value: <AnimatedNumber value={lunch.cart.length} />, caption: 'All in one Swiggy cart' },
          { label: 'Items total', value: <AnimatedNumber value={lunch.total} format={(n) => rupees(Math.abs(n - lunch.total) < 0.01 ? lunch.total : Math.round(n))} />, caption: `${lunch.dishes} dishes, before Swiggy's fees` },
          { label: isOpen ? 'Picks close' : 'Order', value: <span className="num">{stateWord}</span>, caption: isOpen ? (minsLeft > 0 ? `${days === 1 ? 'Tomorrow, ' : ''}in ${until(minsLeft)}` : 'Any moment now') : session.orderRef ? `Swiggy order ${session.orderRef}` : 'Host confirms next' },
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
              {host && <span className="text-[13px] text-muted-foreground">Hosted by <span className="font-medium text-foreground">{host.id === ME_ID ? 'you' : host.name}</span></span>}
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
                  label: (
                    <>
                      {f !== 'all' && <StatusDot status={f} />}
                      {f === 'all' ? 'Everyone' : STATUS[f].label} <span className="num text-muted-foreground">{counts[f]}</span>
                    </>
                  ),
                }))}
              />
              {canManage && (
                <p className="mb-3 flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] text-muted-foreground">
                  <Icon name="lock" size={14} className="mt-0.5 flex-none" />
                  <span>
                    You're the host. <span className="font-medium text-foreground">Mark skipped</span> anyone who isn't eating today, and{' '}
                    <span className="font-medium text-foreground">Reopen</span> anyone who needs to change a completed order or a skip.
                  </span>
                </p>
              )}
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
                        className="-mx-2 flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-muted/60 sm:flex-nowrap"
                      >
                        <WithStatus status={statusOf(p.id)}><Avatar person={p} /></WithStatus>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{p.name}{p.id === ME_ID && <span className="font-normal text-muted-foreground"> (you)</span>}</span>
                            {p.id === session.hostId && <Badge variant="info" className="flex-none">Host</Badge>}
                            {pk?.done && !pk.skipped && <Badge variant="success" className="flex-none">Done</Badge>}
                          </div>
                          <div className="truncate text-[13px] text-muted-foreground">
                            {pk?.skipped
                              ? 'Skipping today'
                              : lines.length
                                ? `${lines.map((x) => x!.dish.name).join(', ')} · ${lines[0]!.restaurant.name}`
                                : 'Has not picked yet'}
                            {pk?.note ? ` · “${pk.note}”` : ''}
                          </div>
                        </div>
                        {canManage && (
                          <div className="max-sm:order-last max-sm:basis-full max-sm:pl-12">
                            <HostAction person={p} status={statusOf(p.id)} done={!!pk?.done || statusOf(p.id) === 'skipped'} />
                          </div>
                        )}
                        <div className="text-right text-sm num">
                          {lines.length ? (
                            <>
                              <div>{rupees(amount)}</div>
                              <div className="text-xs text-muted-foreground">{pk.updatedAt}</div>
                            </>
                          ) : (
                            <StatusBadge status={statusOf(p.id)} />
                          )}
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

        </div>

        <div className="grid content-start gap-4 lg:col-span-4">
          <Card aria-labelledby="steps-title">
            <CardHeader>
              <CardTitle id="steps-title">Lunch steps</CardTitle>
              <CardAction><span className="text-xs text-muted-foreground num">{steps.states ? Object.values(steps.states).filter((v) => v === 'done').length : 0} of {STEPS.length} done</span></CardAction>
            </CardHeader>
            <CardContent><StepTracker canRun={state.role === 'host'} /></CardContent>
          </Card>
          <Card aria-labelledby="mine-title">
            <CardHeader>
              <CardTitle id="mine-title">Your pick</CardTitle>
            </CardHeader>
            <CardContent>
              {mine?.skipped ? (
                <p className="text-sm text-muted-foreground">You are skipping today. Ask {host?.name.split(' ')[0] ?? 'the host'} if you change your mind.</p>
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
              {mine?.done && !mine.skipped && (
                <p className="mt-3 flex items-center gap-2 text-[13px] text-ok"><Icon name="check" size={13} /> Complete. {host?.id === ME_ID ? 'You can reopen it from the board for a change.' : `Ask ${host?.name.split(' ')[0] ?? 'the host'} to reopen it for a change.`}</p>
              )}
              {isOpen && !mine?.done && (
                <Button asChild variant="link" className="group mt-3 h-auto px-0">
                  <a href="#/pick">
                    {mine?.items.length ? 'Finish my order' : 'Pick now'}
                    <Icon name="arrow" size={14} className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card aria-labelledby="waiting-title">
            <CardHeader>
              <CardTitle id="waiting-title" className="flex items-center gap-2">Still to pick <StatusBadge status="waiting">{lunch.waiting.length}</StatusBadge></CardTitle>
            </CardHeader>
            <CardContent>
              {lunch.waiting.length ? (
                <ul className="grid gap-2.5">
                  {lunch.waiting.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 text-sm"><WithStatus status="waiting"><Avatar person={p} size="sm" /></WithStatus>{p.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ok"><StatusDot status="picked" />Everyone has answered.</p>
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

// What's happening now, in one line, at the top of Today's lunch: hosts get the button for the next
// step; everyone else sees what the host is doing.
function NowBanner() {
  const { state } = useStore();
  const { current } = useLunchSteps();
  const n = STEPS.findIndex((s) => s.id === current);
  const step = STEPS[n];
  const host = state.role === 'host';
  const forTeam: Record<string, string> = {
    start: 'No lunch is running.',
    review: 'Picks are open. Pick your lunch and complete your order before the cutoff.',
    order: 'Picks are locked. The host is placing the order on Swiggy.',
    collect: 'The order is placed. Food is on its way.',
    distribute: 'Lunch has arrived. Collect yours from the host.',
    finish: 'Everyone has their lunch.',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mb-4">
      <Card className="border-0 bg-foreground py-0 text-background shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
          <span className="grid size-7 flex-none place-items-center rounded-full bg-background text-xs font-semibold text-foreground num" aria-hidden="true">{n + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70">Now · step {n + 1} of {STEPS.length}</div>
            <div className="text-sm font-semibold">{host ? `${step.label}: ${step.hint}` : forTeam[current]}</div>
          </div>
          {host && (
            <Button asChild variant="secondary" size="sm" className="max-sm:w-full">
              <a href={`#${step.route}`}>{current === 'start' ? 'Start a lunch' : `Go to ${step.label.toLowerCase()}`}</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// The host's one action on a person, always visible on their row: mark someone still to pick as
// skipping (with an undo), or reopen someone who completed or skipped so they can change it.
function HostAction({ person, status, done }: { person: Person; status: PickStatus; done: boolean }) {
  const { dispatch } = useStore();
  const name = person.name.split(' ')[0];
  if (done)
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          Promise.resolve(dispatch({ type: 'reopenPick', userId: person.id })).then(
            () => toast.success(`${name} can change their ${status === 'skipped' ? 'day' : 'order'} again`),
            () => undefined,
          )
        }
      >
        Reopen
      </Button>
    );
  if (status !== 'waiting') return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className="text-muted-foreground"
      onClick={() =>
        Promise.resolve(dispatch({ type: 'skip', userId: person.id })).then(
          () =>
            toast(`${name} is skipping today`, {
              action: { label: 'Undo', onClick: () => void dispatch({ type: 'reopenPick', userId: person.id }) },
            }),
          () => undefined,
        )
      }
    >
      Mark skipped
    </Button>
  );
}
