// What only this browser needs to remember (localStorage): which lunch a shared link opened, and a
// little per lunch (see Extras). Everything people share is on the API.

import { useState } from 'react';

// A shared lunch link: #/lunch/<the lunch's id>. Opening it makes that lunch the one this browser shows.
export const LINK = /^\/(?:lunch|pick)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const PIN_KEY = 'lunchboard-linked-lunch';
export const readPin = () => {
  try {
    return window.localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
};
export const writePin = (id: string) => {
  try {
    window.localStorage.setItem(PIN_KEY, id);
  } catch {
    /* storage unavailable: the link still works until the page closes */
  }
};

// Per lunch: the restaurants it offers, for a lunch started before the API kept that list, and that the
// host closed it here (so it leaves Today's lunch at once). The host's ticks are on the API now.
export type Extras = {
  restaurantIds?: string[];
  completed?: boolean; // the host closed the lunch
};
const EXTRAS_KEY = 'lunchboard-live-v1';
export function useExtras() {
  const [all, setAll] = useState<Record<string, Extras>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(EXTRAS_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const update = (lunchId: string, change: (e: Extras) => Extras) =>
    setAll((cur) => {
      const next = { ...cur, [lunchId]: change(cur[lunchId] ?? {}) };
      try {
        window.localStorage.setItem(EXTRAS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: marks last until the page closes */
      }
      return next;
    });
  return [all, update] as const;
}
