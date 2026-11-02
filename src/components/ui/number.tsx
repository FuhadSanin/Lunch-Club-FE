import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

// A figure that counts to its value the first time it is seen, then eases between changes.
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), className }: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (!seen) return;
    if (reduce) { setShown(value); from.current = value; return; }
    const c = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setShown,
      onComplete: () => (from.current = value),
    });
    return () => { from.current = value; c.stop(); };
  }, [seen, value, reduce]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true" className="num">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
