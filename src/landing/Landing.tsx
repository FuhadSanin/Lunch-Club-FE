import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useSignIn } from '../auth';
import { useLunch, useStore } from '../store';
import { dishById } from '../data/menus';
import { Avatar, FoodPhoto, firstName, GoogleG, Mark, rupees } from '../ui';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { ThemeToggle } from '../components/theme';
import { cn, easeOut } from '../lib/cn';
import LiveDemo from './LiveDemo';
import CartBand from './CartBand';
import HowItRuns from './HowItRuns';
import Tastes from './Tastes';
import { Reveal } from './motion';

const LINKS = [
  { href: '#pick', label: 'Picking' },
  { href: '#cart', label: 'The cart' },
  { href: '#how', label: 'How it works' },
  { href: '#hosts', label: 'For hosts' },
];

export default function Landing() {
  const signIn = useSignIn();
  const start = () => void signIn();

  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-base leading-[1.6]">
      <a href="#hero-title" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2.5 focus:text-on-ink">
        Skip to content
      </a>
      <Nav onStart={start} />
      <main>
        <Tastes onStart={start} />
        <LiveDemo />
        <CartBand />
        <HowItRuns />
        <ForHosts />
        <Closing onStart={start} />
      </main>
      <Footer onStart={start} />
    </div>
  );
}

function Nav({ onStart }: { onStart: () => void }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 12));

  return (
    <motion.header
      className={cn(
        'fixed inset-x-0 top-0 z-30 transition-[background-color,box-shadow] duration-500 ease-apple',
        scrolled ? 'bg-canvas border-b border-line' : 'bg-transparent',
      )}
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: easeOut }}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8">
        <a href="#hero-title" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5 whitespace-nowrap font-semibold tracking-[-0.02em]">
          <Mark size={26} />
          Lunch Board
        </a>
        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-body transition-colors duration-200 hover:bg-soft-2 hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" variant="ghost" onClick={onStart} className="hidden sm:inline-flex">Sign in</Button>
          <Button size="sm" onClick={onStart}>Start a lunch</Button>
        </div>
      </nav>
    </motion.header>
  );
}

function Tile({ title, body, children, className, delay = 0 }: { title: string; body: string; children: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={cn('flex min-w-0 flex-col overflow-hidden rounded-3xl bg-soft p-7 sm:p-9', className)}>
      <h3 className="text-2xl font-semibold leading-7 tracking-[-0.03em]">{title}</h3>
      <p className="mt-2 max-w-md text-body">{body}</p>
      <motion.div className="mt-8 flex-1" whileHover={{ scale: 1.015 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
        {children}
      </motion.div>
    </Reveal>
  );
}

function ForHosts() {
  const { state } = useStore();
  const lunch = useLunch();
  const [autoJoin, setAutoJoin] = useState(state.org.autoJoin);
  const firstGroup = lunch.cart[0];
  const owed = lunch.picked.slice(0, 4).map((p) => ({
    p,
    amount: state.picks[p.id].items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0),
  }));

  return (
    <section id="hosts" aria-labelledby="hosts-title" className="mx-auto max-w-[1200px] px-5 pt-28 sm:px-8 md:pt-12">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-7">
          <h2 id="hosts-title" className="text-[clamp(36px,5.2vw,64px)] font-semibold leading-[1] tracking-[-0.045em]">
            Made for the person who orders.
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-5">
          <p className="text-lg leading-7 text-body">
            No spreadsheet, no screenshots of menus in the group chat, no adding up who owes what at 1 pm.
          </p>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-6">
        <Tile className="md:col-span-4" title="Names on every bag." body="Each person's name goes in the restaurant's note, so lunch comes labelled and nobody opens the wrong box.">
          {firstGroup && (
            <div data-ui className="rounded-2xl bg-canvas p-5 shadow-card">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">{firstGroup.name}</span>
                <span className="text-mute">Note for the restaurant</span>
              </div>
              <ul className="mt-3 grid gap-2">
                {firstGroup.lines.slice(0, 3).map((l) => (
                  <li key={l.dishId} className="flex items-center gap-3 text-sm">
                    <FoodPhoto size={28} className="rounded-md" />
                    <span className="min-w-0 flex-1 truncate">{l.qty} × {l.name}</span>
                    <span className="truncate text-mute">{l.people.map(firstName).slice(0, 3).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Tile>
        <Tile className="md:col-span-2" delay={0.08} title="Who owes what." body="Everyone sees their own total. The host sees the list.">
          <ul data-ui className="grid gap-2">
            {owed.map(({ p, amount }) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5 shadow-card">
                <Avatar person={p} size="sm" />
                <span className="flex-1 truncate text-sm">{p.name.split(' ')[0]}</span>
                <span className="text-sm num">{rupees(amount)}</span>
              </li>
            ))}
          </ul>
        </Tile>
        <Tile className="md:col-span-2" title="Nothing gets lost." body="Every dish, restaurant and cooking note is listed for the host, so the order in Swiggy matches the board.">
          <div data-ui className="grid place-items-center rounded-2xl bg-canvas py-8 shadow-card">
            <svg width="56" height="68" viewBox="0 0 56 68" aria-hidden="true">
              <path d="M6 4 h44 v58 l-5.5 -4 l-5.5 4 l-5.5 -4 l-5.5 4 l-5.5 -4 l-5.5 4 l-5.5 -4 l-5.5 4 Z" className="fill-canvas stroke-line-strong" strokeWidth="2" strokeLinejoin="round" />
              <rect x="13" y="13" width="22" height="4" rx="2" className="fill-ink" />
              <rect x="13" y="24" width="30" height="3" rx="1.5" className="fill-line-strong" />
              <rect x="13" y="31" width="24" height="3" rx="1.5" className="fill-line-strong" />
              <rect x="13" y="38" width="28" height="3" rx="1.5" className="fill-line-strong" />
              <circle cx="40" cy="48" r="7" className="fill-ok" />
              <path d="M36.8 48.2 l2.2 2.2 l4.2 -4.4" fill="none" className="stroke-on-ink" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="mt-3 text-sm font-medium">1 order placed</span>
            <span className="text-xs text-mute">0 duplicates</span>
          </div>
        </Tile>
        <Tile className="md:col-span-4" delay={0.08} title="Your company joins by email." body="Anyone signing in with a Google account at your domain lands on your team. No invite links to chase.">
          <div data-ui className="grid gap-4 rounded-2xl bg-canvas p-5 shadow-card">
            <div className="flex h-11 items-center gap-3 rounded-xl bg-soft px-3.5 text-sm">
              <GoogleG />
              <span><span className="text-mute">anyone@</span><span className="font-medium">{state.org.emailDomain}</span></span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <Label htmlFor="demo-join" className="font-normal">Let company emails join without an invite</Label>
              <Switch id="demo-join" checked={autoJoin} onCheckedChange={setAutoJoin} />
            </div>
          </div>
        </Tile>
      </div>
    </section>
  );
}

function Closing({ onStart }: { onStart: () => void }) {
  const { state } = useStore();
  return (
    <section aria-labelledby="close-title" className="mx-auto max-w-[1200px] px-5 pt-28 pb-28 sm:px-8 sm:pt-48">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 md:grid-cols-12 md:gap-8">
        <Reveal className="md:col-span-5">
          <motion.img
            src="/illustrations/tiffin.png"
            alt="A four-tier tiffin carrier with a turned-wood handle and an order ticket tied to it."
            width={840}
            height={1280}
            loading="lazy"
            decoding="async"
            whileHover={{ rotate: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="mx-auto aspect-[420/640] w-full max-w-[220px] select-none dark:invert md:max-w-[360px]"
          />
        </Reveal>
        <Reveal delay={0.1} className="md:col-span-7">
          <h2 id="close-title" className="text-[clamp(36px,5.2vw,64px)] font-semibold leading-[1] tracking-[-0.045em]">
            Picks close at {state.session.cutoff}.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-7 text-body">
            Start today's board now and the whole team picks before the cutoff. One link, one board, one order.
          </p>
          <Button size="lg" onClick={onStart} className="mt-10 pl-2">
            <span className="grid size-8 place-items-center rounded-full bg-white"><GoogleG /></span>
            Continue with Google
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ onStart }: { onStart: () => void }) {
  return (
    <footer className="bg-soft">
      <div className="mx-auto max-w-[1200px] px-5 pt-16 pb-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-body">
            {LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className="hover:text-ink">{l.label}</a></li>
            ))}
            <li><Button variant="link" onClick={onStart} className="h-auto p-0 font-normal text-body hover:text-ink">Sign in</Button></li>
          </ul>
          <p className="max-w-md text-[13px] leading-5 text-mute sm:text-right">
            Demo build with sample people and picks. Menus come from saved Swiggy listings. Illustrations drawn for Lunch Board. Set in Geist (SIL Open Font License).
          </p>
        </div>
        <p className="mt-6 text-[13px] leading-5 text-body">
          Restaurant photos via Wikimedia Commons. KFC: <a className="underline underline-offset-2 hover:text-ink" href="https://commons.wikimedia.org/wiki/File:Looking_down_into_KFC_bucket_of_fried_chicken_(34956588243).jpg">“Looking down into KFC bucket of fried chicken (34956588243)”</a> by Willis Lam, <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/2.0">CC BY-SA 2.0</a>;{' '}
          Burger King: <a className="underline underline-offset-2 hover:text-ink" href="https://commons.wikimedia.org/wiki/File:WHOPPER_with_Cheese,_at_Burger_King_(2014.05.04).jpg">“WHOPPER with Cheese, at Burger King (2014.05.04)”</a> by Lombroso, <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>;{' '}
          Hotel Saravana Bhavan: <a className="underline underline-offset-2 hover:text-ink" href="https://commons.wikimedia.org/wiki/File:Saravana_Bhavan.jpg">“Saravana Bhavan”</a> by User:Marcus334, <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/2.0">CC BY-SA 2.0</a>;{' '}
          Baskin Robbins: <a className="underline underline-offset-2 hover:text-ink" href="https://commons.wikimedia.org/wiki/File:Ice_cream_flavors_at_a_Baskin-Robbins_ice_cream_parlor_in_Ooltewah,_Tennessee.jpg">“Ice cream flavors at a Baskin-Robbins ice cream parlor in Ooltewah, Tennessee”</a> by Harrison Keely, <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>;{' '}
          Domino's: <a className="underline underline-offset-2 hover:text-ink" href="https://commons.wikimedia.org/wiki/File:Domino%27s_Pizza_in_India.jpg">“Domino's Pizza in India”</a> by Gannu03, <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>;{' '}
          McDonald's: <a className="underline underline-offset-2 hover:text-ink" href="https://commons.wikimedia.org/wiki/File:McDonald%27s_India_(32331353336).jpg">“McDonald's India (32331353336)”</a> by Martin Lewison from Forest Hills, NY, U.S.A., <a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/2.0">CC BY-SA 2.0</a>.
        </p>
        <motion.p
          aria-hidden="true"
          className="mt-14 select-none text-[clamp(56px,15.5vw,200px)] font-semibold leading-[0.9] tracking-[-0.06em] text-ink"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: easeOut }}
        >
          Lunch Board
        </motion.p>
      </div>
    </footer>
  );
}
