import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn, easeOut, spring } from '../lib/cn';
import { playSound, type SoundKind } from '../lib/sound';

// success: green with a check (pick saved, order placed; the order plays a till's ka-ching). lock: ink
// with a padlock that snaps shut, and its click (picks locked).
// Each step of a lunch has its own colour, so the moments read differently at a glance.
export type Tone = 'green' | 'ink' | 'gold' | 'indigo' | 'violet' | 'coral';
export const TONES: Record<Tone, string> = {
  green: 'bg-[#12a150] text-white dark:bg-[#0e8a43]',
  ink: 'bg-[#141414] text-white dark:bg-[#f2f2f2] dark:text-[#141414]',
  gold: 'bg-[#f5b301] text-[#2a1d00] dark:bg-[#e0a400]',
  indigo: 'bg-[#3b49df] text-white dark:bg-[#3341c4]',
  violet: 'bg-[#7c3aed] text-white dark:bg-[#6d28d9]',
  coral: 'bg-[#f2545b] text-white dark:bg-[#dc4a51]',
};
// The picture in the middle of a moment, animated like a little sticker: a check by default.
export type MomentIcon = 'check' | 'megaphone' | 'cart' | 'bag' | 'cloche' | 'cutlery';
export type Moment = { x: number; y: number; title: string; sub?: string; kind?: 'success' | 'lock'; tone?: Tone; icon?: MomentIcon; sound?: SoundKind };

// When each sound lands on its moment's animation (seconds after it opens): the lock's snap as the
// shackle hits home, the till's bell and the other sounds as the picture pops in.
export const soundDelay = (s: SoundKind) => (s === 'lock' ? 0.575 : s === 'money' ? 0.5 : 0.56);

const Ctx = createContext<(m: Moment) => void>(() => {});

// Where a celebration starts: the click point, or the middle of the control for keyboard presses.
export function originOf(e: { clientX: number; clientY: number; currentTarget: Element }) {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export const useCelebrate = () => useContext(Ctx);

const PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08);
  const dist = 150 + (i % 5) * 34;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 6 + (i % 4) * 3, round: i % 3 !== 0, delay: (i % 6) * 0.02 };
});

// A success moment: green opens as a circle from the control that was pressed (the same move as
// the theme switch), a check draws itself, a burst goes out, then it all closes back.
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<(Moment & { key: number }) | null>(null);
  const timer = useRef<number>(0);
  const reduce = useReducedMotion();

  const celebrate = useCallback((m: Moment) => {
    window.clearTimeout(timer.current);
    setMoment({ ...m, key: Date.now() });
    if (m.sound) playSound(m.sound, soundDelay(m.sound));
    timer.current = window.setTimeout(() => setMoment(null), m.kind === 'lock' ? 2600 : 2300);
  }, []);

  useEffect(() => {
    if (!moment) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoment(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moment]);

  const r = moment ? Math.hypot(Math.max(moment.x, innerWidth - moment.x), Math.max(moment.y, innerHeight - moment.y)) : 0;

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      <AnimatePresence>
        {moment && (
          <motion.div
            key={moment.key}
            role="status"
            aria-live="polite"
            onClick={() => setMoment(null)}
            className={cn(
              'fixed inset-0 z-[70] grid cursor-pointer place-items-center overflow-hidden',
              TONES[moment.tone ?? (moment.kind === 'lock' ? 'ink' : 'green')],
            )}
            initial={reduce ? { opacity: 0 } : { clipPath: `circle(0px at ${moment.x}px ${moment.y}px)` }}
            animate={reduce ? { opacity: 1 } : { clipPath: `circle(${r}px at ${moment.x}px ${moment.y}px)` }}
            exit={reduce ? { opacity: 0 } : { clipPath: `circle(0px at ${moment.x}px ${moment.y}px)` }}
            transition={{ duration: 0.65, ease: easeOut }}
          >
            <div className="relative grid place-items-center px-6 text-center">
              {!reduce && moment.kind !== 'lock' && <Burst />}
              <MomentArt kind={moment.kind} icon={moment.icon} />
              <motion.p
                className="mt-8 text-[clamp(36px,6vw,64px)] font-semibold leading-none tracking-[-0.045em]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: easeOut, delay: 0.5 }}
              >
                {moment.title}
              </motion.p>
              {moment.sub && (
                <motion.p
                  className="mt-4 max-w-md text-lg leading-7 opacity-85"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: easeOut, delay: 0.62 }}
                >
                  {moment.sub}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

// A moment's picture: the padlock for a lock, a step's own picture, or a check that draws itself.
// The landing page's "How lunch runs" plays the same pictures at the end of each step.
export function MomentArt({ kind, icon }: Pick<Moment, 'kind' | 'icon'>) {
  const reduce = !!useReducedMotion();
  if (kind === 'lock') return <Padlock reduce={reduce} />;
  if (icon && icon !== 'check') return <StepIcon icon={icon} reduce={reduce} />;
  return (
    <motion.div
      className="grid size-[120px] place-items-center rounded-full bg-current/15"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...spring, delay: 0.2 }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <motion.circle
          cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: easeOut, delay: 0.25 }}
        />
        <motion.path
          d="M19 33 l9 9 l17 -19" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: easeOut, delay: 0.6 }}
        />
      </svg>
    </motion.div>
  );
}

// The burst that goes out behind a moment's picture (not for the lock, which shudders instead).
export function Burst() {
  return (
    <div className="pointer-events-none absolute top-[60px] left-1/2" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block bg-current"
          style={{ width: p.size, height: p.size, borderRadius: p.round ? 999 : 2, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, scale: [0, 1.2, 0.6], opacity: [1, 1, 0], rotate: i * 40 }}
          transition={{ duration: 1.2, ease: easeOut, delay: 0.35 + p.delay }}
        />
      ))}
    </div>
  );
}

// The lock moment's icon: the body rises in, the shackle drops and catches (in time with the latch
// click), the whole lock gives a small shudder, and a ring goes out from it.
function Padlock({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative grid size-[120px] place-items-center">
      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-current"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 0.6, 1.9], opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.1, times: [0, 0.5, 1], ease: easeOut, delay: 0.25 }}
        />
      )}
      <motion.div
        className="grid size-[120px] place-items-center rounded-full bg-current/10"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={reduce ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1, rotate: [0, 0, -5, 4, -2, 0] }}
        transition={{ ...spring, delay: 0.15, rotate: { duration: 0.5, delay: 0.66, times: [0, 0.1, 0.35, 0.6, 0.8, 1] } }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <motion.path
            d="M21 30 V21 a11 11 0 0 1 22 0 V30"
            fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
            initial={reduce ? false : { y: -12 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 900, damping: 18, delay: 0.62 }}
          />
          <motion.rect
            x="14" y="28" width="36" height="28" rx="6" fill="currentColor"
            initial={reduce ? false : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: easeOut, delay: 0.25 }}
          />
          <motion.circle cx="32" cy="41" r="3.5" className="fill-[#141414] dark:fill-[#f2f2f2]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.75 }} />
          <motion.rect x="30.5" y="42" width="3" height="7" rx="1.5" className="fill-[#141414] dark:fill-[#f2f2f2]" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.2, delay: 0.82 }} />
        </svg>
      </motion.div>
    </div>
  );
}

// The step pictures: drawn with the current colour, each with its own little loop of motion.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const pop = (delay: number) => ({ type: 'spring', stiffness: 520, damping: 15, delay }) as const;

function StepIcon({ icon, reduce }: { icon: Exclude<MomentIcon, 'check'>; reduce: boolean }) {
  const still = reduce ? { initial: false as const } : {};
  return (
    <motion.div
      className="grid size-[120px] place-items-center rounded-full bg-current/15"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...spring, delay: 0.15 }}
    >
      <svg width="76" height="76" viewBox="0 0 64 64" aria-hidden="true">
        {icon === 'megaphone' && (
          <>
            <motion.g {...still} initial={{ rotate: -8 }} animate={{ rotate: [-8, 6, -4, 4, 0] }} transition={{ duration: 0.9, delay: 0.35 }} style={{ transformOrigin: '20px 34px' }}>
              <path {...stroke} d="M10 28v10h8l18 10V18L18 28z" />
              <path {...stroke} d="M16 38l3 12h6l-2-9" />
            </motion.g>
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                {...stroke}
                d={`M${42 + i * 6} ${24 - i * 3}a${12 + i * 6} ${12 + i * 6} 0 0 1 0 ${18 + i * 6}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 1.1, delay: 0.5 + i * 0.15, repeat: reduce ? 0 : 1 }}
              />
            ))}
          </>
        )}
        {icon === 'cart' && (
          <motion.g {...still} initial={{ x: -26, opacity: 0 }} animate={{ x: [-26, 0, 0, 3, 0], opacity: 1 }} transition={{ duration: 1.8, times: [0, 0.22, 0.8, 0.9, 1], delay: 0.2 }}>
            {/* items dropping in, one after another */}
            {[
              { x: 22, w: 9, h: 9, d: 0.55 },
              { x: 33, w: 8, h: 11, d: 0.8 },
              { x: 42, w: 7, h: 7, d: 1.05 },
            ].map((b, i) => (
              <motion.rect
                key={i}
                x={b.x}
                y={34 - b.h}
                width={b.w}
                height={b.h}
                rx="1.5"
                fill="currentColor"
                initial={reduce ? false : { y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={pop(b.d)}
              />
            ))}
            <path {...stroke} d="M5 12h7l6 24h30l5-17H15" />
            <path {...stroke} d="M18 36l-2 6h34" />
            <circle {...stroke} cx="22" cy="50" r="3.5" />
            <circle {...stroke} cx="44" cy="50" r="3.5" />
          </motion.g>
        )}
        {icon === 'bag' && (
          <>
            <motion.g {...still} initial={{ y: -46, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={pop(0.3)}>
              <path {...stroke} d="M14 24h36l-3 30H17z" />
              <path {...stroke} d="M24 24v-4a8 8 0 0 1 16 0v4" />
              <path {...stroke} strokeWidth={2.5} d="M26 38h12" />
            </motion.g>
            {[22, 32, 42].map((x, i) => (
              <motion.path
                key={x}
                {...stroke}
                strokeWidth={2.5}
                d={`M${x} 14c-3-3 3-5 0-9`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={reduce ? { pathLength: 1, opacity: 0.8 } : { pathLength: [0, 1], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.2, delay: 0.75 + i * 0.12, repeat: reduce ? 0 : 1 }}
              />
            ))}
            <motion.path {...stroke} strokeWidth={2.5} d="M6 58h52" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.45 }} />
          </>
        )}
        {icon === 'cloche' && (
          <>
            <path {...stroke} d="M6 46h52" />
            <motion.g {...still} initial={{ y: 0, rotate: 0 }} animate={{ y: -16, rotate: -14 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.7 }} style={{ transformOrigin: '50px 46px' }}>
              <path {...stroke} d="M10 44a22 22 0 0 1 44 0" />
              <path {...stroke} d="M32 22v-4" />
              <circle cx="32" cy="16" r="2.5" fill="currentColor" />
            </motion.g>
            <motion.path {...stroke} d="M20 44c2-6 8-8 12-8s10 2 12 8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} />
            {[25, 32, 39].map((x, i) => (
              <motion.path
                key={x}
                {...stroke}
                strokeWidth={2.5}
                d={`M${x} 32c-2-3 2-5 0-8`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={reduce ? { pathLength: 1, opacity: 0.8 } : { pathLength: [0, 1], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.1, delay: 1 + i * 0.12, repeat: reduce ? 0 : 1 }}
              />
            ))}
          </>
        )}
        {icon === 'cutlery' && (
          <>
            <motion.g {...still} initial={{ rotate: -40, x: -8, opacity: 0 }} animate={{ rotate: -22, x: 0, opacity: 1 }} transition={pop(0.3)} style={{ transformOrigin: '32px 56px' }}>
              <path {...stroke} d="M32 56V26" />
              <path {...stroke} d="M26 8v10a6 6 0 0 0 12 0V8M32 8v12" />
            </motion.g>
            <motion.g {...still} initial={{ rotate: 40, x: 8, opacity: 0 }} animate={{ rotate: 22, x: 0, opacity: 1 }} transition={pop(0.45)} style={{ transformOrigin: '32px 56px' }}>
              <path {...stroke} d="M32 56V30" />
              <ellipse {...stroke} cx="32" cy="17" rx="6" ry="9" />
            </motion.g>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
              const [x1, y1, x2, y2] = [32 + Math.cos(a) * 20, 30 + Math.sin(a) * 20, 32 + Math.cos(a) * 27, 30 + Math.sin(a) * 27];
              return (
                <motion.path
                  key={i}
                  {...stroke}
                  strokeWidth={2.5}
                  d={`M${x1} ${y1}L${x2} ${y2}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.9, delay: 0.7 + i * 0.04 }}
                />
              );
            })}
          </>
        )}
      </svg>
    </motion.div>
  );
}
