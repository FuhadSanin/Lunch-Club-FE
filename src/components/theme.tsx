import { AnimatePresence, motion } from 'motion/react';
import { useSyncExternalStore, type MouseEvent } from 'react';
import { Icon } from '@/ui';
import { cn, spring } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Theme = 'light' | 'dark';
const KEY = 'lunchboard-theme';

// The theme lives on <html class="dark">, set before first paint by index.html. Every toggle
// reads it from there, so all of them agree.
const listeners = new Set<() => void>();
const current = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
  listeners.forEach((l) => l());
}

const saved = (): Theme | null => {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
};

// Follow the system setting until the person picks a theme.
const mq = window.matchMedia('(prefers-color-scheme: dark)');
mq.addEventListener('change', () => !saved() && apply(mq.matches ? 'dark' : 'light'));

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current);

  // The new theme opens as a circle from the point that was clicked (View Transitions API).
  const toggle = (e?: MouseEvent) => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || reduce || !e) return apply(next);
    const x = e.clientX, y = e.clientY;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(() => apply(next)).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  };

  return { theme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <Tooltip>
    <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn('relative overflow-hidden text-body', className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={spring}
          className="grid place-items-center"
        >
          <Icon name={dark ? 'moon' : 'sun'} size={17} />
        </motion.span>
      </AnimatePresence>
    </Button>
    </TooltipTrigger>
    <TooltipContent>{dark ? 'Light theme' : 'Dark theme'}</TooltipContent>
    </Tooltip>
  );
}
