import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Person, Pick } from '@/model';
import { DEMO_PICKS, DEMO_SESSION, PEOPLE, RADIUS_RANGE } from '@/data/demo';
import { dishById, restaurantById } from '@/data/catalog';
import { offeredRestaurants, summarise } from '@/store';
import { STEPS, type StepId, type StepState } from '@/lib/steps';
import { StepDot } from '@/components/steps';
import { Bowl } from '@/components/bowl-scroll';
import { Volume2, VolumeX } from 'lucide-react';
import { Burst, MomentArt, TONES, soundDelay, type Moment } from '@/components/celebrate';
import { audioAllowed, playSound, setSoundOn, soundOn, type SoundKind } from '@/lib/sound';
import { ReviewProgress } from '@/screens/ReviewCard';
import { Avatar, FoodPhoto, Icon, rupees } from '@/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/number';
import { cn, easeOut, spring } from '@/lib/cn';
import { Reveal } from './motion';

// The built-in sample lunch, never the visitor's own demo or a live lunch, so every scene always has
// people, dishes and restaurants to show.
type Ctx = { lunch: ReturnType<typeof summarise>; picks: Record<string, Pick>; cutoff: string };
const useSampleLunch = (): Ctx =>
  useMemo(() => ({ lunch: summarise(DEMO_SESSION, DEMO_PICKS), picks: DEMO_PICKS, cutoff: DEMO_SESSION.cutoff }), []);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const LAST = STEPS.length - 1;

// What the host does in each step, said for someone who has never seen the app.
const BODY: Record<StepId, (c: Ctx) => string> = {
  start: () => 'The host offers the restaurants near the office, or chooses them, and sets the cutoff. One link goes out to the team.',
  review: (c) => `Picks arrive on the live board, and people can change their mind until ${c.cutoff}. The host sees what everyone picked, then locks the picks so the cart stays as it is.`,
  order: () => "The host confirms once. Each restaurant's dishes and cooking notes are listed, so the host can add them to Swiggy and place the order. Automatic ordering is coming, once Swiggy approves it.",
  collect: () => 'The food comes in one restaurant at a time. The host checks each bag against what was ordered and marks it as arrived.',
  distribute: () => "Each person's card shows exactly what they ordered, so the right bag goes to the right person. The host ticks them off as they collect.",
  finish: () => 'With everyone served, the host closes the food party so the next one can start. Then everyone eats.',
};

// Each step ends with the moment the app plays when the host finishes it: the same colour, picture,
// title and sound.
const MOMENTS: Record<StepId, { tone: NonNullable<Moment['tone']>; icon?: Moment['icon']; kind?: Moment['kind']; sound: SoundKind; title: string; sub: (c: Ctx) => string }> = {
  start: { tone: 'gold', icon: 'megaphone', sound: 'start', title: 'Food party started', sub: (c) => `Picks close at ${c.cutoff}. Share the link and the team can pick.` },
  review: { tone: 'ink', kind: 'lock', sound: 'lock', title: 'Picks locked', sub: (c) => `${plural(c.lunch.picked.length, 'person', 'people')}, ${plural(c.lunch.dishes, 'dish', 'dishes')}, ${rupees(c.lunch.total)}. Nobody can change their pick now.` },
  order: { tone: 'green', icon: 'cart', sound: 'money', title: 'Order placed', sub: (c) => `${c.lunch.dishes} dishes from ${c.lunch.cart.length} restaurants, ${rupees(c.lunch.total)}, cash on delivery.` },
  collect: { tone: 'indigo', icon: 'bag', sound: 'doorbell', title: "Food's here!", sub: (c) => `All ${c.lunch.cart.length} restaurants have arrived. Time to hand it out.` },
  distribute: { tone: 'violet', icon: 'cloche', sound: 'served', title: "Everyone's served", sub: (c) => `All ${c.lunch.picked.length} people have their food.` },
  finish: { tone: 'coral', icon: 'cutlery', sound: 'cheer', title: 'Enjoy your meal!', sub: (c) => `${c.lunch.picked.length} people fed from ${c.lunch.cart.length} restaurants, one Swiggy order.` },
};

// Counts 0 → n, one step every `every` ms after `delay`, once `run` is on; jumps to n with reduced motion.
function useSequence(n: number, every = 520, delay = 300, run = true) {
  const reduce = useReducedMotion();
  const [k, setK] = useState(reduce ? n : 0);
  useEffect(() => {
    if (reduce) return setK(n);
    if (!run) return;
    let i = 0;
    let timer = window.setTimeout(function tick() {
      i += 1;
      setK(i);
      if (i < n) timer = window.setTimeout(tick, every);
    }, delay);
    return () => clearTimeout(timer);
  }, [n, every, delay, reduce, run]);
  return k;
}

// Scrollytelling: the app's six steps stay pinned while the page scrolls; each plays its own small
// scene and ends with that step's moment, as in the app. On phones it is a list, and each scene plays
// as it scrolls into view.
export default function HowItRuns() {
  const ctx = useSampleLunch();
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [ended, setEnded] = useState(-1); // the step whose moment is showing
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(LAST, Math.floor(v * STEPS.length));
    if (next !== at) {
      setAt(next);
      setEnded(-1);
    }
  });
  const served = at === LAST && ended === LAST;
  const tone = MOMENTS[STEPS[at].id].tone;

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / STEPS.length), behavior: 'smooth' });
  };

  return (
    <section id="how" aria-labelledby="how-title" className="pt-28 md:pt-0">
      <div ref={ref} className="relative md:h-[480vh]">
        <div className="md:sticky md:top-0 md:flex md:h-svh md:items-center">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-x-10 px-5 sm:px-8 md:grid-cols-12">
            <div className="min-w-0 md:col-span-5">
              <Reveal>
                <h2 id="how-title" className="text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.04em]">
                  How a food party runs.
                </h2>
                <SoundToggle
                  className="mt-6"
                  onEnable={() => {
                    const m = MOMENTS[STEPS[at].id];
                    if (ended === at) playSound(m.sound);
                  }}
                />
              </Reveal>

              <ol className="mt-10 grid grid-cols-[minmax(0,1fr)] md:mt-12">
                {STEPS.map((s, i) => {
                  const st: StepState = served || i < at ? 'done' : i === at ? 'now' : 'todo';
                  return (
                    <li key={s.id} className="relative min-w-0 md:pl-11">
                      <span aria-hidden="true" className="absolute top-3 left-0 hidden md:block">
                        <StepDot n={i + 1} state={st} size={28} />
                        {i < LAST && (
                          <span className="absolute top-8 left-[13px] h-[calc(100%+12px)] w-0.5 overflow-hidden rounded-full bg-line">
                            <motion.span className="block h-full w-full origin-top bg-ok" initial={false} animate={{ scaleY: st === 'done' ? 1 : 0 }} transition={{ duration: 0.6, ease: easeOut }} />
                          </span>
                        )}
                      </span>

                      <div className="py-4 md:hidden">
                        <h3 className="flex items-center gap-3 text-xl font-semibold tracking-[-0.02em]">
                          <StepDot n={i + 1} state="now" size={26} />
                          {s.label}
                        </h3>
                        <p className="mt-2 text-body">{BODY[s.id](ctx)}</p>
                        <PlayWhenSeen className="mt-5">
                          <div className="relative grid min-h-[440px] overflow-hidden rounded-2xl bg-muted">
                            <Stage id={s.id} ctx={ctx} className="p-4" />
                          </div>
                        </PlayWhenSeen>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => jump(i)}
                        aria-current={st === 'now' ? 'step' : undefined}
                        className="hidden h-auto w-full justify-start rounded-xl px-3 py-3 text-left font-normal whitespace-normal hover:bg-muted/60 active:not-aria-[haspopup]:scale-100 md:block"
                      >
                        <span className={cn('block text-xl font-semibold tracking-[-0.02em] transition-colors duration-500', st === 'now' ? 'text-foreground' : st === 'done' ? 'text-body' : 'text-muted-foreground')}>
                          {s.label}
                          <span className="sr-only">{st === 'done' ? ' (done)' : st === 'now' ? ' (now)' : ''}</span>
                        </span>
                        <AnimatePresence initial={false}>
                          {i === at && (
                            <motion.span className="block overflow-hidden text-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: easeOut }}>
                              <span className="block pt-2">{BODY[s.id](ctx)}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="relative hidden md:col-span-7 md:block">
              <div className="relative grid min-h-[560px] overflow-hidden rounded-3xl bg-muted">
                <AnimatePresence mode="wait">
                  <Stage key={at} id={STEPS[at].id} ctx={ctx} className="p-10" onEnd={() => setEnded(at)} />
                </AnimatePresence>
                <div
                  aria-hidden="true"
                  className={cn('absolute bottom-5 left-1/2 z-10 -translate-x-1/2', ended === at ? cn(TONES[tone], 'bg-transparent dark:bg-transparent') : 'text-primary')}
                >
                  <BowlTrack progress={scrollYProgress} at={at} steaming={ended === at} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// The scroll bar under the stage: a bowl of lunch slides along the track as the page scrolls, past a
// grain of rice for each step, and steams once the step's moment has played.
function BowlTrack({ progress, at, steaming }: { progress: MotionValue<number>; at: number; steaming: boolean }) {
  const left = useTransform(progress, [0, 1], ['0%', '100%']);
  return (
    <div className="relative h-8 w-[240px]">
      <span className="absolute inset-x-0 bottom-1 h-1 rounded-full bg-current opacity-20" />
      <motion.span className="absolute bottom-1 left-0 h-1 rounded-full bg-current" style={{ width: left }} />
      {STEPS.map((s, i) => (
        <span
          key={s.id}
          className={cn('absolute bottom-[3px] h-2 w-1 -translate-x-1/2 rotate-[24deg] rounded-full bg-current transition-opacity duration-300', i <= at ? 'opacity-100' : 'opacity-30')}
          style={{ left: `${((i + 0.5) / STEPS.length) * 100}%` }}
        />
      ))}
      <motion.span className="absolute bottom-0 -translate-x-1/2" style={{ left }}>
        <Bowl steaming={steaming} />
      </motion.span>
    </div>
  );
}

// Sound for the moments. Browsers only allow it once the visitor has clicked, tapped or typed on the
// page, so until then (or with sounds off in Settings, the same switch) it offers to turn sound on.
function SoundToggle({ onEnable, className }: { onEnable: () => void; className?: string }) {
  const [allowed, setAllowed] = useState(audioAllowed);
  const [pref, setPref] = useState(soundOn);
  const self = useRef<HTMLButtonElement>(null);
  // A press anywhere else lets sound play from then on. A press on this button is its own click, and
  // must not flip it to "on" before the click reads it.
  useEffect(() => {
    if (allowed) return;
    const on = (e: Event) => !self.current?.contains(e.target as Node) && setAllowed(true);
    window.addEventListener('pointerdown', on);
    window.addEventListener('keydown', on);
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, [allowed]);
  const on = allowed && pref;
  return (
    <Button
      ref={self}
      variant="outline"
      size="sm"
      aria-pressed={on}
      className={className}
      onClick={() => {
        setAllowed(true);
        setSoundOn(!on);
        setPref(!on);
        if (!on) onEnable();
      }}
    >
      {on ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      {on ? 'Sound on' : 'Turn sound on'}
    </Button>
  );
}

// Mounts its scene only once it scrolls into view, so phone scenes play when they are seen.
function PlayWhenSeen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  return <div ref={ref} className={cn('min-h-40', className)}>{seen && children}</div>;
}

type SceneProps = { ctx: Ctx; onDone: (from?: Element | null) => void };

// One step on stage: its scene, then its moment, which opens as a circle from the control that
// finished the step (or the middle) and stays until the next step comes on.
function Stage({ id, ctx, onEnd, className }: { id: StepId; ctx: Ctx; onEnd?: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef(0);
  const ending = useRef(onEnd);
  useEffect(() => { ending.current = onEnd; });
  useEffect(() => () => {
    clearTimeout(timer.current);
    timer.current = 0;
  }, []);

  const done = useCallback((el?: Element | null) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || timer.current) return;
    const r = el?.getBoundingClientRect();
    const at = r ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top } : { x: box.width / 2, y: box.height / 2 };
    // With reduced motion the scene is already at its end: let it be read before the moment covers it.
    timer.current = window.setTimeout(() => {
      setFrom(at);
      ending.current?.();
      // Only once the browser allows sound: one asked for before then would wait and play late.
      const { sound } = MOMENTS[id];
      if (audioAllowed()) playSound(sound, soundDelay(sound));
    }, reduce ? 1400 : 120);
  }, [reduce, id]);

  const m = MOMENTS[id];
  return (
    <motion.div
      ref={ref}
      className={cn('relative grid place-items-center', className)}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      <div className="w-full max-w-[460px]"><Scene id={id} ctx={ctx} onDone={done} /></div>
      {from && (
        <motion.div
          role="status"
          className={cn('absolute inset-0 grid place-items-center overflow-hidden px-6 text-center', TONES[m.tone])}
          initial={reduce ? { opacity: 0 } : { clipPath: `circle(0% at ${from.x}px ${from.y}px)` }}
          animate={reduce ? { opacity: 1 } : { clipPath: `circle(142% at ${from.x}px ${from.y}px)` }}
          transition={{ duration: 0.65, ease: easeOut }}
        >
          <div className="relative grid justify-items-center">
            {!reduce && m.kind !== 'lock' && <Burst />}
            <MomentArt kind={m.kind} icon={m.icon} />
            <motion.p className="mt-6 text-[clamp(28px,3.4vw,40px)] font-semibold leading-none tracking-[-0.045em]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut, delay: 0.5 }}>
              {m.title}
            </motion.p>
            <motion.p className="mt-3 max-w-sm leading-6 opacity-85 num" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut, delay: 0.62 }}>
              {m.sub(ctx)}
            </motion.p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Scene({ id, ...props }: SceneProps & { id: StepId }) {
  switch (id) {
    case 'start': return <SceneStart {...props} />;
    case 'review': return <SceneReview {...props} />;
    case 'order': return <SceneOrder {...props} />;
    case 'collect': return <SceneCollect {...props} />;
    case 'distribute': return <SceneDistribute {...props} />;
    case 'finish': return <SceneFinish {...props} />;
  }
}

const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div data-ui className={cn('rounded-2xl bg-card p-5 text-card-foreground shadow-float', className)}>{children}</div>
);

// A button the scene presses by itself: a cursor glides onto it and clicks at `at` ms.
function PressButton({ at, onPress, children }: { at: number; onPress: (el: Element | null) => void; children: ReactNode }) {
  const reduce = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (reduce) return onPress(el.current);
    const a = window.setTimeout(() => setPressed(true), at);
    const b = window.setTimeout(() => onPress(el.current), at + 200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [at, reduce, onPress]);
  const lead = Math.min(1, 1100 / at);
  return (
    <span className="relative inline-flex">
      <motion.span ref={el} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground" animate={{ scale: pressed ? [1, 0.92, 1] : 1 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.span>
      {!reduce && (
        <motion.svg
          width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="pointer-events-none absolute right-4 -bottom-4 text-foreground"
          initial={{ x: -170, y: -110, opacity: 0 }}
          animate={{ x: [-170, -170, 0], y: [-110, -110, 0], opacity: [0, 1, 1] }}
          transition={{ duration: at / 1000, times: [0, 1 - lead, 1], ease: easeOut }}
        >
          <path d="M2 2 L2 20 L7 15 L10.5 23 L14 21.5 L10.6 14 L17.5 14 Z" className="fill-background" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </motion.svg>
      )}
    </span>
  );
}

const amount = (p: Pick) => p.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);
const latestFour = (ctx: Ctx): Person[] =>
  [...ctx.lunch.picked].sort((a, b) => ctx.picks[b.id].updatedAt.localeCompare(ctx.picks[a.id].updatedAt)).slice(0, 4);
const km = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;

// 1. Start lunch: the range opens out from the office and the restaurants inside it come on, then
// the host starts the lunch.
function SceneStart({ onDone }: SceneProps) {
  const restaurants = useMemo(
    () => offeredRestaurants(DEMO_SESSION).filter((r) => !!r).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)),
    [],
  );
  const k = useSequence(restaurants.length, 380, 500);
  // The range widens to just reach the farthest restaurant on so far, in the slider's half-km steps.
  const reach = Math.max(RADIUS_RANGE.min, Math.ceil((k ? restaurants[k - 1].distanceKm ?? 0 : 0) / RADIUS_RANGE.step) * RADIUS_RANGE.step);
  return (
    <Panel>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">Start food party</span>
        <span className="text-muted-foreground">Picks close at {DEMO_SESSION.cutoff}</span>
      </div>
      <div className="mt-4 flex items-baseline justify-between text-[13px]">
        <span className="font-medium">Within {km(reach)} of the office</span>
        <span className="text-muted-foreground num">{plural(k, 'restaurant', 'restaurants')}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-muted" aria-hidden="true">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-primary" initial={{ width: '6%' }} animate={{ width: `${(reach / RADIUS_RANGE.max) * 100}%` }} transition={spring} />
      </div>
      <ul className="mt-4 grid min-h-[236px] content-start gap-2">
        <AnimatePresence initial={false}>
          {restaurants.slice(0, k).map((r) => (
            <motion.li key={r.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2">
              <FoodPhoto size={28} src={r.photo} className="rounded-md" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
              <span className="text-[13px] text-muted-foreground num">{r.distanceKm ? km(r.distanceKm) : ''}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="mt-4 flex justify-end">
        <PressButton at={500 + restaurants.length * 380 + 900} onPress={onDone}>Start food party</PressButton>
      </div>
    </Panel>
  );
}

// 2. Review & lock: picks arrive on the live board one by one, then the host locks them.
function SceneReview({ ctx, onDone }: SceneProps) {
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
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[13px] text-muted-foreground num">{ctx.lunch.waiting.length} still to pick · {ctx.lunch.skipped.length} skipping</span>
        <PressButton at={250 + people.length * 450 + 1000} onPress={onDone}><Icon name="lock" size={14} /> Lock picks now</PressButton>
      </div>
    </Panel>
  );
}

// 3. Place order: the host confirms. This scene shows automatic ordering (the order bot), which is switched
// off until Swiggy approves it; today the host places each order by hand, and the caption says so.
function SceneOrder({ ctx, onDone }: SceneProps) {
  const reduce = useReducedMotion();
  const [confirmed, setConfirmed] = useState(!!reduce);
  const cart = ctx.lunch.cart;
  const k = useSequence(cart.length + 2, 440, 350, confirmed); // each restaurant, the total check, checkout
  const placed = k === cart.length + 2;
  const confirm = useCallback(() => setConfirmed(true), []);
  useEffect(() => { if (placed) onDone(); }, [placed, onDone]);
  const tail = [`Checking the cart total: ${rupees(ctx.lunch.total)}`, 'Placing the order, cash on delivery'];
  return (
    <Panel>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Swiggy cart</span>
        <Badge variant={!confirmed ? 'secondary' : placed ? 'success' : 'warning'}>{!confirmed ? 'Waiting' : placed ? 'Placed' : 'Working'}</Badge>
      </div>
      <div className="mt-4"><ReviewProgress done={Math.min(k, cart.length)} of={cart.length} label="restaurants added to the cart" /></div>
      <ul className="grid gap-1.5">
        {cart.map((g, i) => (
          <li key={g.restaurantId} className="flex items-center gap-2.5 text-sm">
            <FoodPhoto size={22} src={restaurantById(g.restaurantId)?.photo} className="rounded-md" />
            <span className="min-w-0 flex-1 truncate">{g.name}</span>
            <span className="text-[13px] text-muted-foreground num">{g.dishes} ×</span>
            <BotMark state={!confirmed ? 'todo' : i < k ? 'done' : i === k ? 'now' : 'todo'} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-muted-foreground">A preview of automatic ordering, coming once Swiggy approves it. Today the host places each order in Swiggy.</p>
      <div className="mt-4 min-h-[60px]">
        {confirmed ? (
          <ol className="grid gap-1.5 border-t border-dashed pt-3">
            {tail.map((t, j) => {
              const i = cart.length + j;
              return (
                <li key={t} className={cn('flex items-center gap-2.5 text-[13px] transition-colors duration-300', i > k && 'text-muted-foreground')}>
                  <BotMark state={i < k ? 'done' : i === k ? 'now' : 'todo'} />
                  <span className="num">{t}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex justify-end pt-3">
            <PressButton at={1100} onPress={confirm}>Confirm and place order</PressButton>
          </div>
        )}
      </div>
    </Panel>
  );
}

function BotMark({ state }: { state: StepState }) {
  return (
    <span className="grid size-[18px] flex-none place-items-center" aria-hidden="true">
      {state === 'done' ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="grid size-[18px] place-items-center rounded-full bg-ok text-white"><Icon name="check" size={11} /></motion.span>
      ) : state === 'now' ? (
        <motion.span className="size-[16px] rounded-full border-2 border-input border-t-foreground" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      ) : (
        <span className="size-[14px] rounded-full shadow-[0_0_0_1.5px_var(--color-line-strong)]" />
      )}
    </span>
  );
}

// 4. Collect: the delivery pulls up, and each restaurant is marked as it arrives; arrived ones sink
// to the bottom, as in the app.
function SceneCollect({ ctx, onDone }: SceneProps) {
  const cart = ctx.lunch.cart;
  const k = useSequence(cart.length, 650, 1000);
  const slots = useRef<Record<string, HTMLSpanElement | null>>({});
  const last = cart[cart.length - 1]?.restaurantId;
  useEffect(() => { if (cart.length && k === cart.length) onDone(slots.current[last]); }, [k, cart.length, last, onDone]);
  const arrived = (i: number) => i < k;
  const list = cart.map((g, i) => ({ g, done: arrived(i) })).sort((a, b) => Number(a.done) - Number(b.done));
  return (
    <Panel>
      <div className="flex items-center gap-3 overflow-hidden rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
        <motion.svg width="44" height="28" viewBox="0 0 44 28" aria-hidden="true" className="flex-none text-foreground" initial={{ x: -60 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.2 }}>
          <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="5" /><circle cx="35" cy="21" r="5" />
            <path d="M9 21h15l5-9h6M24 21l-4-11h-7M29 12l-3-7h-4" />
          </g>
          <rect x="2" y="7" width="11" height="9" rx="2" className="fill-primary" />
        </motion.svg>
        <span className="flex-1">The delivery is at the office</span>
        <span className="text-[13px] text-muted-foreground num">12:58</span>
      </div>
      <div className="mt-4"><ReviewProgress done={k} of={cart.length} label="restaurants arrived" /></div>
      <ul className="grid gap-2">
        {list.map(({ g, done }) => (
          <motion.li key={g.restaurantId} layout="position" transition={spring} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-300', done ? 'bg-ok-soft/70' : 'shadow-card')}>
            <FoodPhoto size={32} src={restaurantById(g.restaurantId)?.photo} className="rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm font-semibold', done && 'text-ok')}>{g.name}</span>
              <span className="block text-[13px] text-muted-foreground num">{plural(g.dishes, 'dish', 'dishes')} · {rupees(g.total)}</span>
            </span>
            <span ref={(el) => { slots.current[g.restaurantId] = el; }} className="flex-none">
              {done ? (
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="flex items-center gap-1.5 text-[13px] font-medium text-ok"><Icon name="check" size={14} /> Arrived</motion.span>
              ) : (
                <span className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium shadow-ring">Mark as arrived</span>
              )}
            </span>
          </motion.li>
        ))}
      </ul>
    </Panel>
  );
}

// 5. Distribute: the last few people collect their food and are ticked off.
function SceneDistribute({ ctx, onDone }: SceneProps) {
  const people = PEOPLE.filter((p) => ctx.lunch.picked.includes(p)).slice(0, 4);
  const k = useSequence(people.length, 520, 700);
  const before = ctx.lunch.picked.length - people.length;
  useEffect(() => { if (people.length && k === people.length) onDone(); }, [k, people.length, onDone]);
  return (
    <Panel>
      <ReviewProgress done={before + k} of={ctx.lunch.picked.length} label="people have their food" />
      <ul className="grid gap-2">
        {people.map((p, i) => {
          const ticked = i < k;
          const pick = ctx.picks[p.id];
          const dish = dishById(pick.items[0].dishId)?.dish.name;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm shadow-card">
              <Avatar person={p} size="sm" />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate font-medium transition-colors duration-300', ticked && 'text-muted-foreground line-through')}>{p.name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{dish}{pick.items.length > 1 ? ` + ${pick.items.length - 1} more` : ''}</span>
              </span>
              <span className="text-[13px] text-muted-foreground num">{rupees(amount(pick))}</span>
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

// 6. Enjoy your meal: the day's lunch in four figures, and the host completes it.
function SceneFinish({ ctx, onDone }: SceneProps) {
  const facts = [
    { label: 'People fed', value: <AnimatedNumber value={ctx.lunch.picked.length} /> },
    { label: 'Dishes', value: <AnimatedNumber value={ctx.lunch.dishes} /> },
    { label: 'Restaurants', value: <AnimatedNumber value={ctx.lunch.cart.length} /> },
    { label: 'Items total', value: <AnimatedNumber value={ctx.lunch.total} format={(n) => rupees(Math.round(n))} /> },
  ];
  return (
    <Panel className="grid justify-items-center gap-4 py-7 text-center">
      <motion.span className="grid size-14 place-items-center rounded-full bg-ok-soft text-ok" aria-hidden="true" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 }}>
        <Icon name="check" size={24} />
      </motion.span>
      <p className="text-lg font-semibold tracking-[-0.03em]">Everyone has their food. Enjoy!</p>
      <dl className="grid w-full grid-cols-2 gap-2">
        {facts.map((f) => (
          <div key={f.label} className="rounded-xl bg-muted/60 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold num">{f.value}</dd>
          </div>
        ))}
      </dl>
      <PressButton at={2200} onPress={onDone}>Complete and enjoy your meal</PressButton>
    </Panel>
  );
}
