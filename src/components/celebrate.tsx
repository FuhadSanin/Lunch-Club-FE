import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { easeOut, spring } from '../lib/cn';

type Moment = { x: number; y: number; title: string; sub?: string };

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
    timer.current = window.setTimeout(() => setMoment(null), 2300);
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
            className="fixed inset-0 z-[70] grid cursor-pointer place-items-center overflow-hidden bg-[#12a150] text-white dark:bg-[#0e8a43]"
            initial={reduce ? { opacity: 0 } : { clipPath: `circle(0px at ${moment.x}px ${moment.y}px)` }}
            animate={reduce ? { opacity: 1 } : { clipPath: `circle(${r}px at ${moment.x}px ${moment.y}px)` }}
            exit={reduce ? { opacity: 0 } : { clipPath: `circle(0px at ${moment.x}px ${moment.y}px)` }}
            transition={{ duration: 0.65, ease: easeOut }}
          >
            <div className="relative grid place-items-center px-6 text-center">
              {!reduce && (
                <div className="pointer-events-none absolute top-[60px] left-1/2" aria-hidden="true">
                  {PARTICLES.map((p, i) => (
                    <motion.span
                      key={i}
                      className="absolute block bg-white"
                      style={{ width: p.size, height: p.size, borderRadius: p.round ? 999 : 2, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                      animate={{ x: p.dx, y: p.dy, scale: [0, 1.2, 0.6], opacity: [1, 1, 0], rotate: i * 40 }}
                      transition={{ duration: 1.2, ease: easeOut, delay: 0.35 + p.delay }}
                    />
                  ))}
                </div>
              )}
              <motion.div
                className="grid size-[120px] place-items-center rounded-full bg-white/15"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring, delay: 0.2 }}
              >
                <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                  <motion.circle
                    cx="32" cy="32" r="29" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: easeOut, delay: 0.25 }}
                  />
                  <motion.path
                    d="M19 33 l9 9 l17 -19" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: easeOut, delay: 0.6 }}
                  />
                </svg>
              </motion.div>
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
                  className="mt-4 max-w-md text-lg leading-7 text-white/85"
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
