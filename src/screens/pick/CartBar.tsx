import { motion } from 'motion/react';
import type { Ref } from 'react';
import { rupees } from '@/ui';
import { spring } from '@/lib/cn';

// On a phone: a bar at the bottom with the cart's count and total. Tapping it scrolls to Your pick.
export function CartBar({ ref, count, total }: { ref: Ref<HTMLAnchorElement>; count: number; total: number }) {
  return (
    <motion.a
      ref={ref}
      href="#your-pick"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={spring}
      onClick={(e) => { e.preventDefault(); document.getElementById('your-pick')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}
      className="fixed inset-x-4 bottom-4 z-20 flex h-14 items-center justify-between gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-modal lg:hidden"
    >
      <span className="num">{count} {count === 1 ? 'dish' : 'dishes'} · {rupees(total)}</span>
      <span>Review my pick</span>
    </motion.a>
  );
}
