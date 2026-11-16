// Turns what the API sends into what the screens show, and back. The screens were built on the demo's
// shapes (src/data/demo.ts: Session, Pick, Person, Org); the API speaks its own (src/api/types.ts).
// Everything here is a plain function of its arguments, so it can be read, and tested, on its own.

import type { ApiBoard, ApiCompanySettings, ApiItem, ApiLunch, ApiOffered, ApiPermission, ApiPerson } from '@/api/types';
import type { Org, Person, Pick, SessionStatus } from '@/model';
import { hueOf } from '@/data/people';
import type { Restaurant } from '@/model';
import { allDishes, dishById, knownRestaurants, rememberStubs } from '@/data/catalog';
import { slug } from '@/data/menus';
import type { Extras } from '@/lib/lunch-extras';

// Any one of these makes someone a host in the screens: they run lunches, not only pick.
export const HOST_PERMISSIONS: ApiPermission[] = ['session_create', 'session_update', 'session_delete', 'review_create', 'order_update'];

// ---------- dates and times ----------

export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Today at HH:MM, as the API wants it. A time already past means tomorrow.
export const cutoffAt = (time: string) => {
  const d = new Date();
  d.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

export const STATUS: Record<ApiBoard['status'], SessionStatus> = {
  open: 'open',
  locked: 'locked',
  confirmed: 'placing',
  placed: 'placed',
  delivered: 'delivered',
  cancelled: 'delivered', // never shown: a called-off lunch is not today's lunch
};

// Today's lunch: the one still active (one at a time). It is active from the start until the host
// finishes its last step, Enjoy your meal, which closes it on the server, or calls it off.
const RUNNING = new Set<ApiLunch['status']>(['open', 'locked', 'confirmed', 'placed']);
export const isActive = (l: ApiLunch, extras: Record<string, Extras> = {}) =>
  RUNNING.has(l.status) || (l.status === 'delivered' && !l.closed_at && !extras[l.id]?.completed);
export const currentLunch = (lunches: ApiLunch[] = [], extras: Record<string, Extras>) =>
  lunches.find((l) => RUNNING.has(l.status)) ?? lunches.find((l) => isActive(l, extras));

// ---------- restaurants, people and picks ----------

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'My';

const safeUrl = (u: string) => {
  try {
    return encodeURI(decodeURI(u));
  } catch {
    return u.replace(/ /g, '%20');
  }
};
// The offered list travels with the lunch, so it is the same in every browser.
export const toOffered = (r: Restaurant): ApiOffered => ({
  id: r.id, name: r.name,
  ...(r.area && { area: r.area }), ...(r.cuisines?.length && { cuisines: r.cuisines.slice(0, 20) }),
  ...(r.rating && { rating: r.rating }), ...(r.eta && { eta: r.eta }),
  ...(r.distanceKm !== undefined && { distance_km: Math.round(r.distanceKm * 100) / 100 }),
  // Swiggy image links can hold spaces ("... (1).jpg"); the server wants a proper URL.
  ...(r.photo?.startsWith('http') && { photo: safeUrl(r.photo) }),
});
export const fromOffered = (r: ApiOffered): Restaurant => ({
  id: r.id, name: r.name, area: r.area, cuisines: r.cuisines, rating: r.rating, eta: r.eta, distanceKm: r.distance_km, photo: r.photo,
  ...(r.local && { local: true }),
  // A local menu brings its dishes with it.
  categories: r.local
    ? [{ name: 'Menu', dishes: (r.items ?? []).map((i) => ({ id: `${r.id}:${i.id}`, name: i.name, price: i.price_paise / 100, veg: i.veg ?? undefined, photo: i.photo || undefined })) }]
    : [],
});
// A local restaurant's id says so, and it is the id the API keeps on the pick.
export const isLocalId = (id: string) => id.startsWith('local-');
export const toPerson = (p: ApiPerson & { email?: string }): Person => ({ id: p.id, name: p.name, email: p.email ?? '', hue: hueOf(p.id) });

// Picks store a restaurant and dish by name. Find the dish in a loaded menu, or make a stand-in so the
// board can still show it.
function dishIdFor(item: ApiItem, stubs: Map<string, Restaurant>): string {
  const rname = item.restaurant_name.toLowerCase();
  const dname = item.dish_name.toLowerCase();
  for (const r of knownRestaurants()) {
    if (r.name.toLowerCase() !== rname) continue;
    const dish = allDishes(r).find((d) => d.name.toLowerCase() === dname);
    if (dish) return dish.id;
  }
  const rid = `api-${slug(item.restaurant_name)}`;
  const id = `${rid}:${slug(item.dish_name)}`;
  const stub = stubs.get(rid) ?? { id: rid, name: item.restaurant_name, categories: [{ name: 'Picked', dishes: [] }] };
  if (!allDishes(stub).some((d) => d.id === id))
    stub.categories[0].dishes.push({ id, name: item.dish_name, price: item.price_paise / 100, veg: false });
  stubs.set(rid, stub);
  return id;
}

// Everyone's picks, and the API's name for each restaurant in them by the id this browser knows it by
// (the API keeps the host's ticks by that name).
export function picksFrom(board: ApiBoard): { picks: Record<string, Pick>; restaurantNames: Record<string, string> } {
  const stubs = new Map<string, Restaurant>();
  const picks: Record<string, Pick> = {};
  const dishIds = board.items.map((item) => dishIdFor(item, stubs));
  board.items.forEach((item, i) => {
    const pick = (picks[item.user.id] ??= { items: [], note: '', skipped: false, updatedAt: '' });
    pick.items.push({ dishId: dishIds[i], qty: item.quantity });
    pick.note ||= item.note;
  });
  for (const p of board.skipped) picks[p.id] = { items: [], note: '', skipped: true, updatedAt: '' };
  for (const p of board.completed ?? []) if (picks[p.id]) picks[p.id].done = true;
  rememberStubs([...stubs.values()]);
  const restaurantNames: Record<string, string> = {};
  board.items.forEach((item, i) => {
    const restaurant = dishById(dishIds[i])?.restaurant;
    if (restaurant) restaurantNames[restaurant.id] = item.restaurant_name;
  });
  return { picks, restaurantNames };
}

// The host's ticks as the screens key them: "r:<restaurant id>" and "p:<person id>" for what is
// reviewed, the restaurant's id for food that has arrived, the person's id for food handed out.
export function ticksFrom(board: ApiBoard, restaurantNames: Record<string, string>) {
  const idOf = new Map(Object.entries(restaurantNames).map(([id, name]) => [name, id]));
  const restaurants = (names: string[] = [], prefix = '') =>
    names.flatMap((name) => (idOf.has(name) ? [[prefix + idOf.get(name), true] as const] : []));
  const people = (ids: string[] = [], prefix = '') => ids.map((id) => [prefix + id, true] as const);
  return {
    checked: Object.fromEntries([...restaurants(board.reviewed_restaurants, 'r:'), ...people(board.reviewed_people, 'p:')]),
    arrived: Object.fromEntries(restaurants(board.arrived_restaurants)),
    handedOut: Object.fromEntries(people(board.handed_out_people)),
  };
}

// ---------- the company ----------

// The company as the screens know it, from GET /api/company/settings. Restaurants are looked up from the
// first saved address that says where it is; without one yet, from the demo's office.
export function orgFrom(s: ApiCompanySettings, invites: string[], fallback: Org): Org {
  const places = Object.fromEntries(s.addresses.flatMap((a) => (a.lat !== null && a.lng !== null ? [[a.address, { lat: a.lat, lng: a.lng }] as const] : [])));
  return {
    ...fallback,
    name: s.name,
    team: s.team_name || s.name,
    emailDomain: s.email_domain,
    autoJoin: s.auto_join,
    addresses: s.addresses.map((a) => a.address),
    invites,
    places,
    office: Object.values(places)[0] ?? fallback.office,
  };
}
