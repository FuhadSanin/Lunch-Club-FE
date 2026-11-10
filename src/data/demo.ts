// Demo data for the first build. Everything here is sample content that the Django API will
// replace: the team, the people and their picks are invented (no real names or emails).
// The restaurants and dishes come from the proof of concept's saved Swiggy menus (menus.ts).

import { RESTAURANTS, allDishes } from './menus';

// Two roles: team members pick lunch; the host starts lunches, places the order and manages the company.
export type Role = 'member' | 'host';

export type Person = {
  id: string;
  name: string;
  email: string;
  hue: number; // stable identity tint, not data
};

export type PickLine = { dishId: string; qty: number };

export type Pick = {
  items: PickLine[];
  note: string;
  skipped: boolean;
  updatedAt: string; // HH:MM, demo clock
  // Completed the order or skipped: final until the host reopens it.
  done?: boolean;
};

export type BotStep = { at: string; text: string };

export type SessionStatus = 'open' | 'locked' | 'placing' | 'placed' | 'delivered';

export type Session = {
  id: string;
  title: string;
  date: string; // ISO date
  cutoff: string; // HH:MM
  address: string;
  restaurantIds: string[];
  hostId: string;
  status: SessionStatus;
  orderRef: string | null;
  bot: BotStep[];
  handedOut: Record<string, boolean>;
  // The host's review: "r:<restaurant id>" once its dishes are in the Swiggy cart, "p:<person id>" once that
  // person's order is checked. Done cards collapse.
  checked?: Record<string, boolean>;
  arrived?: Record<string, boolean>; // restaurant id → its food has been collected
  completed?: boolean; // the host closed the lunch after handing everything out
};

export type RestaurantMode = 'nearby' | 'manual';

export type Org = {
  name: string;
  team: string;
  emailDomain: string;
  autoJoin: boolean;
  addresses: string[];
  invites: string[];
  restaurantMode: RestaurantMode; // how a new lunch chooses its restaurants by default
  radiusKm: number; // "nearby": offer restaurants within this distance of the office
  office: { lat: number; lng: number }; // where Swiggy restaurants and menus are looked up from
};

export const DEMO_NOW = '11:48'; // the demo clock, so every screen reads the same time

export const ME_ID = 'u-fuhad';

const FIRST = [
  'Anjali Menon', 'Aswin Kumar', 'Bindu Thomas', 'Chris Mathew', 'Deepa Nair', 'Divya Raj',
  'Farhan Ali', 'Gokul Das', 'Hari Prasad', 'Irfan Basheer', 'Jaya George', 'Kavya Pillai',
  'Kiran Joseph', 'Lakshmi Iyer', 'Meera Varghese', 'Midhun Babu', 'Nandana S', 'Nikhil Jacob',
  'Nisha Rahman', 'Pooja Shenoy', 'Priya Krishnan', 'Ravi Shankar', 'Reshma K', 'Sana Fathima',
  'Shyam Mohan', 'Sneha Paul', 'Sunil Kurian', 'Tara Unnikrishnan', 'Unni Raghav', 'Veena Suresh',
  'Vishnu Dev', 'Yamuna R', 'Zoya Hameed', 'Akhil Jose',
];

export const PEOPLE: Person[] = [
  { id: ME_ID, name: 'Fuhad Sanin', email: 'fuhad@lunchboard.demo', hue: 168 },
  ...FIRST.map((name, i) => ({
    id: `u-${i + 1}`,
    name,
    email: `${name.split(' ')[0].toLowerCase()}@lunchboard.demo`,
    hue: Math.round((i * 137.5 + 20) % 360),
  })),
];

// People from the API join the demo team here, so names resolve for both. Their ids are UUIDs,
// so they never clash with the demo's.
const known = new Map<string, Person>();
export const rememberPeople = (people: Person[]) => people.forEach((p) => known.set(p.id, p));
export const personById = (id: string) => PEOPLE.find((p) => p.id === id) ?? known.get(id);

// A stable tint for someone the demo doesn't know, from their id.
export const hueOf = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

// Today's demo lunch: a local favourite and four well-known chains.
export const SESSION_RESTAURANTS = ['263840', 'kfc', 'burger-king', 'saravana-bhavan', 'baskin-robbins'];

// Deterministic picks: 26 of 35 have picked, 3 have skipped, 6 have not answered yet.
function buildPicks(): Record<string, Pick> {
  const picks: Record<string, Pick> = {};
  const offered = RESTAURANTS.filter((r) => SESSION_RESTAURANTS.includes(r.id));
  // Baskin Robbins is offered but nobody has picked from it yet.
  const inUse = offered.filter((r) => r.id !== 'baskin-robbins');
  const skippers = new Set(['u-6', 'u-19', 'u-27']);
  const waiting = new Set(['u-4', 'u-11', 'u-15', 'u-22', 'u-30', 'u-33']);
  const notes = ['Less spicy please', 'No onion', 'Extra raita if they have it', ''];
  PEOPLE.forEach((p, i) => {
    if (waiting.has(p.id)) return;
    const minute = 10 + ((i * 7) % 37);
    const at = `11:${String(minute).padStart(2, '0')}`; // taste-skill-ignore: a clock time // all before the demo clock, 11:48
    if (skippers.has(p.id)) {
      picks[p.id] = { items: [], note: '', skipped: true, updatedAt: at };
      return;
    }
    const r = inUse[i % inUse.length];
    const dishes = allDishes(r).filter((x) => x.price >= 150);
    const main = dishes[(i * 3) % dishes.length];
    const items: PickLine[] = [{ dishId: main.id, qty: 1 }];
    const drinks = allDishes(r).filter((x) => x.price < 150);
    if (i % 4 === 0 && drinks.length) items.push({ dishId: drinks[i % drinks.length].id, qty: 1 });
    picks[p.id] = { items, note: i % 9 === 0 ? notes[i % 3] : '', skipped: false, updatedAt: at };
  });
  return picks;
}

export const DEMO_PICKS = buildPicks();

export const DEMO_SESSION: Session = {
  id: 's-today',
  title: "Today's lunch",
  date: new Date().toISOString().slice(0, 10),
  cutoff: '12:30',
  address: 'Office, 4th floor, Infopark Phase 2, Kakkanad',
  restaurantIds: SESSION_RESTAURANTS,
  hostId: ME_ID,
  status: 'open',
  orderRef: null,
  bot: [],
  handedOut: {},
};

export const DEMO_ORG: Org = {
  name: 'Lunchboard demo company',
  team: 'Platform team',
  emailDomain: 'lunchboard.demo',
  autoJoin: true,
  addresses: ['Office, 4th floor, Infopark Phase 2, Kakkanad', 'Annexe, 2nd floor, Infopark Phase 1, Kakkanad'],
  invites: [],
  restaurantMode: 'nearby',
  radiusKm: 3,
  office: { lat: 10.0076837, lng: 76.36403 }, // Brigade World Trade Center, Kakkanad
};

export const RADIUS_RANGE = { min: 0.5, max: 8, step: 0.5 }; // km
