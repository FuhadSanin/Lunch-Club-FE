import { PlatformStrip } from './Platforms';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { allDishes, dishById } from '@/data/catalog';
import { PEOPLE } from '@/data/demo';
import { offeredRestaurants, useStore } from '../store';
import { GoogleG, Icon } from '../ui';
import { Button } from '../components/ui/button';
import { cn, easeOut, spring } from '../lib/cn';
import { WordsIn } from './motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';

// The office: eight colleagues at one long desk (public/illustrations/desks.png, served as WebP), each at a laptop and
// dreaming of a different dish, with the team's tiffin waiting at the end. The thought bubbles are
// separate images so they can pop in and follow today's picks. Drawn by scripts/art/desks.mjs (the
// bubbles by scripts/art/lunch-line.mjs); these numbers match the scene there.
const SCENE = { w: 1600, h: 740 };
const XS = [100, 280, 460, 640, 820, 1000, 1180, 1360];
const TIERS = [1, 0, 1, 0, 1, 0, 1, 0];
const BUBBLE = { w: 200, h: 150 };
// The hero shows the last four people at the desk and the tiffin: the scene from CROP.x across CROP.w.
const FIRST = 4;
const CROP = { x: 772, w: 828 };

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
    <section
      aria-labelledby="hero-title"
      className="relative mx-auto flex max-w-[1200px] flex-col px-5 pt-20 pb-10 sm:px-8 sm:pt-24 md:grid md:min-h-dvh md:grid-cols-12 md:items-center md:gap-x-10 md:pt-20 md:pb-8"
    >
      {/* The headline and the way in, on the left. */}
      <div className="md:col-span-6 lg:col-span-5">
        <h1 id="hero-title" className="max-md:text-[clamp(44px,12.5vw,64px)] md:text-[clamp(38px,min(4.5vw,8dvh),60px)] font-semibold leading-[1.04] tracking-[-0.045em]">
          <WordsIn lines={['Everyone has a', 'different craving.']} accent={{ word: 'craving.', src: '/illustrations/craving.webp', width: 2240, height: 600 }} />
        </h1>
        <motion.div
          className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center md:mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOut, delay: 0.45 }}
        >
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
        </motion.div>
      </div>

      {/* The drawing, on the right: the four people at the end of the desk, and the tiffin. */}
      <figure ref={figure} className="order-first mx-auto mb-6 w-[72%] max-w-[340px] md:order-none md:mx-0 md:mb-0 md:w-auto md:max-w-none md:col-span-6 lg:col-span-7">
        {/* The box is the cropped part of the scene. On a tablet and up it is as wide as the height left on the
            screen allows (the 200px is the top bar, the platform strip and some air), so the hero stays on one screen. */}
        <div
          className="relative mx-auto w-full overflow-hidden max-md:max-w-[560px] md:w-[min(100%,calc((100dvh-200px)*var(--crop)))]"
          style={{ aspectRatio: `${CROP.w} / ${SCENE.h}`, '--crop': CROP.w / SCENE.h } as React.CSSProperties}
        >
          <div className="absolute top-0 h-full" style={{ left: `${(-CROP.x / CROP.w) * 100}%`, width: `${(SCENE.w / CROP.w) * 100}%` }}>
            <picture className="contents">
                  <source media="(max-width: 767px)" srcSet="/illustrations/desks-1200.webp" type="image/webp" />
                  <motion.img
                    src="/illustrations/desks.webp"
                    alt="Eight colleagues working on laptops at one long office desk, each daydreaming of a different dish; at the end of the desk, one tiffin carrier with an order ticket."
                    width={2400}
                    height={1110}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 size-full select-none dark:invert"
                    initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
                    animate={shown ? (reduce ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)' }) : undefined}
                    transition={{ duration: 1.6, ease: easeOut }}
                  />
            </picture>

            {thoughts.map((t, i) => {
              if (i < FIRST) return null;
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
                  transition={{ ...spring, delay: 1 + (i - FIRST) * 0.13 }}
                >
                  <motion.span className="block" style={{ transformOrigin: '50% 70%' }} animate={{ scale: open ? 1.08 : 1 }} transition={spring}>
                  <motion.img
                    src={`/illustrations/thoughts/${t.kind}.webp`}
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

      </figure>
      <PlatformStrip />
    </section>
  );
}
