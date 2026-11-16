import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentLunch, cutoffAt, isActive, orgFrom, picksFrom, ticksFrom, toOffered } from './adapt';
import type { ApiBoard, ApiCompanySettings, ApiItem, ApiLunch } from './types';
import { DEMO_ORG } from '@/data/demo';
import { RESTAURANTS } from '@/data/menus';

const person = (id: string, name: string) => ({ id, name });
const item = (user: { id: string; name: string }, restaurant_name: string, dish_name: string, quantity = 1, note = ''): ApiItem =>
  ({ id: `${user.id}-${dish_name}`, user, restaurant_name, restaurant_id: '', dish_name, quantity, price_paise: 12000, note }) as ApiItem;
const board = (over: Partial<ApiBoard>): ApiBoard =>
  ({ id: 'l1', status: 'open', items: [], skipped: [], completed: [], orders: [], total_paise: 0, ...over }) as ApiBoard;
const lunch = (id: string, status: ApiLunch['status'], closed_at: string | null = null) => ({ id, status, closed_at }) as ApiLunch;

const asha = person('a', 'Asha');
const bela = person('b', 'Bela');

describe('picksFrom', () => {
  it("groups each person's dishes, keeps their note, and marks who is done or skipped", () => {
    const { picks } = picksFrom(
      board({
        items: [item(asha, 'Dosa Hut', 'Masala Dosa', 2, 'less spicy'), item(asha, 'Dosa Hut', 'Idli'), item(bela, 'Paragon', 'Biryani')],
        skipped: [person('c', 'Cleo')],
        completed: [asha, person('c', 'Cleo')],
      }),
    );

    expect(picks.a.items.map((l) => l.qty)).toEqual([2, 1]);
    expect(picks.a.note).toBe('less spicy');
    expect(picks.a.done).toBe(true);
    expect(picks.b.done).toBeUndefined();
    expect(picks.c).toMatchObject({ items: [], skipped: true });
  });

  it('finds a dish in a menu this browser has, by restaurant and dish name in any case', () => {
    const known = RESTAURANTS[0];
    const dish = known.categories[0].dishes[0];

    const { picks, restaurantNames } = picksFrom(board({ items: [item(asha, known.name.toUpperCase(), dish.name.toLowerCase())] }));

    expect(picks.a.items[0].dishId).toBe(dish.id);
    expect(restaurantNames[known.id]).toBe(known.name.toUpperCase()); // the API's own spelling
  });

  it('makes a stand-in for a dish no loaded menu has, at the price the API gives', () => {
    const { picks, restaurantNames } = picksFrom(board({ items: [item(asha, 'Nowhere Cafe', 'Mystery Stew')] }));

    expect(picks.a.items[0].dishId).toBe('api-nowhere-cafe:mystery-stew');
    expect(restaurantNames['api-nowhere-cafe']).toBe('Nowhere Cafe');
  });
});

describe('ticksFrom', () => {
  it("turns the API's ticks (restaurant names, person ids) into the screens' keys", () => {
    const b = board({
      items: [item(asha, 'Nowhere Cafe', 'Mystery Stew')],
      reviewed_restaurants: ['Nowhere Cafe'],
      reviewed_people: ['a'],
      arrived_restaurants: ['Nowhere Cafe'],
      handed_out_people: ['a'],
    });

    const ticks = ticksFrom(b, picksFrom(b).restaurantNames);

    expect(ticks.checked).toEqual({ 'r:api-nowhere-cafe': true, 'p:a': true });
    expect(ticks.arrived).toEqual({ 'api-nowhere-cafe': true });
    expect(ticks.handedOut).toEqual({ a: true });
  });

  it('ignores a tick for a restaurant no longer in the lunch, and a board without ticks', () => {
    const b = board({ items: [item(asha, 'Dosa Hut', 'Idli')], arrived_restaurants: ['Gone Grill'] });

    expect(ticksFrom(b, picksFrom(b).restaurantNames)).toEqual({ checked: {}, arrived: {}, handedOut: {} });
  });
});

describe('which lunch is today’s', () => {
  it('is active from the start until the host closes it or calls it off', () => {
    expect(isActive(lunch('1', 'open'))).toBe(true);
    expect(isActive(lunch('1', 'placed'))).toBe(true);
    expect(isActive(lunch('1', 'delivered'))).toBe(true); // arrived, not closed yet
    expect(isActive(lunch('1', 'delivered', '2026-01-01T07:00:00Z'))).toBe(false);
    expect(isActive(lunch('1', 'cancelled'))).toBe(false);
    expect(isActive(lunch('1', 'delivered'), { 1: { completed: true } })).toBe(false); // closed in this browser a moment ago
  });

  it('prefers a lunch still running over one that has arrived', () => {
    const list = [lunch('arrived', 'delivered'), lunch('running', 'locked'), lunch('old', 'cancelled')];

    expect(currentLunch(list, {})?.id).toBe('running');
    expect(currentLunch([list[0], list[2]], {})?.id).toBe('arrived');
    expect(currentLunch([list[2]], {})).toBeUndefined();
  });
});

describe('cutoffAt', () => {
  afterEach(() => vi.useRealTimers());

  it('means today when the time is still ahead, tomorrow when it has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 11, 0));

    expect(new Date(cutoffAt('12:30'))).toEqual(new Date(2026, 0, 5, 12, 30));
    expect(new Date(cutoffAt('10:00'))).toEqual(new Date(2026, 0, 6, 10, 0));
  });
});

describe('orgFrom', () => {
  const settings = (addresses: ApiCompanySettings['addresses']): ApiCompanySettings =>
    ({ id: 'o', name: 'Acme', email_domain: 'acme.com', team_name: '', auto_join: false, addresses }) as ApiCompanySettings;

  it('looks restaurants up from the first saved address that says where it is', () => {
    const org = orgFrom(
      settings([
        { id: '1', address: 'Typed by hand', lat: null, lng: null },
        { id: '2', address: 'Tower B', lat: 10, lng: 76.3 },
      ]),
      ['new@acme.com'],
      DEMO_ORG,
    );

    expect(org).toMatchObject({ name: 'Acme', team: 'Acme', autoJoin: false, invites: ['new@acme.com'] });
    expect(org.addresses).toEqual(['Typed by hand', 'Tower B']);
    expect(org.places).toEqual({ 'Tower B': { lat: 10, lng: 76.3 } });
    expect(org.office).toEqual({ lat: 10, lng: 76.3 });
  });

  it("falls back to the demo's office when no address has a place", () => {
    expect(orgFrom(settings([]), [], DEMO_ORG).office).toEqual(DEMO_ORG.office);
  });
});

describe('toOffered', () => {
  it('sends only what is known, with a proper photo URL', () => {
    const offered = toOffered({ id: '9', name: 'Paragon', distanceKm: 1.2345, photo: 'https://x.test/a (1).jpg', categories: [] });

    expect(offered).toEqual({ id: '9', name: 'Paragon', distance_km: 1.23, photo: 'https://x.test/a%20(1).jpg' });
  });
});
