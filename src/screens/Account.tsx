import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/api/client';
import { useSignOut } from '@/auth';
import { useStore } from '@/store';
import { personById } from '@/data/people';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageTitle } from '@/components/PageTitle';

// Your account: what Tiffmate keeps about you, and a way to delete it (the DPDP Act asks for one, and so does
// Swiggy's data policy). The server decides if it can be done now (not while you host a food party that is
// not over, or while your food is being ordered) and says why in plain words.
type SwiggyState = { available: boolean; connected: boolean; since: string | null };

// Where Swiggy sent the host back to: the API's callback ends at #/account?swiggy=connected|declined|failed.
function useSwiggyReturn(refresh: () => void) {
  useEffect(() => {
    const query = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    const outcome = query.get('swiggy');
    if (!outcome) return;
    window.history.replaceState(null, '', '#/account');
    if (outcome === 'connected') toast.success('Swiggy is connected', { description: 'Tiffmate can now use your Swiggy account when you place a food party order.' });
    else toast.error("Swiggy isn't connected", { description: query.get('message') ?? 'Try connecting again.' });
    refresh();
  }, [refresh]);
}

export default function Account() {
  const { live, meId } = useStore();
  const me = personById(meId);
  const signOut = useSignOut();
  const [asking, setAsking] = useState(false);
  const queryClient = useQueryClient();

  const swiggy = useQuery({ queryKey: ['swiggy'], queryFn: () => api<SwiggyState>('swiggy/connection'), enabled: !!live });
  useSwiggyReturn(() => void queryClient.invalidateQueries({ queryKey: ['swiggy'] }));
  const connect = useMutation({
    mutationFn: () => api<{ url: string }>('swiggy/connection', { method: 'POST' }),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (e) => toast.error("Couldn't connect Swiggy", { description: e instanceof ApiError ? e.message : 'Check your connection and try again.' }),
  });
  const disconnect = useMutation({
    mutationFn: () => api<void>('swiggy/connection', { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['swiggy'] });
      toast.success('Swiggy is disconnected', { description: 'Tiffmate no longer has your Swiggy sign-in.' });
    },
    onError: (e) => toast.error("Couldn't disconnect Swiggy", { description: e instanceof ApiError ? e.message : 'Check your connection and try again.' }),
  });

  const erase = useMutation({
    mutationFn: () => api<void>('me', { method: 'DELETE' }),
    onSuccess: async () => {
      setAsking(false);
      toast.success('Your account is deleted', { description: 'Your name, email and sign-in are gone.' });
      await signOut();
    },
    onError: (e) => {
      setAsking(false);
      toast.error("Couldn't delete your account", { description: e instanceof ApiError ? e.message : 'Check your connection and try again.' });
    },
  });

  return (
    <>
      <PageTitle title="Your account" sub="What Tiffmate keeps about you, and how to delete it." />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>What we keep</CardTitle>
            <CardDescription>Only what a food party needs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-body">
            <p>
              Signed in as <span className="font-medium text-foreground">{me?.name}</span>
              {me?.email && <> ({me.email})</>}. We keep your name and email from Google, the dishes you picked, the delivery addresses you chose, and the local menus you saved.
            </p>
            <p>
              <a className="font-medium text-brand underline-offset-4 hover:underline" href="/privacy">Read the privacy notice</a> · <a className="font-medium text-brand underline-offset-4 hover:underline" href="/terms">Terms of use</a>
            </p>
          </CardContent>
        </Card>

        {live && (
          <Card>
            <CardHeader>
              <CardTitle>Your Swiggy account</CardTitle>
              <CardDescription>
                Only the host who places the order needs this. Guests just pick dishes. Tiffmate uses your Swiggy account only to build and place the carts you confirm, and keeps the sign-in encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              {swiggy.data?.connected ? (
                <>
                  <span className="text-sm text-body">Connected.</span>
                  <Button variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>{disconnect.isPending ? 'Disconnecting…' : 'Disconnect Swiggy'}</Button>
                </>
              ) : (
                <Button disabled={!swiggy.data?.available || connect.isPending} onClick={() => connect.mutate()}>{connect.isPending ? 'Opening Swiggy…' : 'Connect Swiggy'}</Button>
              )}
              {swiggy.data && !swiggy.data.available && <p className="w-full text-[13px] text-muted-foreground">Connecting opens once Swiggy has approved Tiffmate.</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Delete my account</CardTitle>
            <CardDescription>
              This removes your name, email, sign-in, devices, notifications, assistant access and saved local menus, and your picks in food parties still taking picks. A finished food party keeps its record of who ordered what, as "Former member", so nobody's totals change. It can't be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled={!live || erase.isPending} onClick={() => setAsking(true)}>Delete my account</Button>
            {!live && <p className="mt-3 text-[13px] text-muted-foreground">This is the demo, so there is no account to delete.</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={asking} onOpenChange={(o) => !erase.isPending && setAsking(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>You will be signed out, and nobody can get this account back. If you host a food party that is not over, or your food is being ordered, we will ask you to wait until it is done.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={erase.isPending} onClick={() => setAsking(false)}>Keep my account</Button>
            <Button variant="destructive" disabled={erase.isPending} onClick={() => erase.mutate()}>{erase.isPending ? 'Deleting…' : 'Delete my account'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
