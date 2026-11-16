import type { PickLine } from '@/model';

// The cart lives in this browser until it's completed, so a reload or a closed tab doesn't lose it.
export type Draft = { items: PickLine[]; note: string };
export const readDraft = (key: string): Draft | null => {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};
export const writeDraft = (key: string, draft: Draft | null) => {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable: the cart lasts until the page closes */
  }
};
