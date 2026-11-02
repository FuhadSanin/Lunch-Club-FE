import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PEOPLE, type Person, type Pick } from '@/data/demo';
import { dishById, restaurantById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { Avatar, FoodPhoto, Icon, rupees } from '@/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/number';
import { cn, easeOut, spring } from '@/lib/cn';
import { Reveal } from './motion';

type Lunch = ReturnType<typeof useLunch>;
type Ctx = { lunch: Lunch; picks: Record<string, Pick>; cutoff: string };

const STAGES: { title: (c: Ctx) => string; body: (c: Ctx) => string }[] = [
  { title: () => 'The host picks a distance, everyone picks lunch', body: (c) => `The restaurants near the office go on the board, or the host chooses them. One link goes out, and people can change their mind until ${c.cutoff}.` },
  { title: (c) => `Picks lock at ${c.cutoff}`, body: () => 'At the cutoff the board freezes, so the cart stops moving. The host can reopen it if someone is running late.' },
  { title: () => 'The host checks the cart once', body: () => 'Every dish, grouped by restaurant, with who ordered it. One look, one confirm.' },
  { title: () => 'The order bot places one order', body: () => "It orders on the host's Swiggy account, checks the total against the board, and never places the same order twice." },
  { title: () => 'Food arrives, labelled by name', body: () => "Each person's name goes in the restaurant note. The host ticks people off as they collect and sees who owes what." },
];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const BEATS = STAGES.length + 1; // five steps, then "lunch is served"
const GREEN = 'bg-[#12a150] dark:bg-[#0e8a43]';

// Counts 0 → n, one step every `every` ms after `delay`; jumps to n with reduced motion.
function useSequence(n: number, every = 520, delay = 300) {
  const reduce = useReducedMotion();
  const [k, setK] = useState(reduce ? n : 0);
  useEffect(() => {
    if (reduce) return setK(n);
    let i = 0;
    let timer = window.setTimeout(function tick() {
      i += 1;
      setK(i);
      if (i < n) timer = window.setTimeout(tick, every);
    }, delay);
    return () => clearTimeout(timer);
  }, [n, every, delay, reduce]);
  return k;
}

// Scrollytelling: the steps stay pinned while the page scrolls; each step plays its own small scene,
// and when the last one is done the panel floods green: lunch is served. On phones it is a list,
// and each scene plays as it scrolls into view.
export default function HowItRuns() {
  const { state } = useStore();
  const lunch = useLunch();
  const ctx: Ctx = { lunch, picks: state.picks, cutoff: state.session.cutoff };
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setAt(Math.min(BEATS - 1, Math.floor(v * BEATS))));
  const done = at === BEATS - 1;

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / BEATS), behavior: 'smooth' });
  };

  return (
    <section id="how" aria-labelledby="how-title" className="pt-28 md:pt-0">
      <div ref={ref} className="relative md:h-[440vh]">
        <div className="md:sticky md:top-0 md:flex md:h-svh md:items-center">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-x-10 px-5 sm:px-8 md:grid-cols-12">
            <div className="min-w-0 md:col-span-5">
              <Reveal>
                <h2 id="how-title" className="text-[clamp(36px,5.2vw,64px)] font-semibold leading-[1] tracking-[-0.045em]">
                  How lunch runs.
                </h2>
              </Reveal>

              <ol className="mt-10 grid grid-cols-[minmax(0,1fr)] md:mt-12">
                {STAGES.map((s, i) => {
                  const st = done ? 'done' : i < at ? 'past' : i === at ? 'now' : 'next';
                  return (
                    <li key={i} className="relative min-w-0 md:pl-11">
                      <span aria-hidden="true" className="absolute top-3.5 left-0 hidden md:block">
                        <motion.span
                          className={cn(
                            'relative z-10 grid size-7 place-items-center rounded-full transition-colors duration-500',
                            st === 'done' ? `${GREEN} text-white` : st === 'past' ? 'bg-primary text-primary-foreground' : 'bg-background shadow-[0_0_0_2px_var(--color-line-strong)]',
                            st === 'now' && 'shadow-[0_0_0_2px_var(--color-ink)]',
                          )}
                          animate={st === 'done' ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                          transition={st === 'done' ? { duration: 0.5, delay: 0.08 * i } : spring}
                        >
                          {(st === 'past' || st === 'done') && <Icon name="check" size={14} />}
                          {st === 'now' && <motion.span className="size-2.5 rounded-full bg-primary" animate={{ scale: [1, 0.6, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />}
                        </motion.span>
                        {i < STAGES.length - 1 && (
                          <span className="absolute top-7 left-[13px] h-[calc(100%+40px)] w-0.5 overflow-hidden rounded-full bg-line">
                            <motion.span
                              className={cn('block h-full w-full origin-top', done ? 'bg-[#12a150] dark:bg-[#0e8a43]' : 'bg-primary')}
                              initial={false}
                              animate={{ scaleY: done || i < at ? 1 : 0 }}
                              transition={{ duration: 0.6, ease: easeOut }}
                            />
                          </span>
                        )}
                      </span>

                      <div className="py-4 md:hidden">
                        <h3 className="text-xl font-semibold tracking-[-0.02em]">{s.title(ctx)}</h3>
                        <p className="mt-2 text-body">{s.body(ctx)}</p>
                        <PlayWhenSeen className="mt-5"><StageScene i={i} ctx={ctx} /></PlayWhenSeen>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => jump(i)}
                        aria-current={st === 'now' ? 'step' : undefined}
                        className="hidden h-auto w-full justify-start rounded-xl px-3 py-3 text-left font-normal whitespace-normal hover:bg-muted/60 active:not-aria-[haspopup]:scale-100 md:block"
                      >
                        <span className={cn('block text-xl font-semibold tracking-[-0.02em] transition-colors duration-500', st === 'now' || st === 'done' ? 'text-foreground' : st === 'past' ? 'text-body' : 'text-muted-foreground')}>
                          {s.title(ctx)}
                        </span>
                        <AnimatePresence initial={false}>
                          {st === 'now' && (
                            <motion.span className="block overflow-hidden text-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: easeOut }}>
                              <span className="block pt-2">{s.body(ctx)}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>
                    </li>
                  );
                })}
              </ol>
              <div className="pt-4 md:hidden"><PlayWhenSeen><Served ctx={ctx} /></PlayWhenSeen></div>
            </div>

            <div className="relative hidden md:col-span-7 md:block">
              <div className="relative grid min-h-[500px] place-items-center overflow-hidden rounded-3xl bg-muted p-10">
                <motion.div
                  aria-hidden="true"
                  className={cn('absolute inset-0', GREEN)}
                  initial={false}
                  animate={{ clipPath: done ? 'circle(75% at 50% 50%)' : 'circle(0% at 50% 50%)' }}
                  transition={{ duration: 0.9, ease: easeOut }}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={at}
                    className="relative w-full max-w-[460px]"
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.5, ease: easeOut }}
                  >
                    {done ? <Served ctx={ctx} bare /> : <StageScene i={at} ctx={ctx} />}
                  </motion.div>
                </AnimatePresence>
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
                  {Array.from({ length: BEATS }, (_, i) => (
                    <motion.span key={i} className={cn('h-1.5 rounded-full', done ? 'bg-white' : 'bg-primary')} animate={{ width: i === at ? 22 : 6, opacity: i === at || done ? 1 : 0.2 }} transition={spring} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Mounts its scene only once it scrolls into view, so phone scenes play when they are seen.
function PlayWhenSeen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  return <div ref={ref} className={cn('min-h-40', className)}>{seen && children}</div>;
}

const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div data-ui className={cn('rounded-2xl bg-card p-5 text-card-foreground shadow-float', className)}>{children}</div>
);

function StageScene({ i, ctx }: { i: number; ctx: Ctx }) {
  switch (i) {
    case 0: return <ScenePicks ctx={ctx} />;
    case 1: return <SceneLock ctx={ctx} />;
    case 2: return <SceneConfirm ctx={ctx} />;
    case 3: return <SceneBot ctx={ctx} />;
    default: return <SceneHandOut ctx={ctx} />;
  }
}

const amount = (p: Pick) => p.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);
const latestFour = (ctx: Ctx): Person[] =>
  [...ctx.lunch.picked].sort((a, b) => ctx.picks[b.id].updatedAt.localeCompare(ctx.picks[a.id].updatedAt)).slice(0, 4);

// 1. Picks arrive one by one; the count rises with them.
function ScenePicks({ ctx }: { ctx: Ctx }) {
  const people = latestFour(ctx).reverse();
  const k = useSequence(people.length, 450, 250);
  return (
    <Panel>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold"><span className="size-2 animate-pulse-dot rounded-full bg-ok" />Live board</span>
        <span className="text-muted-foreground num">
          <AnimatedNumber value={ctx.lunch.picked.length - people.length + k} /> of {ctx.lunch.team} picked
        </span>
      </div>
      <ul className="mt-4 grid min-h-[216px] content-start gap-2">
        <AnimatePresence initial={false}>
          {people.slice(0, k).reverse().map((p) => {
            const d = dishById(ctx.picks[p.id].items[0].dishId);
            return (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.1 }}><Avatar person={p} size="sm" /></motion.span>
                <span className="min-w-0 flex-1 truncate text-sm"><span className="font-medium">{p.name.split(' ')[0]}</span><span className="text-muted-foreground"> · {d?.dish.name}</span></span>
                <span className="text-sm num">{rupees(amount(ctx.picks[p.id]))}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </Panel>
  );
}

// 2. The padlock snaps shut, the board dims, a stamp lands.
function SceneLock({ ctx }: { ctx: Ctx }) {
  const people = latestFour(ctx).slice(0, 3);
  return (
    <Panel className="relative min-h-[300px] overflow-hidden">
      <motion.ul className="grid gap-2" initial={{ opacity: 1 }} animate={{ opacity: 0.25 }} transition={{ delay: 0.7, duration: 0.6 }}>
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
            <Avatar person={p} size="sm" /><span className="flex-1 truncate">{p.name.split(' ')[0]}</span><span className="num">{rupees(amount(ctx.picks[p.id]))}</span>
          </li>
        ))}
      </motion.ul>
      <div className="absolute inset-0 grid place-items-center p-5">
        <div className="grid justify-items-center gap-3 text-center">
          <svg width="64" height="72" viewBox="0 0 64 72" aria-hidden="true" className="text-foreground">
            <motion.path d="M18 34 V22 a14 14 0 0 1 28 0 V34" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" initial={{ y: -12 }} animate={{ y: 0 }} transition={{ ...spring, delay: 0.45 }} />
            <rect x="8" y="32" width="48" height="36" rx="9" className="fill-primary" />
            <motion.circle cx="32" cy="50" r="5" className="fill-primary-foreground" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.75 }} />
          </svg>
          <motion.div initial={{ scale: 1.8, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ ...spring, delay: 0.9 }}>
            <span className="inline-block rounded-lg border-2 border-foreground bg-background px-3 py-1 text-sm font-semibold">Picks locked at {ctx.cutoff}</span>
          </motion.div>
          <motion.p className="rounded-full bg-background/80 px-3 text-[13px] text-muted-foreground num" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            {plural(ctx.lunch.picked.length, 'person', 'people')} · {plural(ctx.lunch.dishes, 'dish', 'dishes')} · {ctx.lunch.waiting.length} did not answer
          </motion.p>
        </div>
      </div>
    </Panel>
  );
}

// 3. The cart arrives row by row; a cursor confirms the order.
function SceneConfirm({ ctx }: { ctx: Ctx }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'press' | 'done'>(reduce ? 'done' : 'idle');
  useEffect(() => {
    if (reduce) return;
    const a = window.setTimeout(() => setPhase('press'), 1900);
    const b = window.setTimeout(() => setPhase('done'), 2150);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [reduce]);
  return (
    <Panel className="relative">
      <div className="text-lg font-semibold tracking-[-0.02em]">Place one Swiggy order for <AnimatedNumber value={ctx.lunch.total} format={(n) => rupees(Math.round(n))} />?</div>
      <ul className="mt-4 grid gap-1.5">
        {ctx.lunch.cart.map((g, i) => (
          <motion.li key={g.restaurantId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15, duration: 0.4, ease: easeOut }} className="flex items-center gap-2.5 text-sm">
            <FoodPhoto size={22} src={restaurantById(g.restaurantId)?.photo} className="rounded-md" />
            <span className="flex-1 truncate">{g.name}</span>
            <span className="text-muted-foreground num">{g.dishes} ×</span>
            <span className="w-16 text-right num">{rupees(g.total)}</span>
          </motion.li>
        ))}
      </ul>
      <div className="relative mt-5 flex justify-end gap-2">
        <span className="inline-flex h-9 items-center rounded-full px-4 text-sm shadow-ring">Keep checking</span>
        <motion.span
          className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors duration-300', phase === 'done' ? 'bg-[#12a150] text-white' : 'bg-primary text-primary-foreground')}
          animate={{ scale: phase === 'press' ? 0.92 : 1 }}
          transition={spring}
        >
          {phase === 'done' ? <><Icon name="check" size={14} /> Order confirmed</> : 'Place the order'}
        </motion.span>
        {!reduce && (
          <motion.svg
            width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="pointer-events-none absolute right-8 -bottom-2 text-foreground"
            initial={{ x: -170, y: -110, opacity: 0 }}
            animate={{ x: [-170, -170, -24], y: [-110, -110, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 1.8, times: [0, 0.3, 1], ease: easeOut }}
          >
            <path d="M2 2 L2 20 L7 15 L10.5 23 L14 21.5 L10.6 14 L17.5 14 Z" className="fill-background" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </motion.svg>
        )}
      </div>
    </Panel>
  );
}

// 4. The bot works through its steps: spin, then tick.
function SceneBot({ ctx }: { ctx: Ctx }) {
  const steps = [
    "Opened Swiggy on the host's account",
    `Added ${ctx.lunch.dishes} dishes from ${ctx.lunch.cart.length} restaurants to one cart`,
    `Checked the cart: items ${rupees(ctx.lunch.total)}, matches the board`,
    'Checked recent orders first: no order placed yet',
    'Placed the order, cash on delivery',
  ];
  const k = useSequence(steps.length, 560, 350);
  return (
    <Panel>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Order bot</span>
        <Badge variant={k === steps.length ? 'success' : 'warning'}>{k === steps.length ? 'Done' : 'Working'}</Badge>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full origin-left rounded-full bg-[#12a150]" initial={{ scaleX: 0 }} animate={{ scaleX: k / steps.length }} transition={spring} />
      </div>
      <ol className="mt-4 grid gap-2.5">
        {steps.map((t, i) => (
          <li key={t} className={cn('flex items-start gap-2.5 text-sm transition-colors duration-300', i > k && 'text-muted-foreground')}>
            <span className="mt-0.5 grid size-[18px] flex-none place-items-center">
              {i < k ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="grid size-[18px] place-items-center rounded-full bg-[#12a150] text-white"><Icon name="check" size={11} /></motion.span>
              ) : i === k ? (
                <motion.span className="size-[16px] rounded-full border-2 border-input border-t-foreground" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              ) : (
                <span className="size-[14px] rounded-full shadow-[0_0_0_1.5px_var(--color-line-strong)]" />
              )}
            </span>
            {t}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// 5. The scooter arrives; the host ticks people off.
function SceneHandOut({ ctx }: { ctx: Ctx }) {
  const people = PEOPLE.filter((p) => ctx.lunch.picked.includes(p)).slice(0, 4);
  const k = useSequence(people.length, 480, 1100);
  return (
    <Panel>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Hand out</span>
        <span className="text-muted-foreground num">{k} of {ctx.lunch.picked.length}</span>
      </div>
      <div className="mt-3 flex items-center gap-3 overflow-hidden rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
        <motion.svg width="44" height="28" viewBox="0 0 44 28" aria-hidden="true" className="flex-none text-foreground" initial={{ x: -60 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.2 }}>
          <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="5" /><circle cx="35" cy="21" r="5" />
            <path d="M9 21h15l5-9h6M24 21l-4-11h-7M29 12l-3-7h-4" />
          </g>
          <rect x="2" y="7" width="11" height="9" rx="2" className="fill-primary" />
        </motion.svg>
        <span className="flex-1">Lunch arrived at the office</span>
        <span className="text-[13px] text-muted-foreground num">12:58</span>
      </div>
      <ul className="mt-3 grid gap-2">
        {people.map((p, i) => {
          const ticked = i < k;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
              <Avatar person={p} size="sm" />
              <span className={cn('flex-1 truncate transition-colors duration-300', ticked && 'text-muted-foreground line-through')}>{p.name}</span>
              <span className="text-[13px] text-muted-foreground num">{rupees(amount(ctx.picks[p.id]))}</span>
              <motion.span className={cn('grid size-5 place-items-center rounded-md', ticked ? 'bg-primary text-primary-foreground' : 'shadow-[0_0_0_1.5px_var(--color-line-strong)]')} animate={{ scale: ticked ? [1.3, 1] : 1 }} transition={spring}>
                {ticked && <Icon name="check" size={12} />}
              </motion.span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// The end: everything done, the panel is green and lunch is served.
function Served({ ctx, bare }: { ctx: Ctx; bare?: boolean }) {
  const reduce = useReducedMotion();
  const body = (
    <div className="relative grid justify-items-center text-center text-white">
      {!reduce && (
        <div className="pointer-events-none absolute top-16 left-1/2" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            const s = 6 + (i % 3) * 3;
            return (
              <motion.span key={i} className="absolute block rounded-full bg-white" style={{ width: s, height: s }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }} animate={{ x: Math.cos(a) * (130 + (i % 4) * 30), y: Math.sin(a) * (90 + (i % 4) * 22), opacity: [1, 1, 0], scale: [0, 1.2, 0.6] }}
                transition={{ duration: 1.3, ease: easeOut, delay: 0.35 }} />
            );
          })}
        </div>
      )}
      <motion.img src="/illustrations/tiffin.png" alt="" width={84} height={128} className="h-32 w-auto invert" initial={{ y: -30, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.15 }} />
      <svg width="44" height="44" viewBox="0 0 44 44" className="mt-5" aria-hidden="true">
        <motion.circle cx="22" cy="22" r="19" fill="#12a150" stroke="white" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }} />
        <motion.path d="M13 22.5 l6 6 l12 -13" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.75 }} />
      </svg>
      <motion.p className="mt-5 text-3xl font-semibold tracking-[-0.04em]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, ease: easeOut, duration: 0.6 }}>
        Lunch is served.
      </motion.p>
      <motion.p className="mt-2 text-white/85 num" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, ease: easeOut, duration: 0.6 }}>
        {plural(ctx.lunch.picked.length, 'person', 'people')} · {plural(ctx.lunch.cart.length, 'restaurant', 'restaurants')} · {rupees(ctx.lunch.total)} · one Swiggy order
      </motion.p>
    </div>
  );
  return bare ? body : <div className={cn('rounded-3xl px-6 py-10', GREEN)}>{body}</div>;
}
