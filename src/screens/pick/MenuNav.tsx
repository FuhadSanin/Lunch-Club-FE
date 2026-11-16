import { motion } from 'motion/react';
import type { Category } from '@/model';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, spring } from '@/lib/cn';

// Beside a long menu on wide screens: its sections, with the one in view marked. Jumps to one.
export function MenuNav({ restaurantName, categories, active, onJump }: {
  restaurantName: string;
  categories: Category[];
  active: number; // the section in view
  onJump: (section: number) => void;
}) {
  return (
    <motion.div
      className="max-lg:hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={spring}
    >
      <Card aria-labelledby="menu-nav-title" className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle id="menu-nav-title">Menu</CardTitle>
          <CardAction><span className="text-xs text-muted-foreground num">{categories.reduce((n, c) => n + c.dishes.length, 0)} dishes</span></CardAction>
        </CardHeader>
        <CardContent className="px-2">
          <nav aria-label={`${restaurantName} menu sections`} className="no-scrollbar max-h-[min(44vh,420px)] overflow-y-auto">
            <ul className="grid gap-0.5">
              {categories.map((c, n) => {
                const on = active === n;
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => onJump(n)}
                      aria-current={on ? 'location' : undefined}
                      className={cn(
                        'relative flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {on && <motion.span layoutId="menu-nav-pill" transition={spring} className="absolute inset-0 rounded-lg bg-muted" />}
                      {on && <motion.span layoutId="menu-nav-bar" transition={spring} className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-foreground" />}
                      <span className="relative truncate">{c.name}</span>
                      <span className="relative text-xs text-muted-foreground num">{c.dishes.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </CardContent>
      </Card>
    </motion.div>
  );
}
