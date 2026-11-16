import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { cn } from '@/lib/cn';

// A bowl of lunch with chopsticks, drawn in the current colour; it steams while `steaming` is on.
// The scroll bars on the landing page use it as their thumb.
export function Bowl({ steaming = false, size = 36, className }: { steaming?: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * 26) / 30} viewBox="0 0 30 26" aria-hidden="true" className={cn('block', className)}>
      {[10, 15, 20].map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} 9c-2-2 2-3.5 0-6`}
          fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
          initial={false}
          animate={steaming ? { pathLength: [0, 1], opacity: [0, 0.9, 0] } : { pathLength: 0, opacity: 0 }}
          transition={steaming ? { duration: 1.4, delay: i * 0.15, repeat: Infinity, repeatDelay: 0.4 } : { duration: 0.2 }}
        />
      ))}
      <path d="M3 12h24a12 10 0 0 1-24 0z" fill="currentColor" />
      <path d="M9 23h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 11.5L27 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21.5 11.5L29 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const BOWL = 22; // the thumb's size in px

// A food scroll bar for a list that scrolls: a thin track down its right edge with a bowl that rides
// it, in place of the browser's bar (give the list `no-scrollbar` and `data-[overflows=true]:pr-7`). The bowl
// can be dragged; wheel, touch and keyboard scrolling work as before. Hidden while nothing overflows.
export function BowlScrollbar({ target, className }: { target: RefObject<HTMLElement | null>; className?: string }) {
  const { scrollYProgress } = useScroll({ container: target as RefObject<HTMLElement> });
  const [overflows, setOverflows] = useState(false);
  const [steaming, setSteaming] = useState(false);
  const still = useRef(0);
  const top = useTransform(scrollYProgress, (v) => `calc(${v * 100}% - ${v * BOWL}px)`);

  // Overflow changes as rows come and go, so check after every render and on resize.
  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;
    // The list marks itself too, so it can make room for the bar only while it shows
    // (`data-[overflows=true]:pr-7`).
    const check = () => {
      const over = el.scrollHeight > el.clientHeight + 1;
      el.dataset.overflows = String(over);
      setOverflows(over);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // It steams while the list is moving.
  useMotionValueEvent(scrollYProgress, 'change', () => {
    setSteaming(true);
    window.clearTimeout(still.current);
    still.current = window.setTimeout(() => setSteaming(false), 700);
  });

  const drag = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = target.current;
    const track = e.currentTarget.parentElement;
    if (!el || !track) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const top0 = el.scrollTop;
    const ratio = (el.scrollHeight - el.clientHeight) / Math.max(1, track.clientHeight - BOWL);
    const move = (m: PointerEvent) => { el.scrollTop = top0 + (m.clientY - y0) * ratio; };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (!overflows) return null;
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute top-1 right-0 bottom-1 w-[22px] text-muted-foreground', className)}>
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current opacity-25" />
      <motion.span
        onPointerDown={drag}
        className="pointer-events-auto absolute left-0 cursor-grab touch-none text-foreground active:cursor-grabbing"
        style={{ top }}
      >
        <Bowl size={BOWL} steaming={steaming} />
      </motion.span>
    </div>
  );
}
