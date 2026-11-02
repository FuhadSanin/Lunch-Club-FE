import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { FoodPhoto } from '../ui';

type Point = { x: number; y: number };
type Flight = { key: number; src?: string; from: Point; to: Point };

const centre = (el: Element): Point => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
};

// Add-to-cart: the dish's photo leaves the button it was added from and arcs into the cart.
// `targets` are tried in order; the first one on screen is where it lands, otherwise the bottom
// of the screen, where the phone's cart bar sits.
export function useFlyToCart() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const reduce = useReducedMotion();

  const fly = useCallback(
    (from: Element, targets: (Element | null | undefined)[], src?: string) => {
      if (reduce) return;
      const target = targets.find((t): t is Element => !!t && onScreen(t));
      const to = target ? centre(target) : { x: window.innerWidth / 2, y: window.innerHeight - 40 };
      setFlights((f) => [...f, { key: performance.now() + Math.random(), src, from: centre(from), to }]);
    },
    [reduce],
  );

  const layer = createPortal(
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      <AnimatePresence>
        {flights.map((f) => {
          const lift = Math.min(f.from.y, f.to.y) - 110;
          return (
            <motion.span
              key={f.key}
              className="absolute top-0 left-0 -mt-5 -ml-5"
              initial={{ x: f.from.x, y: f.from.y, scale: 1, opacity: 1 }}
              animate={{
                x: [f.from.x, (f.from.x + f.to.x) / 2, f.to.x],
                y: [f.from.y, lift, f.to.y],
                scale: [1, 1.3, 0.35],
                opacity: [1, 1, 0.2],
              }}
              transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
              onAnimationComplete={() => setFlights((x) => x.filter((y) => y.key !== f.key))}
            >
              <FoodPhoto size={40} src={f.src} className="rounded-full shadow-float ring-2 ring-canvas" />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );

  return { fly, layer };
}
