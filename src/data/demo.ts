// Sample data only: the invented team, their picks and the demo lunch (no real names or emails).
// The landing page and /?demo=signed-in run on it. The shapes are in src/model.ts.

import type { Org, Person, Pick, PickLine, Session } from '@/model';
import { allDishes } from './catalog';
import { RESTAURANTS } from './menus';

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
