// Live Swiggy restaurants and menus from the Django API (apps/catalog in lunch-backend), fetched
// and cached with TanStack Query (src/api/queries.ts). The API answers in paise; screens work in
// rupees. Everything loaded is kept with `remember` so the rest of the app finds it through
// restaurantById and dishById.

import { useEffect, useState } from 'react';
import { useDishesQuery, useMenuQuery, useRestaurantsQuery } from '@/api/queries';
import type { ApiDish, ApiMenu, ApiRestaurant } from '@/api/types';
import { remember, restaurantById, type Category, type Dish, type Restaurant } from './menus';

type Place = { lat: number; lng: number };

export const toRestaurant = (r: ApiRestaurant, categories: Category[] = []): Restaurant => ({
  id: r.id,
  name: r.name,
  area: r.area ?? undefined,
  cuisines: r.cuisines,
  rating: Number(r.rating) || undefined,
  eta: r.delivery_time ?? undefined,
  distanceKm: r.distance_km ?? undefined,
  photo: r.image_url ?? undefined,
  open: r.open ?? undefined,
  categories,
});

const toCategories = (restaurantId: string, menu: ApiMenu): Category[] =>
  menu.categories.map((c) => ({
    name: c.name,
    dishes: c.items
      .filter((i) => i.price_paise !== null) // nothing to charge for, so nothing to pick
      .map((i) => ({
        id: `${restaurantId}:${i.id}`,
        name: i.name,
        price: i.price_paise! / 100,
        veg: i.veg,
        desc: i.description ?? undefined,
        inStock: i.in_stock,
        photo: i.image_url ?? undefined,
      })),
  }));

// Only Swiggy restaurants have numeric ids; the sample chains don't.
export const isSwiggyId = (id: string) => /^\d+$/.test(id);

export type Load = { status: 'loading' | 'ready' | 'error'; error?: string; retry: () => void };

const statusOf = (q: { isPending: boolean; isError: boolean }): Load['status'] =>
  q.isError ? 'error' : q.isPending ? 'loading' : 'ready';

// Waits until typing settles before the value changes.
function useSettled(value: string, ms: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

// Restaurants near the office, or matching `query` (two letters or more) when given.
// With `skip`, nothing is fetched.
export function useRestaurants(place: Place, query = '', skip = false): Load & { restaurants: Restaurant[] } {
  const q = useSettled(query.trim(), query.trim() ? 300 : 0);
  const asked = !skip && q.length !== 1; // nothing asked for yet, or wait for a second letter
  const result = useRestaurantsQuery(place, q, asked);
  const found = result.data?.restaurants.map((r) => toRestaurant(r)) ?? [];

  useEffect(() => {
    if (result.data) remember(result.data.restaurants.map((r) => toRestaurant(r)));
  }, [result.data]);

  return {
    status: asked ? statusOf(result) : 'loading',
    error: result.error?.message,
    retry: () => void result.refetch(),
    // A listing has no dishes; prefer what is already known, which may include a loaded menu.
    restaurants: found.map((r) => restaurantById(r.id) ?? r),
  };
}

// Loads one restaurant's live menu. Sample restaurants without a Swiggy id are ready as they are.
export function useMenu(restaurantId: string, place: Place): Load {
  const live = isSwiggyId(restaurantId);
  const result = useMenuQuery(restaurantId, place, live);

  useEffect(() => {
    if (result.data) remember([toRestaurant(result.data.restaurant, toCategories(restaurantId, result.data))]);
  }, [result.data, restaurantId]);

  return {
    status: live ? statusOf(result) : 'ready',
    error: result.error?.message,
    retry: () => void result.refetch(),
  };
}

export type FoundDish = { dish: Dish; restaurant: Restaurant };

const toFound = (d: ApiDish): FoundDish | null =>
  d.price_paise === null
    ? null
    : {
        dish: { id: `${d.restaurant.id}:${d.id}`, name: d.name, price: d.price_paise / 100, veg: d.veg, inStock: d.in_stock !== false, photo: d.image_url ?? undefined },
        restaurant: toRestaurant(d.restaurant),
      };

// Dishes matching `query` across Swiggy near the office (two letters or more), each with its restaurant.
export function useDishSearch(place: Place, query: string): Load & { dishes: FoundDish[]; settled: boolean } {
  const trimmed = query.trim();
  const q = useSettled(trimmed, 300);
  const asked = q.length >= 2;
  const result = useDishesQuery(place, q, asked);
  return {
    status: asked ? statusOf(result) : 'ready',
    error: result.error?.message,
    retry: () => void result.refetch(),
    dishes: asked ? (result.data?.dishes.map(toFound).filter((x): x is FoundDish => !!x) ?? []) : [],
    settled: q === trimmed && !result.isFetching,
  };
}
