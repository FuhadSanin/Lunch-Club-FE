import { motion, useInView, useReducedMotion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { allDishes, dishById } from '../data/menus';
import { PEOPLE } from '../data/demo';
import { offeredRestaurants, useLunch, useStore } from '../store';
import { GoogleG, Icon, rupees } from '../ui';
import { Button } from '../components/ui/button';
import { cn, easeOut, spring } from '../lib/cn';
import { WordsIn } from './motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';

// The lunch line: eight people at the office counter (public/illustrations/lunch-line.png), each
// thinking of a different dish, and the one tiffin waiting at the front. The thought bubbles are
// separate images so they can pop in and follow today's picks. Drawn by scripts/art/lunch-line.mjs;
// these numbers match the scene there.
const SCENE = { w: 1600, h: 860 };
const XS = [100, 280, 460, 640, 820, 1000, 1180, 1360];
const TIERS = [1, 0, 1, 0, 1, 0, 1, 0];
const BUBBLE = { w: 200, h: 150 };

type Kind = 'thali' | 'biryani' | 'burrito' | 'bowl' | 'salad' | 'wrap' | 'burger' | 'ramen' | 'drink' | 'chicken' | 'dosa' | 'icecream' | 'fries' | 'pizza';

// Which thought-bubble drawing a dish gets, from its name. First match wins.
const KINDS: [RegExp, Kind][] = [
  [/sundae|scoop|ice cream|mcflurry|cake|kesari/i, 'icecream'],
  [/lemonade|lime|lemon|tea|juice|shake|thums|cola|coke|pepsi|coffee/i, 'drink'],
  [/fries/i, 'fries'],
  [/pizza|breadstick/i, 'pizza'],
  [/dosa|idli|vada|uttapam/i, 'dosa'],
  [/biri|biryani/i, 'biryani'],
  [/burger|whopper|melt|beast|fuego|haystack/i, 'burger'],
  [/ramen|noodle/i, 'ramen'],
  [/burrito|quesadilla/i, 'burrito'],
  [/salad/i, 'salad'],
  [/bowl|rice/i, 'bowl'],
  [/shawarma|wrap|roti/i, 'wrap'],
  [/alfahm|chicken/i, 'chicken'],
];
const kindOf = (name: string): Kind => KINDS.find(([re]) => re.test(name))?.[1] ?? 'thali';

type Thought = { kind: Kind; dish: string; restaurant: string };

// The landing page opens on the lunch line: the headline, the way in, and the drawing.
export default function Tastes({ onStart }: { onStart: () => void }) {
  const { state } = useStore();
  const lunch = useLunch();
  const figure = useRef<HTMLElement>(null);
  const shown = useInView(figure, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  // Eight different cravings: today's picks first, one per kind of dish, then dishes from today's
  // menus that nobody has picked yet.
  const thoughts = useMemo(() => {
    const out: Thought[] = [];
    const add = (dish: string, restaurant: string, unique = true) => {
      const kind = kindOf(dish);
      if (out.length < XS.length && (!unique || !out.some((t) => t.kind === kind))) out.push({ kind, dish, restaurant });
    };
    const picked = PEOPLE.flatMap((p) => state.picks[p.id]?.items.map((l) => dishById(l.dishId)) ?? []).filter((x) => !!x);
    picked.forEach((f) => add(f.dish.name, f.restaurant.name));
    offeredRestaurants(state.session).forEach((r) => r && allDishes(r).forEach((d) => add(d.name, r.name)));
    picked.forEach((f) => add(f.dish.name, f.restaurant.name, false));
    return out;
  }, [state.picks, state.session]);

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1200px] px-5 pt-28 sm:px-8 sm:pt-36">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 id="hero-title" className="text-[clamp(40px,6.4vw,84px)] font-semibold leading-[0.96] tracking-[-0.05em] lg:col-span-7">
          <WordsIn lines={['Everyone has a', 'different craving.']} />
        </h1>
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOut, delay: 0.45 }}
        >
          <p className="text-lg leading-7 text-body">
            Biryani for one, a burrito for the next, a salad with no onion for the one after. Nobody has to agree on a
            restaurant: every craving goes into the same order, and one tiffin's worth of lunch comes back.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" onClick={onStart} className="pl-2">
              <span className="grid size-8 place-items-center rounded-full bg-white"><GoogleG /></span>
              Continue with Google
            </Button>
            <Button asChild size="lg" variant="ghost" className="group">
              <a href="#pick">
                Try the board
                <Icon name="arrow" className="rotate-90 transition-transform duration-300 ease-apple group-hover:translate-y-0.5" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>

      <figure ref={figure} className="mt-10 sm:mt-14">
        <div className="no-scrollbar -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="relative min-w-[880px] md:min-w-0" style={{ aspectRatio: `${SCENE.w} / ${SCENE.h}` }}>
            <motion.img
              src="/illustrations/lunch-line.png"
              alt="Eight colleagues waiting at the office counter, each thinking of a different dish; at the front, one tiffin carrier with an order ticket."
              width={2400}
              height={1290}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 size-full select-none dark:invert"
              initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
              animate={shown ? (reduce ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)' }) : undefined}
              transition={{ duration: 1.6, ease: easeOut }}
            />

            {thoughts.map((t, i) => {
              const open = active === i;
              return (
                <Tooltip key={`${i}-${t.kind}`} open={open}>
                <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  aria-label={`Thinking of ${t.dish} from ${t.restaurant}`}
                  aria-expanded={open}
                  onClick={() => setActive(open ? null : i)}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                  className={cn('absolute rounded-[40%] focus-visible:outline-offset-[-6px]', open ? 'z-20' : 'z-10')}
                  style={{
                    left: pct(XS[i] - 40, SCENE.w),
                    top: pct(TIERS[i] ? 0 : 60, SCENE.h),
                    width: pct(BUBBLE.w, SCENE.w),
                    transformOrigin: '34% 100%',
                  }}
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.2 }}
                  animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.2 }}
                  transition={{ ...spring, delay: 1 + i * 0.13 }}
                >
                  <motion.span className="block" style={{ transformOrigin: '50% 70%' }} animate={{ scale: open ? 1.08 : 1 }} transition={spring}>
                  <motion.img
                    src={`/illustrations/thoughts/${t.kind}.png`}
                    alt=""
                    width={400}
                    height={300}
                    className="block h-auto w-full select-none dark:invert"
                    animate={reduce ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 3.4 + (i % 3) * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
                  />
                  </motion.span>
                </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={-10} className="max-w-[220px] text-center text-[13px] leading-[18px]">
                  <span className="block font-medium">{t.dish}</span>
                  <span className="block opacity-70">{t.restaurant}</span>
                </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <motion.figcaption
          className="mt-8 flex flex-col items-start justify-between gap-2 text-[13px] text-mute sm:flex-row sm:items-center"
          initial={{ opacity: 0, y: 12 }}
          animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 1.8 }}
        >
          <span>
            <span className="md:hidden">Swipe along the line, tap</span>
            <span className="hidden md:inline">Point at</span> a thought to see the dish from today's menus.
          </span>
          <span className="num">
            <span className="font-semibold text-ink">One Swiggy order</span> · {lunch.picked.length} {lunch.picked.length === 1 ? 'person' : 'people'} ·{' '}
            {lunch.cart.length} {lunch.cart.length === 1 ? 'restaurant' : 'restaurants'} · {rupees(lunch.total)}
          </span>
        </motion.figcaption>
      </figure>
    </section>
  );
}
