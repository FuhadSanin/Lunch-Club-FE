import { useCallback, useState } from 'react';

// Which of a screen's actions are still on their way to the server, so their buttons can be disabled
// until they are done, and what follows (a celebration, a toast) happens only once they have worked.
//
//   const { pending, run } = usePending();
//   <Button disabled={pending('lock')} onClick={() => run('lock', () => dispatch({ type: 'lock' })).then(celebrate, () => undefined)}>
//
// `run` resolves when the action has succeeded and rejects when it failed (the reason is already on
// screen as a toast, so most callers ignore the rejection). Clicking again while it runs does nothing.
export function usePending() {
  const [keys, setKeys] = useState<ReadonlySet<string>>(() => new Set());
  const run = useCallback(
    async <T,>(key: string, action: () => T | Promise<T>): Promise<T> => {
      setKeys((now) => new Set(now).add(key));
      try {
        return await action();
      } finally {
        setKeys((now) => {
          const next = new Set(now);
          next.delete(key);
          return next;
        });
      }
    },
    [],
  );
  const pending = useCallback((key: string) => keys.has(key), [keys]);
  return { pending, run, anyPending: keys.size > 0 };
}
