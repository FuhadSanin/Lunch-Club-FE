import type { QueryClient } from '@tanstack/react-query';
import { keys } from '@/api/queries';

// A notification means something changed on a lunch, so the data it is about is fetched again at once
// instead of waiting for the next poll:
//   "<name> joined your party"         -> the dashboard: the board (who is in it) and the lunch list
//   "<name> completed their order",
//   "Everyone has picked"               -> the order: the board (picks, who is done, orders, total)
// Anything else refreshes the board and the list too. The lunch comes from the notification's link
// (#/lunch/<id>); without one, every board on screen is refreshed.
const LUNCH = /#\/lunch\/([0-9a-f-]{36})/i;

export type Kind = 'joined' | 'order' | 'other';
export const kindOfNotification = (title: string): Kind =>
  /joined/i.test(title) ? 'joined' : /completed their order|everyone has picked/i.test(title) ? 'order' : 'other';

export function refreshForNotification(qc: QueryClient, n: { title?: string; link?: string }) {
  const id = LUNCH.exec(n.link ?? '')?.[1]?.toLowerCase();
  const board = id ? keys.board(id) : ['lunches'];
  const kind = kindOfNotification(n.title ?? '');
  void qc.invalidateQueries({ queryKey: ['notifications'] });
  // The board is both the dashboard and the order: one call brings people, picks and orders.
  void qc.invalidateQueries({ queryKey: board });
  if (kind !== 'order') void qc.invalidateQueries({ queryKey: keys.lunches, exact: true }); // a new person can change the list
  return kind;
}
