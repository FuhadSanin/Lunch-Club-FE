import { useState } from 'react';
import { toast } from 'sonner';
import { useDecideOAuth, useMe, useOAuthRequest } from '@/api/queries';
import { ApiError } from '@/api/client';
import { useSignOut } from '@/auth';
import { Mark } from '@/ui';
import { ThemeToggle } from '@/components/theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CAN = [
  'Start lunches and share links',
  'Join lunches and pick dishes',
  'Lock, confirm and record orders on lunches you host',
  'See your lunches and notifications',
];
const CANNOT = [
  'Change company settings, people, roles or access tokens',
  'Pay for anything: orders are still placed by you in Swiggy',
];

// Where to send the browser next: back to the assistant. Its address is whatever the assistant registered, so
// anything that could run script in this page is refused (a normal https/http address or an app's own
// scheme, like cursor://, is fine).
const BLOCKED = new Set(['javascript:', 'data:', 'vbscript:', 'blob:', 'file:']);
export function safeRedirect(target: string): string | null {
  try {
    const url = new URL(target);
    return BLOCKED.has(url.protocol) ? null : url.toString();
  } catch {
    return null;
  }
}

const goToApp = () => {
  window.location.hash = '/';
};

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]">
          <Mark /> Lunch Board
        </div>
        {children}
      </div>
    </main>
  );
}

// A focused full-page screen, without the app's sidebar: an AI assistant (opened from its own sign-in) asks to
// act as you. Allow sends it a code; Cancel tells it you refused. Either way the browser goes back to it.
export default function Authorize({ id }: { id: string }) {
  const request = useOAuthRequest(id);
  const me = useMe();
  const decide = useDecideOAuth();
  const signOut = useSignOut();
  const [chosen, setChosen] = useState<'allow' | 'deny' | null>(null);
  const [sent, setSent] = useState(false); // the answer is going back: keep the buttons off

  const answer = (allow: boolean) => {
    setChosen(allow ? 'allow' : 'deny');
    decide.mutate(
      { id, allow },
      {
        onSuccess: ({ redirect_to }) => {
          const target = safeRedirect(redirect_to);
          if (!target) {
            setChosen(null);
            toast.error("Couldn't go back to the assistant", { description: 'It sent an address that is not safe to open.' });
            return;
          }
          setSent(true);
          window.location.assign(target);
        },
        onError: (err) => {
          setChosen(null);
          toast.error(allow ? "Couldn't connect it" : "Couldn't cancel", { description: err.message });
        },
      },
    );
  };

  if (request.isPending) {
    return (
      <Page>
        <Card aria-busy="true" role="status" aria-label="Loading the request">
          <CardContent className="grid gap-4 py-8">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (request.isError) {
    const gone = request.error instanceof ApiError && (request.error.status === 404 || request.error.status === 410);
    return (
      <Page>
        <Card role="alert">
          <CardHeader>
            <CardTitle className="text-xl tracking-[-0.03em]">{gone ? "This request can't be used" : "Couldn't load the request"}</CardTitle>
            <CardDescription>
              {gone
                ? `${request.error.message} Start again from your assistant to get a new one.`
                : request.error.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {!gone && <Button variant="outline" onClick={() => void request.refetch()}>Try again</Button>}
            <Button onClick={goToApp}>Go to Lunch Board</Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const { client_name: client, redirect_host: host } = request.data;
  const busy = decide.isPending || sent;
  return (
    <Page>
      <Card aria-labelledby="authorize-h">
        <CardHeader>
          <CardTitle id="authorize-h" className="text-2xl tracking-[-0.03em]">Connect {client} to Lunch Club</CardTitle>
          <CardDescription>
            {me.data ? (
              <>
                Signed in as <strong className="font-medium text-foreground">{me.data.name}</strong> ({me.data.email}).{' '}
                <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => void signOut()}>
                  Not you? Sign out
                </button>
              </>
            ) : (
              'Checking who you are…'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <h2 className="text-sm font-medium">{client} will be able to act as you to:</h2>
            <ul className="grid gap-1.5 text-[14px]">
              {CAN.map((t) => (
                <li key={t} className="flex gap-2.5"><span aria-hidden="true" className="mt-px text-ok">✓</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2">
            <h2 className="text-sm font-medium">It won't be able to:</h2>
            <ul className="grid gap-1.5 text-[14px] text-muted-foreground">
              {CANNOT.map((t) => (
                <li key={t} className="flex gap-2.5"><span aria-hidden="true" className="mt-px">✕</span>{t}</li>
              ))}
            </ul>
          </div>
          <p className="text-[13px] text-muted-foreground">
            You'll be sent back to <strong className="font-medium text-foreground">{host}</strong>. You can disconnect it any time under Connect to an AI assistant.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={busy} onClick={() => answer(true)}>
              {busy && chosen === 'allow' ? 'Connecting…' : 'Allow'}
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => answer(false)}>
              {busy && chosen === 'deny' ? 'Cancelling…' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
