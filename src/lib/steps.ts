import type { Session } from '@/data/demo';
import type { CartGroup } from '@/store';

// Running a lunch, as six steps anyone can follow, one after another. The sidebar, Today's lunch
// and every step page show the same steps from this one place.
export type StepId = 'start' | 'review' | 'order' | 'collect' | 'distribute' | 'finish';
export type StepState = 'done' | 'now' | 'todo';

export const STEPS: { id: StepId; route: string; label: string; hint: string; icon: string }[] = [
  { id: 'start', route: '/new', label: 'Start lunch', hint: 'Choose the restaurants and the cutoff time.', icon: 'new' },
  { id: 'review', route: '/review', label: 'Review & lock', hint: 'See what everyone picked, then lock the picks so the cart stays as it is.', icon: 'lock' },
  { id: 'order', route: '/order', label: 'Place order', hint: 'The Swiggy bot adds every dish to the cart and checks out.', icon: 'pick' },
  { id: 'collect', route: '/collect', label: 'Collect', hint: 'Mark each restaurant when its food arrives.', icon: 'check' },
  { id: 'distribute', route: '/distribute', label: 'Distribute', hint: 'Tick each person when they get their food.', icon: 'today' },
  { id: 'finish', route: '/finish', label: 'Enjoy your meal', hint: 'Close the lunch, so the next one can start. Then eat!', icon: 'check' },
];

export const stepByRoute = (route: string) => STEPS.find((s) => s.route === route);

type Progress = { done: number; of: number };

// What each step is at, and how far the counted ones have got.
export function lunchSteps(
  session: Session,
  active: boolean,
  cart: CartGroup[],
  picked: string[],
): { states: Record<StepId, StepState>; current: StepId; progress: Partial<Record<StepId, Progress>> } {
  const arrived = cart.filter((g) => session.arrived?.[g.restaurantId]).length;
  const handed = picked.filter((id) => session.handedOut[id]).length;
  const progress: Partial<Record<StepId, Progress>> = {
    collect: { done: arrived, of: cart.length },
    distribute: { done: handed, of: picked.length },
  };

  let current: StepId;
  if (!active || session.completed) current = 'start';
  else if (session.status === 'open') current = 'review';
  else if (session.status === 'locked' || session.status === 'placing') current = 'order';
  else if (session.status === 'placed') current = 'collect';
  else if (handed < picked.length) current = 'distribute';
  else current = 'finish';

  const at = STEPS.findIndex((s) => s.id === current);
  const states = Object.fromEntries(
    STEPS.map((s, i) => [s.id, !active || session.completed ? (i === 0 ? 'now' : 'todo') : i < at ? 'done' : i === at ? 'now' : 'todo']),
  ) as Record<StepId, StepState>;
  return { states, current, progress };
}

// A step can be opened once every step before it is done: the one to do now, or any finished one.
export const canOpen = (id: StepId, current: StepId) => STEPS.findIndex((s) => s.id === id) <= STEPS.findIndex((s) => s.id === current);
