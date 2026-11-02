// Live Swiggy restaurants and menus from the Django API (apps/catalog in lunch-backend).
// The API answers in paise; screens work in rupees. Everything loaded is kept with
// `remember` so the rest of the app finds it through restaurantById and dishById.

import { useCallback, useEffect, useState } from 'react';
import { remember, restaurantById, type Category, type Restaurant } from './menus';

type Place = { lat: number; lng: number };

type ApiRestaurant = {
  id: string;
  name: string;
  area: string | null;
  cuisines: string[];
  rating: number | string | null;
  delivery_time: string | null;
  distance_km: number | null;
  open: boolean | null;
  image_url: string | null;
};

type ApiItem = {
  id: string;
  name: string;
  price_paise: number | null;
  veg: boolean;
  description: string | null;
  in_stock: boolean;
  image_url: string | null;
};

type ApiMenu = { restaurant: ApiRestaurant; categories: { name: string; items: ApiItem[] }[] };

// Firebase sign-in will set this; until then requests go without a token.
let idToken: string | null = null;
export const setIdToken = (token: string | null) => {
  idToken = token;
};

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const response = await fetch(`/api/${path}?${query}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  if (!response.ok) {
    const detail = await response.json().then((b) => b?.detail, () => undefined);
    const why =
      response.status === 401 || response.status === 403
        ? 'Sign in to load live restaurants.'
        : typeof detail === 'string'
          ? detail
          : `The lunch API answered ${response.status}.`;
    throw new Error(why);
  }
  return response.json();
}

const toRestaurant = (r: ApiRestaurant, categories: Category[] = []): Restaurant => ({
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

// Restaurants near the office, or matching `query` (two letters or more) when given.
// With `skip`, nothing is fetched.
export function useRestaurants(place: Place, query = '', skip = false): Load & { restaurants: Restaurant[] } {
  const q = query.trim();
  const [state, setState] = useState<{ status: Load['status']; error?: string; restaurants: Restaurant[] }>({
    status: 'loading',
    restaurants: [],
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (skip || q.length === 1) return; // nothing asked for yet, or wait for a second letter
    let current = true;
    setState((s) => ({ ...s, status: 'loading', error: undefined }));
    const timer = window.setTimeout(
      () => {
        get<{ restaurants: ApiRestaurant[] }>('restaurants', { lat: place.lat, lng: place.lng, ...(q && { q }) })
          .then(({ restaurants }) => {
            const found = restaurants.map((r) => toRestaurant(r));
            remember(found);
            if (current) setState({ status: 'ready', restaurants: found.map((r) => restaurantById(r.id) ?? r) });
          })
          .catch((e: Error) => current && setState({ status: 'error', error: e.message, restaurants: [] }));
      },
      q ? 300 : 0, // let typing settle before searching
    );
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [place.lat, place.lng, q, skip, attempt]);

  return { ...state, retry };
}

// Loads one restaurant's live menu. Sample restaurants without a Swiggy id are ready as they are.
export function useMenu(restaurantId: string, place: Place): Load {
  const [state, setState] = useState<{ status: Load['status']; error?: string }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!isSwiggyId(restaurantId)) {
      setState({ status: 'ready' });
      return;
    }
    let current = true;
    setState({ status: 'loading' });
    get<ApiMenu>(`restaurants/${restaurantId}/menu`, place)
      .then((menu) => {
        remember([toRestaurant(menu.restaurant, toCategories(restaurantId, menu))]);
        if (current) setState({ status: 'ready' });
      })
      .catch((e: Error) => current && setState({ status: 'error', error: e.message }));
    return () => {
      current = false;
    };
  }, [restaurantId, place.lat, place.lng, attempt]);

  return { ...state, retry };
}
