import { AnimatePresence, motion } from 'motion/react';
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import type { Role } from '@/model';
import { personById } from '@/data/people';
import { useSignOut } from './auth';
import { useLunch, useStore } from './store';
import { Avatar, Icon, Mark, useHashRoute } from './ui';
import { Segmented } from './components/ui/segmented';
import { ThemeToggle } from './components/theme';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { cn, easeOut, spring } from './lib/cn';
import { STEPS, canOpen } from './lib/steps';
import { StepDot, useLunchSteps } from './components/steps';
import { LiveStore } from './live';
import { JoinParty } from './screens/JoinParty';
import { ActivePartyCard, useActiveParty } from './components/party-card';
import { NoLunch } from './screens/NoLunch';
import { PageSkeleton } from './components/skeletons';
import { NotificationSync, NotificationsBell, NotificationsToggle } from './components/Notifications';

// Each screen is fetched when it is first opened, and all of them ahead of time once the app is idle.
const Home = lazy(() => import('./screens/Home'));
const PickScreen = lazy(() => import('./screens/Pick'));
const ReviewScreen = lazy(() => import('./screens/Order'));
const PlaceOrder = lazy(() => import('./screens/steps/PlaceOrder'));
const Collect = lazy(() => import('./screens/steps/Collect'));
const Distribute = lazy(() => import('./screens/steps/Distribute'));
const Finish = lazy(() => import('./screens/steps/Finish'));
const NewLunch = lazy(() => import('./screens/NewLunch'));
const Settings = lazy(() => import('./screens/Settings'));
const Connect = lazy(() => import('./screens/Connect'));
const LocalMenus = lazy(() => import('./screens/LocalMenus'));
const Authorize = lazy(() => import('./screens/Authorize'));
const preloadScreens = () => void Promise.all([import('./screens/Home'), import('./screens/Pick'), import('./screens/Order'), import('./screens/steps/PlaceOrder'), import('./screens/steps/Collect'), import('./screens/steps/Distribute'), import('./screens/steps/Finish'), import('./screens/NewLunch'), import('./screens/Settings'), import('./screens/Connect')]).catch(() => undefined); // only a head start: a failure shows when the screen is opened

// Everyone: the dashboard and their own pick. Hosts also run the lunch, step by step (src/lib/steps.ts),
// and have Settings at the bottom.
const MAIN = [
  { to: '/', label: "Today's food party", icon: 'today' },
  { to: '/pick', label: 'Pick my food', icon: 'pick' },
];
const routesFor = (role: Role) => [...MAIN.map((n) => n.to), ...(role === 'host' ? [...STEPS.map((s) => s.route), '/settings'] : [])];
const titleOf = (route: string) =>
  MAIN.find((n) => n.to === route)?.label ??
  STEPS.find((s) => s.route === route)?.label ??
  (route === '/settings' ? 'Settings' : route === '/connect' ? 'Connect to an AI assistant' : route === '/menus' ? 'Local menu' : "Today's food party");

const ROLE_LABEL: Record<Role, string> = { member: 'Team member', host: 'Host' };

// The signed-in app: the store filled from the API (or the demo's), around the sidebar and the screen.
export default function SignedIn() {
  const [route] = useHashRoute();
  // An AI assistant asking to connect (#/authorize/<id>) is a page of its own, without the sidebar: a
  // person who has only just signed in answers it before anything else.
  const request = /^\/authorize\/([0-9a-f-]{36})$/i.exec(route)?.[1];
  if (request) {
    return (
      <Suspense fallback={<PageSkeleton label="Loading the request" />}>
        <Authorize id={request.toLowerCase()} />
      </Suspense>
    );
  }
  return (
    <LiveStore>
      <Shell />
    </LiveStore>
  );
}

function Shell() {
  const { state, live } = useStore();
  const [hashRoute] = useHashRoute();
  // A shared lunch link (#/lunch/<id>) opens Pick my lunch for that lunch.
  const route = hashRoute.replace(/^\/lunch\/[^/]+$/, '/pick');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [route]);
  // The other screens are fetched once this one has settled, so opening one shows it at once.
  useEffect(() => {
    const timer = window.setTimeout(preloadScreens, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // Steps go in order: a step still to come opens the one to do now instead.
  const steps = useLunchSteps();
  // A person with a public email can start their own lunch from anywhere, even while a guest in another's.
  const allowed = [...routesFor(state.role), ...(live?.personal && live.canHost ? ['/new'] : []), ...(live ? ['/connect'] : []), ...(live?.canHost ? ['/menus'] : [])];
  const known = allowed.includes(route) ? route : '/';
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
    case '/connect': screen = <Connect />; break;
    case '/menus': screen = <LocalMenus />; break;
    default: screen = <Home />;
  }
  // With no lunch running (none on the API, or the demo's is complete), today's screens and the
  // steps after "start" have nothing to show yet.
  const noLunch = live ? !live.lunchId : !!state.session.completed;
  if (noLunch && !['/new', '/settings', '/connect', '/menus'].includes(current)) screen = <NoLunch canHost={live ? live.canHost : state.role === 'host'} />;
  // A shared link to a party not joined yet: ask first.
  // (a shared link to a party not joined yet asks first: the JoinParty pop-up below)

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
        {live && <NotificationsBell />}
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
              <Suspense fallback={<PageSkeleton label={`Loading ${title}`} />}>{screen}</Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {live?.invite && <JoinParty invite={live.invite} />}
      {live && <NotificationSync />}
    </div>
  );
}

function Sidebar({ current, onClose }: { current: string; onClose?: () => void }) {
  const { state, dispatch, meId: ME_ID, live } = useStore();
  const signOut = useSignOut();
  // Signing out asks first: the icon is small and sits next to the theme switch.
  const [leaving, setLeaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const confirmSignOut = () => {
    setSigningOut(true);
    void signOut().finally(() => setSigningOut(false));
  };
  const lunch = useLunch();
  const { states, current: now, progress } = useLunchSteps();
  const me = personById(ME_ID)!;
  const layoutKey = onClose ? 'nav-pill-drawer' : 'nav-pill';
  const host = state.role === 'host';
  const party = useActiveParty(); // a personal party you're in, shown with its way out

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
          Tiffmate
        </a>
        {live && !onClose && <NotificationsBell />}
        {onClose && (
          <Button variant="ghost" size="icon" aria-label="Close menu" onClick={onClose}>
            <Icon name="close" size={18} />
          </Button>
        )}
      </div>

      {/* A personal party shows a card only while you're in one (with its way out); a company shows its team. */}
      {live?.personal ? (
        party && (
          <Card size="sm" className="mx-1 mb-5 gap-0 px-3 py-2.5">
            <ActivePartyCard lunch={party} onNavigate={onClose} />
          </Card>
        )
      ) : (
        <Card size="sm" className="mx-1 mb-5 gap-0 px-3 py-2.5">
          <div className="text-sm font-semibold">{state.org.team}</div>
          <div className="truncate text-xs text-mute">{live ? `${state.org.emailDomain} · live` : `${state.org.name} · demo data`}</div>
        </Card>
      )}

      <nav className="grid gap-0.5" aria-label="Your food party">
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

      {live?.personal && live.canHost && !host && link('/new', current === '/new', (
        <>
          <Icon name="today" className={current === '/new' ? 'text-ink' : 'text-mute'} />
          {party ? 'My food party' : 'Start a food party'}
        </>
      ))}

      {host && (
        <nav className="mt-6 grid gap-0.5" aria-labelledby={`${layoutKey}-run`}>
          <span id={`${layoutKey}-run`} className="px-3 pb-1.5 text-xs font-medium text-mute">Run the food party</span>
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

      {live && (
        <nav className="mt-5 grid gap-1 rounded-2xl border border-warn/25 bg-card/70 p-1.5 shadow-xs" aria-labelledby={`${layoutKey}-trend`}>
          <span id={`${layoutKey}-trend`} className="flex min-h-9 items-center gap-2.5 rounded-lg bg-warn-soft px-3 text-sm font-semibold text-ink dark:bg-warn/15">
            <Icon name="flame" size={16} className="flame-flicker text-warn" /> Trending
            <span aria-hidden="true" className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-warn/20 px-1.5 text-[11px] font-semibold text-warn num">{live.canHost ? 2 : 1}</span>
          </span>
          {live.canHost && link('/menus', current === '/menus', (
            <>
              <Icon name="store" className={current === '/menus' ? 'text-ink' : 'text-mute'} />
              Local menu
            </>
          ))}
          {link('/connect', current === '/connect', (
            <>
              <Icon name="plug" className={current === '/connect' ? 'text-ink' : 'text-mute'} />
              <span className="min-w-0 truncate">Connect to an AI assistant</span>
            </>
          ))}
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

      {live && <div className={cn('px-1.5 pt-2', !host && 'mt-auto')}><NotificationsToggle /></div>}

      <div className={cn("grid gap-4 px-1.5 pt-4", !host && !live && "mt-auto")}>
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
            {me.email && <div className="truncate text-xs text-mute" title={me.email}>{me.email}</div>}
            <div className="text-xs text-mute">{ROLE_LABEL[state.role]}</div>
          </div>
          <ThemeToggle className="text-mute" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-mute" onClick={() => setLeaving(true)} aria-label="Sign out">
                <Icon name="out" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
          <Dialog open={leaving} onOpenChange={(o) => !signingOut && setLeaving(o)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign out of Tiffmate?</DialogTitle>
                <DialogDescription>
                  {live ? "Your picks and today's food party stay as they are. Sign in again with Google whenever you like." : 'You go back to the landing page. The demo keeps its picks.'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" disabled={signingOut} onClick={() => setLeaving(false)}>Stay signed in</Button>
                <Button disabled={signingOut} onClick={confirmSignOut}>{signingOut ? 'Signing out…' : 'Sign out'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

