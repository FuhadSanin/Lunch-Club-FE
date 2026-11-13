// The live board: the server copies each lunch to Firestore (boards/<lunch id>) after every change
// (lunch-backend's apps/lunches/board.py). Listening to that copy tells this browser the moment
// someone joins, picks, finishes or the order moves on, and the board is fetched again from the API
// at once. The API stays the source of truth; the copy is only the signal.
//
// Switched on with VITE_LIVE_BOARD=true, once the backend runs with FIRESTORE_ENABLED and
// firestore.rules is deployed. Without it, or if Firestore refuses (not signed in with Google, no
// access yet), nothing changes: the board keeps polling every 15 seconds.

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { keys, liveBoards as listening } from '@/api/queries';
import { firebaseApp, refreshIdToken, useGoogleUser } from '@/lib/firebase';

export const LIVE_BOARD = import.meta.env.VITE_LIVE_BOARD === 'true';

export function useLiveBoard(lunchId: string | undefined) {
  const qc = useQueryClient();
  const user = useGoogleUser();
  const uid = user?.uid;

  useEffect(() => {
    if (!LIVE_BOARD || !lunchId || !uid) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    let retried = false;

    const listen = async () => {
      // Loaded only when the live board is on, so the app doesn't carry Firestore otherwise.
      const { doc, getFirestore, onSnapshot } = await import('firebase/firestore');
      if (cancelled) return;
      let first = true;
      let status: unknown;
      stop = onSnapshot(
        doc(getFirestore(firebaseApp), 'boards', lunchId),
        (snap) => {
          listening.add(lunchId);
          const next = snap.data()?.status;
          // The first answer is what the board already shows (it was just fetched); only changes count.
          if (!first) {
            void qc.invalidateQueries({ queryKey: keys.board(lunchId) });
            // A new status (locked, ordered, delivered, closed) moves the lunch list on too.
            if (next !== status) void qc.invalidateQueries({ queryKey: keys.lunches, exact: true });
          }
          first = false;
          status = next;
        },
        async (error) => {
          listening.delete(lunchId);
          // A company's access comes from the sign-in token, which the server updates when someone
          // joins a company. A token from before that can't read the board yet, so get a fresh one once.
          if (error.code === 'permission-denied' && !retried && !cancelled) {
            retried = true;
            await refreshIdToken();
            if (!cancelled) void listen();
          }
        },
      );
    };
    void listen();

    return () => {
      cancelled = true;
      stop?.();
      listening.delete(lunchId);
    };
  }, [lunchId, uid, qc]);
}
