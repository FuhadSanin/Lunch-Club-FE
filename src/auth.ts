// Signing in and out of the app: Google first, then the app's own state and cached API answers.

import { toast } from 'sonner';
import { queryClient } from '@/api/queries';
import { signInProblem, signInWithGoogle, signOutOfGoogle } from '@/lib/firebase';
import { useStore } from '@/store';

// Screenshots and checks open the demo signed in without Google.
export const isDemoPreview = () => window.location.search.includes('demo=signed-in');

export function useSignIn() {
  const { dispatch } = useStore();
  // Resolves true once signed in; a shared lunch link (#/pick) stays where it pointed.
  return async (): Promise<boolean> => {
    try {
      await signInWithGoogle();
    } catch (error) {
      const problem = signInProblem(error);
      if (problem) toast.error("Couldn't sign in", { description: problem });
      return false;
    }
    await queryClient.resetQueries(); // answers from before sign-in were for nobody
    dispatch({ type: 'signIn' });
    if (!window.location.hash.startsWith('#/')) window.location.hash = '/';
    return true;
  };
}

export function useSignOut() {
  const { dispatch } = useStore();
  return async () => {
    await signOutOfGoogle();
    queryClient.clear();
    dispatch({ type: 'signOut' });
  };
}
