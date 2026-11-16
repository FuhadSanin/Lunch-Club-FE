import { describe, expect, it } from 'vitest';
import { canOpen, lunchSteps } from './steps';
import { DEMO_SESSION } from '@/data/demo';
import type { Session } from '@/model';
import type { CartGroup } from '@/store';

const session = (over: Partial<Session>): Session => ({ ...DEMO_SESSION, handedOut: {}, arrived: {}, completed: false, ...over });
const cart = [
  { restaurantId: 'r1', name: 'Dosa Hut', lines: [], dishes: 2, total: 240 },
  { restaurantId: 'r2', name: 'Paragon', lines: [], dishes: 1, total: 300 },
] satisfies CartGroup[];
const picked = ['a', 'b', 'c'];

describe("the host's six steps", () => {
  it.each([
    ['open', 'review'],
    ['locked', 'order'],
    ['placing', 'order'],
    ['placed', 'collect'],
  ] as const)('a lunch that is %s is at "%s"', (status, step) => {
    expect(lunchSteps(session({ status }), true, cart, picked).current).toBe(step);
  });

  it('starts over when no lunch is running, or the last one is closed', () => {
    expect(lunchSteps(session({ status: 'placed' }), false, cart, picked).current).toBe('start');
    expect(lunchSteps(session({ status: 'delivered', completed: true }), true, cart, picked).current).toBe('start');
  });

  it('hands out until everyone has their food, then finishes', () => {
    const some = lunchSteps(session({ status: 'delivered', handedOut: { a: true } }), true, cart, picked);
    const all = lunchSteps(session({ status: 'delivered', handedOut: { a: true, b: true, c: true } }), true, cart, picked);

    expect(some.current).toBe('distribute');
    expect(some.progress.distribute).toEqual({ done: 1, of: 3 });
    expect(all.current).toBe('finish');
  });

  it('counts the restaurants whose food has arrived', () => {
    const { progress, states } = lunchSteps(session({ status: 'placed', arrived: { r1: true } }), true, cart, picked);

    expect(progress.collect).toEqual({ done: 1, of: 2 });
    expect(states).toMatchObject({ start: 'done', review: 'done', order: 'done', collect: 'now', distribute: 'todo', finish: 'todo' });
  });

  it('opens the step to do now and the ones before it, never one still to come', () => {
    expect(canOpen('review', 'order')).toBe(true);
    expect(canOpen('order', 'order')).toBe(true);
    expect(canOpen('collect', 'order')).toBe(false);
  });
});
