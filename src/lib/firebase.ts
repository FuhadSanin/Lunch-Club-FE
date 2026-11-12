// Google sign-in through Firebase Auth: the only place the app touches Firebase. The Django API
// checks the ID token on every request (lunch-backend's FirebaseAuthentication), so all the app
// needs from here is a fresh token and who is signed in.

import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useSyncExternalStore } from 'react';

// Firebase's web config names the project; it is meant to ship in the page, it isn't a secret.
export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyDa3iuFZEXACtEhB5QUxLAxdPe_9mm1y-w',
  authDomain: 'lunchclub-fa2d4.firebaseapp.com',
  projectId: 'lunchclub-fa2d4',
  storageBucket: 'lunchclub-fa2d4.firebasestorage.app',
  messagingSenderId: '982646408056',
  appId: '1:982646408056:web:1790fa13c4c494489bbe8d',
});
const auth = getAuth(firebaseApp);

// Undefined until Firebase has restored (or not) the sign-in saved in this browser.
let user: User | null | undefined;
const listeners = new Set<() => void>();
const ready = new Promise<void>((resolve) => {
  onAuthStateChanged(auth, (next) => {
    user = next;
    listeners.forEach((l) => l());
    resolve();
  });
});

// The token for the API's Authorization header. Firebase renews it before it expires.
export async function idToken(): Promise<string | null> {
  await ready;
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // so people can pick their work account
  return (await signInWithPopup(auth, provider)).user;
}

export const signOutOfGoogle = () => signOut(auth);

// Who is signed in with Google: undefined while Firebase is still checking, null for nobody.
export const useGoogleUser = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => user,
  );

// Firebase errors carry a code; the ones a person can do something about get a sentence.
export function signInProblem(error: unknown): string | null {
  const code = (error as { code?: string }).code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null; // they changed their mind
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google window. Allow pop-ups for this site and try again.';
  if (code === 'auth/unauthorized-domain')
    return `Sign-in isn't allowed on ${window.location.hostname} yet. Add it under Authentication → Settings → Authorized domains in the Firebase console.`;
  if (code === 'auth/network-request-failed') return "Can't reach Google. Check your connection and try again.";
  return "Google sign-in didn't work. Try again.";
}
