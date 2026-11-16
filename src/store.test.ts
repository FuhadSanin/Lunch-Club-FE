import { describe, expect, it } from 'vitest';
import { summarise } from './store';
import { DEMO_PICKS, DEMO_SESSION, PEOPLE } from '@/data/demo';
import { RESTAURANTS } from '@/data/menus';
import type { Person, Pick } from '@/model';

describe('summarise', () => {
  it('counts the demo team once each: picked, skipped or still to pick', () => {
    const lunch = summarise(DEMO_SESSION, DEMO_PICKS);

    expect(lunch.picked.length + lunch.skipped.length + lunch.waiting.length).toBe(PEOPLE.length);
    expect([lunch.picked.length, lunch.skipped.length, lunch.waiting.length]).toEqual([26, 3, 6]);
  });

  it('adds the same dish from different people into one cart line, and totals each restaurant', () => {
    const restaurant = RESTAURANTS[0];
    const [dosa, other] = restaurant.categories[0].dishes;
    const people: Person[] = [
      { id: 'a', name: 'Asha', email: '', hue: 0 },
      { id: 'b', name: 'Bela', email: '', hue: 0 },
      { id: 'c', name: 'Cleo', email: '', hue: 0 },
    ];
    const pick = (items: Pick['items'], skipped = false): Pick => ({ items, note: '', skipped, updatedAt: '' });
    const picks = {
      a: pick([{ dishId: dosa.id, qty: 2 }]),
      b: pick([{ dishId: dosa.id, qty: 1 }, { dishId: other.id, qty: 1 }]),
      c: pick([], true),
    };

    const lunch = summarise({ ...DEMO_SESSION, restaurantIds: [restaurant.id] }, picks, people);

    expect(lunch.cart).toHaveLength(1);
    expect(lunch.cart[0].lines.find((l) => l.dishId === dosa.id)).toMatchObject({ qty: 3, people: ['a', 'b'] });
    expect(lunch.dishes).toBe(4);
    expect(lunch.total).toBe(3 * dosa.price + other.price);
    expect(lunch.skipped.map((p) => p.id)).toEqual(['c']);
    expect(lunch.waiting).toEqual([]);
  });
});
