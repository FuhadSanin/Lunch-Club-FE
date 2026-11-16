import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
export default function Account() {
  const { live, meId } = useStore();
  const me = personById(meId);
  const signOut = useSignOut();
  const [asking, setAsking] = useState(false);

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
