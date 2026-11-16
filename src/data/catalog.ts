// Every restaurant and dish this browser knows: the sample menus (menus.ts), what the API has sent so
// far (kept in localStorage, so a reload still has the menus), and stand-ins for dishes a pick names but
// no loaded menu has. Screens look things up here by id (restaurantById, dishById); useMenus() re-renders
// a screen when more arrive.

import { useSyncExternalStore } from 'react';
import type { Dish, Restaurant } from '@/model';
import { RESTAURANTS } from './menus';

const LIVE_KEY = 'lunchboard-live-menus-v1';

function loadLive(): Map<string, Restaurant> {
  try {
    return new Map(Object.entries(JSON.parse(window.localStorage.getItem(LIVE_KEY) ?? '{}')));
  } catch {
    return new Map();
  }
}

const live = loadLive();
let version = 0;
const listeners = new Set<() => void>();

// Add or refresh live restaurants. A listing has no dishes, so it keeps any menu already loaded.
export function remember(restaurants: Restaurant[]) {
  for (const r of restaurants) {
    const old = live.get(r.id);
    live.set(r.id, { ...old, ...r, categories: r.categories.length ? r.categories : old?.categories ?? [] });
  }
  version += 1;
  try {
    window.localStorage.setItem(LIVE_KEY, JSON.stringify(Object.fromEntries(live)));
  } catch {
    /* storage full or unavailable: live menus last until the page closes */
  }
  listeners.forEach((l) => l());
}

// Add one dish found by search to its restaurant, so it can be picked before the full menu loads.
export function rememberDish(restaurant: Restaurant, dish: Dish) {
  const old = live.get(restaurant.id);
  const categories = old?.categories.length ? old.categories : [{ name: 'Found by search', dishes: [] }];
  if (!categories.some((c) => c.dishes.some((d) => d.id === dish.id)))
    categories[categories.length - 1] = { ...categories[categories.length - 1], dishes: [...categories[categories.length - 1].dishes, dish] };
  remember([{ ...restaurant, ...old, categories }]);
}

// Re-render when live restaurants or menus arrive.
export const useMenus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );

const known = () => [...live.values(), ...RESTAURANTS.filter((r) => !live.has(r.id))];

// Restaurants and dishes the API's picks name but no loaded menu has (picks store names, not ids).
// Kept in memory only and never offered for a new lunch.
const stubs = new Map<string, Restaurant>();
export const rememberStubs = (restaurants: Restaurant[]) => restaurants.forEach((r) => stubs.set(r.id, r));

export const knownRestaurants = () => known();

export const restaurantById = (id: string) => live.get(id) ?? RESTAURANTS.find((r) => r.id === id) ?? stubs.get(id);

export const allDishes = (r: Restaurant) => r.categories.flatMap((c) => c.dishes);

// Searches samples too: a live menu replaces a sample one, but older picks still name its dishes.
export const dishById = (id: string): { dish: Dish; restaurant: Restaurant } | undefined => {
  for (const r of [...live.values(), ...RESTAURANTS, ...stubs.values()]) {
    const dish = allDishes(r).find((x) => x.id === id);
    if (dish) return { dish, restaurant: r };
  }
  return undefined;
};

// Restaurants within `km` of the office, nearest first, for a "nearby" lunch.
export const restaurantsWithin = (km: number, from: Restaurant[] = known()) =>
  from.filter((r) => (r.distanceKm ?? Infinity) <= km).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

export const byDistance = (from: Restaurant[] = known()) =>
  [...from].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
