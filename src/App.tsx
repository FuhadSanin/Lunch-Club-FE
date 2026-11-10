import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { personById, type Role } from './data/demo';
import { isDemoPreview, useSignOut } from './auth';
import { useGoogleUser } from './lib/firebase';
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
import ReviewScreen from './screens/Order';
import PlaceOrder from './screens/steps/PlaceOrder';
import Collect from './screens/steps/Collect';
import Distribute from './screens/steps/Distribute';
import Finish from './screens/steps/Finish';
import { STEPS, canOpen } from './lib/steps';
import { StepDot, useLunchSteps } from './components/steps';
import NewLunch from './screens/NewLunch';
import Settings from './screens/Settings';
import Landing from './landing/Landing';
import { LiveStore } from './live';
import { NoLunch } from './screens/NoLunch';

// Everyone: the dashboard and their own pick. Hosts also run the lunch, step by step (src/lib/steps.ts),
// and have Settings at the bottom.
const MAIN = [
  { to: '/', label: "Today's lunch", icon: 'today' },
  { to: '/pick', label: 'Pick my lunch', icon: 'pick' },
];
const routesFor = (role: Role) => [...MAIN.map((n) => n.to), ...(role === 'host' ? [...STEPS.map((s) => s.route), '/settings'] : [])];
const titleOf = (route: string) =>
  MAIN.find((n) => n.to === route)?.label ?? STEPS.find((s) => s.route === route)?.label ?? (route === '/settings' ? 'Settings' : "Today's lunch");

const ROLE_LABEL: Record<Role, string> = { member: 'Team member', host: 'Host' };

export default function App() {
  const { state } = useStore();
  const google = useGoogleUser();
  if (google === undefined && !isDemoPreview()) return null; // a moment while Firebase restores a sign-in
  // Signed in means signed in with Google; only the demo preview signs in without it.
  const signedIn = isDemoPreview() ? state.signedIn : !!google;
  if (!signedIn) return <Landing />;
  return (
    <LiveStore>
      <Shell />
    </LiveStore>
  );
}

function Shell() {
  const { state, live } = useStore();
  const [route] = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [route]);

  // Steps go in order: a step still to come opens the one to do now instead.
  const steps = useLunchSteps();
  const known = routesFor(state.role).includes(route) ? route : '/';
  const ahead = STEPS.find((s) => s.route === known && !canOpen(s.id, steps.current));
  const current = ahead ? STEPS.find((s) => s.id === steps.current)!.route : known;
  useEffect(() => {
    if (ahead) window.location.replace(`#${current}`);
  }, [ahead, current]);
  const title = titleOf(current);

  let screen;
  switch (current) {
    case '/pick': screen = <PickScreen />; break;
    case '/new': screen = <NewLunch />; break;
    case '/review': screen = <ReviewScreen />; break;
    case '/order': screen = <PlaceOrder />; break;
    case '/collect': screen = <Collect />; break;
    case '/distribute': screen = <Distribute />; break;
    case '/finish': screen = <Finish />; break;
    case '/settings': screen = <Settings />; break;
    default: screen = <Home />;
  }
  // With no lunch running (none on the API, or the demo's is complete), today's screens and the
  // steps after "start" have nothing to show yet.
  const noLunch = live ? !live.lunchId : !!state.session.completed;
  if (noLunch && !['/new', '/settings'].includes(current)) screen = <NoLunch canHost={live ? live.canHost : state.role === 'host'} />;

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
        <Sidebar current={current} />
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
              <Sidebar current={current} onClose={() => setMenuOpen(false)} />
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

function Sidebar({ current, onClose }: { current: string; onClose?: () => void }) {
  const { state, dispatch, meId: ME_ID, live } = useStore();
  const signOut = useSignOut();
  const lunch = useLunch();
  const { states, current: now, progress } = useLunchSteps();
  const me = personById(ME_ID)!;
  const layoutKey = onClose ? 'nav-pill-drawer' : 'nav-pill';
  const host = state.role === 'host';

  const link = (to: string, on: boolean, body: ReactNode, label?: string, locked?: string) =>
    locked ? (
      <span
        key={to}
        aria-disabled="true"
        aria-label={label}
        title={locked}
        className="relative flex min-h-9 cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-mute opacity-70"
      >
        <span className="relative flex flex-1 items-center gap-2.5">{body}</span>
      </span>
    ) : (
    <a
      key={to}
      href={`#${to}`}
      aria-current={on ? 'page' : undefined}
      aria-label={label}
      onClick={onClose}
      className={cn(
        'relative flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200',
        on ? 'font-medium text-ink' : 'text-body hover:bg-soft-2 hover:text-ink',
      )}
    >
      {on && <motion.span layoutId={layoutKey} transition={spring} className="absolute inset-0 rounded-lg bg-canvas shadow-card" />}
      <span className="relative flex flex-1 items-center gap-2.5">{body}</span>
    </a>
  );

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
        <div className="truncate text-xs text-mute">{live ? `${state.org.emailDomain} · live` : `${state.org.name} · demo data`}</div>
      </Card>

      <nav className="grid gap-0.5" aria-label="Your lunch">
        {MAIN.map((n) => link(n.to, current === n.to, (
          <>
            <Icon name={n.icon} className={current === n.to ? 'text-ink' : 'text-mute'} />
            {n.label}
            {n.to === '/' && state.session.status === 'open' && (!live || live.lunchId) && lunch.waiting.length > 0 && (
              <span className="ml-auto text-xs text-mute num" aria-label={`${lunch.waiting.length} still to pick`}>{lunch.waiting.length}</span>
            )}
          </>
        )))}
      </nav>

      {host && (
        <nav className="mt-6 grid gap-0.5" aria-labelledby={`${layoutKey}-run`}>
          <span id={`${layoutKey}-run`} className="px-3 pb-1.5 text-xs font-medium text-mute">Run the lunch</span>
          {STEPS.map((s, i) => {
            const p = progress[s.id];
            const st = states[s.id];
            return link(s.route, current === s.route, (
              <>
                <StepDot n={i + 1} state={st} size={20} />
                <span className={cn(st === 'todo' && current !== s.route && 'text-mute', s.id === now && 'font-semibold text-ink')}>{s.label}</span>
                {p && p.of > 0 && st !== 'todo' && <span className="ml-auto text-xs text-mute num">{p.done}/{p.of}</span>}
              </>
            ), `Step ${i + 1}: ${s.label}${st === 'done' ? ', done' : st === 'now' ? ', now' : ', not yet'}`,
              canOpen(s.id, now) ? undefined : `Finish "${STEPS.find((x) => x.id === now)!.label}" first`);
          })}
        </nav>
      )}

      {host && (
        <nav className="mt-auto grid gap-0.5 pt-6" aria-label="Settings">
          {link('/settings', current === '/settings', (
            <>
              <Icon name="settings" className={current === '/settings' ? 'text-ink' : 'text-mute'} />
              Settings
            </>
          ))}
        </nav>
      )}

      <div className={cn("grid gap-4 px-1.5 pt-4", !host && "mt-auto")}>
        {!live && <div className="grid gap-1.5">
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
        </div>}
        <div className="flex items-center gap-2.5">
          <Avatar person={me} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{me.name}</div>
            <div className="text-xs text-mute">{ROLE_LABEL[state.role]}</div>
          </div>
          <ThemeToggle className="text-mute" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-mute" onClick={() => void signOut()} aria-label="Sign out">
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
