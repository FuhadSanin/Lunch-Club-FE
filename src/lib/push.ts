// Lunch notifications (Firebase Cloud Messaging web push). The person turns them on once; this
// device's token goes to the API (POST /api/me/push-token), which subscribes it to their company
// or party. Messages that arrive while the app is open show as a toast; the service worker
// (public/firebase-messaging-sw.js) shows the rest.

import { refreshForNotification } from './notification-sync';
import { getMessaging, getToken, isSupported, onMessage, deleteToken } from 'firebase/messaging';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { queryClient } from '@/api/queries';
import { firebaseApp } from './firebase';

// The Web Push key pair from the Firebase console (Project settings → Cloud Messaging → Web Push
// certificates). Without it notifications stay hidden: there is nothing to turn on.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_KEY = 'lunchboard-push-token';
const ASKED_KEY = 'lunchboard-push-asked';

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: it just asks again next time */
  }
};

let listening = false;
async function listenInForeground() {
  if (listening) return;
  listening = true;
  onMessage(getMessaging(firebaseApp), (message) => {
    const { title, body } = message.notification ?? {};
    const link = message.fcmOptions?.link ?? (message.data?.link as string | undefined);
    // The bell, and the data the notification is about: the dashboard on a join, the order on a completion.
    refreshForNotification(queryClient, { title, link });
    toast.info(title ?? 'Lunch Board', {
      description: body,
      duration: 10000,
      action: link ? { label: 'Open', onClick: () => { window.location.href = link; } } : undefined,
    });
  });
}

// Gets this device's token and hands it to the API. Safe to repeat: it also renews a token Firebase
// has changed and subscribes the device to a party joined since.
async function register(): Promise<string> {
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(getMessaging(firebaseApp), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error('This browser did not give a notification token.');
  await api<void>('me/push-token', { method: 'POST', body: { token } });
  write(TOKEN_KEY, token);
  await listenInForeground();
  return token;
}

export type PushState = {
  supported: boolean; // the browser can, and the app has its Web Push key
  permission: NotificationPermission | 'unsupported';
  enabled: boolean; // on for this device
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};

export function usePush(): PushState {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushState['permission']>('unsupported');
  const [enabled, setEnabled] = useState(() => !!read(TOKEN_KEY));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = !!VAPID_KEY && 'Notification' in window && 'serviceWorker' in navigator && (await isSupported().catch(() => false));
      if (!alive) return;
      setSupported(ok);
      if (!ok) return;
      setPermission(Notification.permission);
      // Already on: renew the token and listen for messages while the app is open.
      if (Notification.permission === 'granted' && read(TOKEN_KEY)) register().catch(() => undefined);
    })();
    return () => { alive = false; };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      write(ASKED_KEY, '1');
      if (result !== 'granted') {
        toast.warning('Notifications are blocked', { description: 'Allow them for this site in your browser settings, then try again.' });
        return;
      }
      await register();
      setEnabled(true);
      toast.success('Notifications are on', { description: "You'll hear when people join your party, finish their orders, and when everyone has picked." });
    } catch (e) {
      toast.error("Couldn't turn notifications on", { description: e instanceof Error ? e.message : 'Try again.' });
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const token = read(TOKEN_KEY);
      if (token) await api<void>('me/push-token', { method: 'DELETE', body: { token } }).catch(() => undefined);
      await deleteToken(getMessaging(firebaseApp)).catch(() => undefined);
      write(TOKEN_KEY, null);
      setEnabled(false);
      toast('Notifications are off', { description: 'You can turn them back on from the sidebar.' });
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, enabled, busy, enable, disable };
}
