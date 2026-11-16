import { useState } from 'react';
import { toast } from 'sonner';
import { useConnections, useDisconnect } from '@/api/queries';
import type { ApiConnection } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// The assistants that are signed in as you right now, each with a way to cut it off.
export function Connections() {
  const connections = useConnections();
  const disconnect = useDisconnect();
  const [leaving, setLeaving] = useState<ApiConnection | null>(null);

  return (
    <>
      <Card aria-labelledby="connected-h">
        <CardHeader>
          <CardTitle id="connected-h">Connected assistants</CardTitle>
          <CardDescription>Disconnecting cuts an assistant off at once.</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.isPending && (
            <div className="grid gap-2" role="status" aria-busy="true" aria-label="Loading your connected assistants">
              {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          )}
          {connections.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-3 text-[13px] text-muted-foreground">
              <span>Couldn't load your connected assistants. {connections.error.message}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void connections.refetch()}>Try again</Button>
            </div>
          )}
          {connections.isSuccess && !connections.data.length && (
            <p className="rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">
              Nothing is connected yet. Follow the steps above and your assistant will show up here.
            </p>
          )}
          {connections.isSuccess && connections.data.length > 0 && (
            <ul className="grid gap-2" aria-label="Connected assistants">
              {connections.data.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      Connected {day(c.created_at)} · {c.last_used_at ? `last used ${when(c.last_used_at)}` : 'not used yet'}
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLeaving(c)}>Disconnect</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!leaving} onOpenChange={(open) => !open && !disconnect.isPending && setLeaving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {leaving?.name}?</DialogTitle>
            <DialogDescription>
              It can no longer act as you, and it can't sign itself back in. What it already did stays as it is. You can connect it again any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={disconnect.isPending} onClick={() => setLeaving(null)}>Keep it connected</Button>
            <Button
              disabled={disconnect.isPending}
              onClick={() => {
                if (!leaving) return;
                disconnect.mutate(leaving.id, {
                  onSuccess: () => {
                    toast.success('Disconnected', { description: leaving.name });
                    setLeaving(null);
                  },
                  onError: (err) => toast.error("Couldn't disconnect it", { description: err.message }),
                });
              }}
            >
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
