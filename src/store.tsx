import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  DEMO_NOW, DEMO_ORG, DEMO_PICKS, DEMO_SESSION, ME_ID, PEOPLE,
  type BotStep, type Org, type Person, type Pick, type PickLine, type Role, type Session,
} from './data/demo';
import type { ApiOrder } from './api/types';
import { dishById, restaurantById, useMenus } from './data/menus';

export type State = {
  signedIn: boolean;
  role: Role; // demo only: who you are viewing the app as
  session: Session;
  picks: Record<string, Pick>;
  org: Org;
  swiggyLinked: boolean;
};

export type Action =
  | { type: 'signIn' }
  | { type: 'signOut' }
  | { type: 'setRole'; role: Role }
  | { type: 'savePick'; userId: string; items: PickLine[]; note: string }
  | { type: 'skip'; userId: string }
  | { type: 'completePick'; userId: string; items: PickLine[]; note: string }
  | { type: 'reopenPick'; userId: string }
  | { type: 'lock' }
  | { type: 'reopen' }
  | { type: 'startPlacing' }
  | { type: 'botStep'; step: BotStep }
  | { type: 'placed'; orderRef: string }
  | { type: 'delivered' }
  | { type: 'handOut'; userId: string; done: boolean }
  | { type: 'arrive'; restaurantId: string; done: boolean }
  | { type: 'finishLunch' }
  | { type: 'check'; key: string; done: boolean }
  | { type: 'newSession'; cutoff: string; address: string; restaurantIds: string[] }
  | { type: 'updateOrg'; org: Partial<Org> }
  | { type: 'reset' };

const KEY = 'lunchboard-demo-v2'; // v2: today's lunch offers the well-known chains

const initial = (): State => ({
  signedIn: false,
  role: 'host',
  session: DEMO_SESSION,
  picks: DEMO_PICKS,
  org: DEMO_ORG,
  swiggyLinked: true,
});

function load(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    const preview = window.location.search.includes('demo=signed-in'); // for screenshots and checks
    if (raw) {
      const saved = JSON.parse(raw);
      // Saved demos from before: "admin" is now the host, and orgs gain the lunch defaults.
      const role: Role = saved.role === 'member' ? 'member' : 'host';
      return { ...initial(), ...saved, role, org: { ...DEMO_ORG, ...saved.org }, ...(preview ? { signedIn: true } : {}) };
    }
    if (preview) return { ...initial(), signedIn: true };
  } catch {
    /* storage can be unavailable; fall back to the demo state */
  }
  return initial();
}

// When someone changes their pick, their own review mark and the marks of every restaurant in the old or new
// pick are cleared, so the host checks them again.
function uncheck(s: State, userId: string, items: PickLine[]): Session {
  const touched = [...(s.picks[userId]?.items ?? []), ...items].map((l) => `r:${dishById(l.dishId)?.restaurant.id}`);
  const checked = Object.fromEntries(Object.entries(s.session.checked ?? {}).filter(([k]) => k !== `p:${userId}` && !touched.includes(k)));
  return { ...s.session, checked };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'signIn':
      return { ...s, signedIn: true };
    case 'signOut':
      return { ...s, signedIn: false };
    case 'setRole':
      return { ...s, role: a.role };
    case 'savePick':
      if (s.session.status !== 'open') return s;
      return {
        ...s,
        picks: { ...s.picks, [a.userId]: { items: a.items, note: a.note, skipped: false, updatedAt: DEMO_NOW } },
        session: uncheck(s, a.userId, a.items),
      };
    case 'skip':
      if (s.session.status !== 'open' || s.picks[a.userId]?.done) return s;
      return { ...s, picks: { ...s.picks, [a.userId]: { items: [], note: '', skipped: true, updatedAt: DEMO_NOW, done: true } }, session: uncheck(s, a.userId, []) };
    case 'completePick':
      if (s.session.status !== 'open' || s.picks[a.userId]?.done || !a.items.length) return s;
      return {
        ...s,
        picks: { ...s.picks, [a.userId]: { items: a.items, note: a.note, skipped: false, updatedAt: DEMO_NOW, done: true } },
        session: uncheck(s, a.userId, a.items),
      };
    case 'reopenPick': {
      // The host lets them change it: a completed order becomes editable, a skipped day goes back to "to pick".
      const pick = s.picks[a.userId];
      if (s.session.status !== 'open' || !pick) return s;
      const picks = { ...s.picks };
      if (pick.skipped) delete picks[a.userId];
      else picks[a.userId] = { ...pick, done: false };
      return { ...s, picks };
    }
    case 'lock':
      return s.session.status === 'open' ? { ...s, session: { ...s.session, status: 'locked' } } : s;
    case 'reopen':
      return s.session.status === 'locked' ? { ...s, session: { ...s.session, status: 'open' } } : s;
    case 'startPlacing':
      return s.session.status === 'locked' ? { ...s, session: { ...s.session, status: 'placing', bot: [] } } : s;
    case 'botStep':
      return { ...s, session: { ...s.session, bot: [...s.session.bot, a.step] } };
    case 'placed':
      return { ...s, session: { ...s.session, status: 'placed', orderRef: a.orderRef } };
    case 'delivered':
      return { ...s, session: { ...s.session, status: 'delivered' } };
    case 'check':
      return { ...s, session: { ...s.session, checked: { ...s.session.checked, [a.key]: a.done } } };
    case 'arrive': {
      // Collected per restaurant; once every restaurant's food is in, the lunch has arrived.
      const arrived = { ...s.session.arrived, [a.restaurantId]: a.done };
      const all = summarise(s.session, s.picks).cart.every((g) => arrived[g.restaurantId]);
      const status = s.session.status === 'placed' && all ? 'delivered' : s.session.status;
      return { ...s, session: { ...s.session, arrived, status } };
    }
    case 'finishLunch':
      // The demo's one lunch ends: completed after hand-out, or simply closed to start the next.
      return { ...s, session: { ...s.session, completed: true } };
    case 'handOut':
      return { ...s, session: { ...s.session, handedOut: { ...s.session.handedOut, [a.userId]: a.done } } };
    case 'newSession':
      return {
        ...s,
        picks: {},
        session: {
          ...DEMO_SESSION,
          id: `s-${Date.now()}`,
          cutoff: a.cutoff,
          address: a.address,
          restaurantIds: a.restaurantIds,
        },
      };
    case 'updateOrg':
      return { ...s, org: { ...s.org, ...a.org } };
    case 'reset':
      return { ...initial(), signedIn: s.signedIn };
  }
}

// What the signed-in app knows when it runs on the API instead of the demo data.
export type Live = {
  lunchId: string | null; // null: no lunch running
  canHost: boolean;
  canReopen: boolean; // let someone who completed their order or skipped pick again
  canManageMembers: boolean; // make people hosts
  orders: ApiOrder[]; // the lunch's Swiggy checkouts, once picks lock
  busy: boolean; // a change is on its way to the API
};

export type Store = {
  state: State;
  dispatch: (a: Action) => void | Promise<unknown>; // on the API, some actions finish later
  people: Person[]; // the whole team
  meId: string;
  now: string; // HH:MM
  live: Live | null; // null: the demo
};

export const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch, people: PEOPLE, meId: ME_ID, now: DEMO_NOW, live: null }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

// ---------- derived figures (computed from rows, never typed in) ----------

export type CartLine = { dishId: string; name: string; price: number; veg: boolean; qty: number; people: string[] };
export type CartGroup = { restaurantId: string; name: string; lines: CartLine[]; dishes: number; total: number };

export function useLunch() {
  const { state, people } = useStore();
  const menus = useMenus(); // dishes from live menus can arrive after the picks
  return useMemo(() => summarise(state.session, state.picks, people), [state.session, state.picks, people, menus]);
}

export function summarise(session: Session, picks: Record<string, Pick>, people: Person[] = PEOPLE) {
  const PEOPLE = people;
  const picked = PEOPLE.filter((p) => picks[p.id] && !picks[p.id].skipped && picks[p.id].items.length > 0);
  const skipped = PEOPLE.filter((p) => picks[p.id]?.skipped);
  const waiting = PEOPLE.filter((p) => !picks[p.id] || (!picks[p.id].skipped && picks[p.id].items.length === 0));

  const groups = new Map<string, CartGroup>();
  for (const p of picked) {
    for (const line of picks[p.id].items) {
      const found = dishById(line.dishId);
      if (!found) continue;
      const { dish, restaurant } = found;
      let g = groups.get(restaurant.id);
      if (!g) {
        g = { restaurantId: restaurant.id, name: restaurant.name, lines: [], dishes: 0, total: 0 };
        groups.set(restaurant.id, g);
      }
      let l = g.lines.find((x) => x.dishId === dish.id);
      if (!l) {
        l = { dishId: dish.id, name: dish.name, price: dish.price, veg: dish.veg, qty: 0, people: [] };
        g.lines.push(l);
      }
      l.qty += line.qty;
      l.people.push(p.id);
      g.dishes += line.qty;
      g.total += line.qty * dish.price;
    }
  }
  const cart = session.restaurantIds
    .map((id) => groups.get(id))
    .filter((g): g is CartGroup => !!g)
    .concat([...groups.values()].filter((g) => !session.restaurantIds.includes(g.restaurantId)));
  cart.forEach((g) => g.lines.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)));

  const dishes = cart.reduce((n, g) => n + g.dishes, 0);
  const total = cart.reduce((n, g) => n + g.total, 0);

  // the figures shown in two places are computed once, here
  console.assert(picked.length + skipped.length + waiting.length === PEOPLE.length, 'people do not add up');
  console.assert(
    cart.reduce((n, g) => n + g.lines.reduce((m, l) => m + l.qty * l.price, 0), 0) === total,
    'cart total does not add up',
  );

  return { picked, skipped, waiting, cart, dishes, total, team: PEOPLE.length };
}

export const offeredRestaurants = (session: Session) =>
  session.restaurantIds.map((id) => restaurantById(id)).filter((r) => !!r);

