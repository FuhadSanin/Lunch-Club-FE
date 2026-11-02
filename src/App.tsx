import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ME_ID, personById, type Role } from './data/demo';
import { useLunch, useStore } from './store';
import { Avatar, Icon, Mark, useHashRoute } from './ui';
import { Segmented } from './components/ui/segmented';
import { ThemeToggle } from './components/theme';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { cn, easeOut, spring } from './lib/cn';
import Home from './screens/Home';
import PickScreen from './screens/Pick';
import OrderScreen from './screens/Order';
import NewLunch from './screens/NewLunch';
import Settings from './screens/Settings';
import Landing from './landing/Landing';

type NavItem = { to: string; label: string; icon: string; roles: Role[] };

const NAV: NavItem[] = [
  { to: '/', label: "Today's lunch", icon: 'today', roles: ['member', 'host'] },
  { to: '/pick', label: 'Pick my lunch', icon: 'pick', roles: ['member', 'host'] },
  { to: '/order', label: 'Review and order', icon: 'order', roles: ['host'] },
  { to: '/new', label: 'Start a lunch', icon: 'new', roles: ['host'] },
  { to: '/settings', label: 'Settings', icon: 'settings', roles: ['host'] },
];

const ROLE_LABEL: Record<Role, string> = { member: 'Team member', host: 'Host' };

export default function App() {
  const { state } = useStore();
  const [route] = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [route]);

  if (!state.signedIn) return <Landing />;

  const items = NAV.filter((n) => n.roles.includes(state.role));
  const current = items.some((n) => n.to === route) ? route : '/';
  const title = items.find((n) => n.to === current)?.label ?? "Today's lunch";

  let screen;
  switch (current) {
    case '/pick': screen = <PickScreen />; break;
    case '/order': screen = <OrderScreen />; break;
    case '/new': screen = <NewLunch />; break;
    case '/settings': screen = <Settings />; break;
    default: screen = <Home />;
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#main"
        onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2.5 focus:text-on-ink"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-canvas px-3 border-b border-line lg:hidden">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
        </Button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={title}
            className="flex-1 truncate text-[15px] font-semibold"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {title}
          </motion.span>
        </AnimatePresence>
        <ThemeToggle />
        <Mark size={26} />
      </header>

      <aside aria-label="Main" className="sticky top-0 hidden h-dvh bg-soft border-r border-line lg:flex">
        <Sidebar items={items} current={current} />
      </aside>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 lg:hidden dark:bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              aria-label="Main"
              className="fixed inset-y-0 left-0 z-50 flex w-[min(320px,86vw)] overscroll-contain bg-soft shadow-modal lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={spring}
            >
              <Sidebar items={items} current={current} onClose={() => setMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main id="main" tabIndex={-1} className="min-w-0 px-4 pt-6 pb-24 outline-none sm:px-6 lg:px-10 lg:pt-12">
        <div className="mx-auto max-w-[1100px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              {screen}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ items, current, onClose }: { items: NavItem[]; current: string; onClose?: () => void }) {
  const { state, dispatch } = useStore();
  const lunch = useLunch();
  const me = personById(ME_ID)!;
  const layoutKey = onClose ? 'nav-pill-drawer' : 'nav-pill';

  return (
    <div className="flex w-full flex-col px-3 pt-5 pb-4">
      <div className="flex items-center justify-between px-2.5 pb-5">
        <a href="#/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]">
          <Mark />
          Lunch Board
        </a>
        {onClose && (
          <Button variant="ghost" size="icon" aria-label="Close menu" onClick={onClose}>
            <Icon name="close" size={18} />
          </Button>
        )}
      </div>

      <Card size="sm" className="mx-1 mb-5 gap-0 px-3 py-2.5">
        <div className="text-sm font-semibold">{state.org.team}</div>
        <div className="truncate text-xs text-mute">{state.org.name} · demo data</div>
      </Card>

      <nav className="grid gap-0.5">
        {items.map((n) => {
          const on = current === n.to;
          return (
            <a
              key={n.to}
              href={`#${n.to}`}
              aria-current={on ? 'page' : undefined}
              onClick={onClose}
              className={cn(
                'relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-200',
                on ? 'font-medium text-ink' : 'text-body hover:bg-soft-2 hover:text-ink',
              )}
            >
              {on && <motion.span layoutId={layoutKey} transition={spring} className="absolute inset-0 rounded-lg bg-canvas shadow-card" />}
              <span className="relative flex flex-1 items-center gap-2.5">
                <Icon name={n.icon} className={on ? 'text-ink' : 'text-mute'} />
                {n.label}
                {n.to === '/order' && state.session.status === 'open' && (
                  <span className="ml-auto text-xs text-mute num" aria-label={`${lunch.waiting.length} still to pick`}>{lunch.waiting.length}</span>
                )}
              </span>
            </a>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-4 px-1.5 pt-4">
        <div className="grid gap-1.5">
          <span className="text-xs text-mute">View the demo as</span>
          <Segmented<Role>
            fill
            label="View the demo as"
            value={state.role}
            onChange={(role) => dispatch({ type: 'setRole', role })}
            className="flex w-full"
            options={[
              { value: 'member', label: 'Member' },
              { value: 'host', label: 'Host' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <Avatar person={me} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{me.name}</div>
            <div className="text-xs text-mute">{ROLE_LABEL[state.role]}</div>
          </div>
          <ThemeToggle className="text-mute" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-mute" onClick={() => dispatch({ type: 'signOut' })} aria-label="Sign out">
                <Icon name="out" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
