import { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { isDemoPreview } from './auth';
import { useGoogleUser } from './lib/firebase';
import { useStore } from './store';
import { AppSkeleton } from './components/skeletons';
import { dropPrerender } from './lib/prerender';
import { releaseStaleScrollLock } from './lib/scroll-lock';

// Two apps in one: the landing page for someone signed out, and the signed-in app (src/Shell.tsx). Each
// is its own download, so a visitor doesn't fetch the app's screens and a member doesn't fetch the
// landing page's scenes.
const loadLanding = () => import('./landing/Landing');
const loadSignedIn = () => import('./Shell');
const Landing = lazy(loadLanding);
const SignedIn = lazy(loadSignedIn);

// Start fetching the likely one straight away, while Firebase is still finding out who is signed in.
// (The guess comes from the last visit; a wrong guess only costs the head start.)
const HINT = 'lunchboard-signed-in';
const guessSignedIn = () => {
  try {
    return isDemoPreview() || window.localStorage.getItem(HINT) === '1';
  } catch {
    return false;
  }
};
void (guessSignedIn() ? loadSignedIn() : loadLanding()).catch(() => undefined); // a failure shows when it is rendered

export default function App() {
  const { state } = useStore();
  const google = useGoogleUser();
  const known = google !== undefined || isDemoPreview(); // false for a moment while Firebase restores a sign-in
  // Signed in means signed in with Google; only the demo preview signs in without it.
  const signedIn = isDemoPreview() ? state.signedIn : !!google;
  useEffect(() => {
    if (!known) return;
    try {
      window.localStorage.setItem(HINT, signedIn ? '1' : '0');
    } catch {
      /* storage unavailable: no head start next time */
    }
  }, [known, signedIn]);

  // Until Firebase has answered, go by the last visit: someone who was signed out sees the landing page at
  // once, without waiting; someone who was signed in sees the app's outline.
  const showApp = known ? signedIn : guessSignedIn();
  // Never leave the page stuck: a dialog that went away without closing must not keep it from scrolling.
  useEffect(() => {
    releaseStaleScrollLock();
    const again = () => releaseStaleScrollLock();
    window.addEventListener('hashchange', again);
    window.addEventListener('focus', again);
    return () => {
      window.removeEventListener('hashchange', again);
      window.removeEventListener('focus', again);
    };
  }, [showApp]);
  useLayoutEffect(() => {
    if (showApp) dropPrerender();
  }, [showApp]);
  if (!known && showApp) return <AppSkeleton label="Loading Tiffmate" />;
  return <Suspense fallback={showApp ? <AppSkeleton label="Loading Tiffmate" /> : null}>{showApp ? <SignedIn /> : <Landing />}</Suspense>;
}
