import { useState } from 'react';
import { toast } from 'sonner';
import { useConnections, useDeleteLocalMenu, useLocalMenus } from '@/api/queries';
import type { ApiLocalMenu } from '@/api/types';
import { usePending } from '@/lib/use-pending';
import { FoodPhoto, Icon, Rating, rupees, VegMark } from '@/ui';
import { IconButton } from '@/components/IconButton';
import { PageTitle } from '@/components/PageTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuForm } from './local-menu/MenuForm';

// The AI way in: only when an assistant is connected. Otherwise it says how to connect one, and the form below still works.
function ByChat({ assistants }: { assistants: string[] | null }) {
  const on = !!assistants?.length;
  return (
    <Card aria-labelledby="chat-h" className={on ? undefined : 'border-dashed bg-muted/30 shadow-none'}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle id="chat-h" className={on ? undefined : 'text-muted-foreground'}>Add by chatting with your AI assistant</CardTitle>
          {assistants === null ? <Skeleton className="h-5 w-20 rounded-full" /> : on ? <Badge variant="success">On · {assistants.join(', ')}</Badge> : <Badge variant="secondary">Off</Badge>}
        </div>
        <CardDescription>
          {on
            ? 'Send a photo or the text of a menu to your assistant and ask it to save it. It reads every dish and price, and the menu shows up here.'
            : 'Connect an AI assistant and you can just send it a photo of a menu. Until then, add the menu by hand.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {on ? (
          <p className="rounded-xl bg-muted/60 p-3 text-[13.5px] leading-6">
            Try: <span className="font-medium">“Here is the menu of Amma's Mess, 1.4 km away, rated 4.3. Save it as a local menu.”</span>
          </p>
        ) : (
          <Button asChild variant="outline" size="sm"><a href="#/connect">Connect an AI assistant</a></Button>
        )}
      </CardContent>
    </Card>
  );
}

function MenuCard({ menu, onEdit, onDelete }: { menu: ApiLocalMenu; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-start gap-3.5">
        <FoodPhoto size={64} src={menu.image || undefined} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold tracking-[-0.02em]">{menu.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground num">
            {menu.rating != null && <Rating value={menu.rating} />}
            {menu.distance_km != null && <span className={menu.rating != null ? "before:mr-2 before:content-['·']" : ''}>{menu.distance_km} km away</span>}
            <span className={menu.rating != null || menu.distance_km != null ? "before:mr-2 before:content-['·']" : ''}>{menu.items.length} {menu.items.length === 1 ? 'dish' : 'dishes'}</span>
          </p>
        </div>
        <div className="flex flex-none gap-1.5">
          <IconButton icon="pencil" label={`Edit ${menu.name}`} variant="outline" onClick={onEdit} />
          <IconButton icon="trash" label={`Delete ${menu.name}`} onClick={onDelete} />
        </div>
      </div>
      <Button type="button" variant="link" size="sm" className="mt-2 h-auto px-0 text-[13px]" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide the menu' : 'See the menu'}
      </Button>
      {open && (
        <ul className="mt-2 grid gap-2 border-t pt-3">
          {menu.items.map((i) => (
            <li key={i.id ?? i.name} className="flex items-center gap-3 text-sm">
              <FoodPhoto size={36} src={i.image || undefined} className="rounded-lg" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5"><VegMark veg={i.veg ?? undefined} /><span className="truncate">{i.name}</span></span>
              <span className="flex-none font-medium num">{rupees(i.price_paise / 100)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// The host's local menus: restaurants that aren't on Swiggy. They can be offered when starting a party.
export default function LocalMenus() {
  const menus = useLocalMenus();
  const connections = useConnections();
  const del = useDeleteLocalMenu();
  const { run, pending } = usePending();
  const [form, setForm] = useState<{ menu: ApiLocalMenu | null } | null>(null);
  const [removing, setRemoving] = useState<ApiLocalMenu | null>(null);
  const assistants = connections.isSuccess ? [...new Set(connections.data.map((c) => c.name))] : connections.isError ? [] : null;

  return (
    <>
      <PageTitle
        title="Local menu"
        sub="Keep the menu of a restaurant that isn't on Swiggy, with its dishes and prices. When you start a food party, offer it next to the Swiggy restaurants."
        actions={<Button size="lg" onClick={() => setForm({ menu: null })}><Icon name="new" size={16} /> Add a menu by hand</Button>}
      />
      <div className="grid max-w-[900px] gap-4">
        <ByChat assistants={assistants} />

        <section aria-labelledby="mine-h" className="grid gap-3">
          <h2 id="mine-h" className="text-base font-semibold tracking-[-0.02em]">Your local menus{menus.isSuccess && menus.data.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground num">{menus.data.length}</span>}</h2>
          {menus.isPending && <div className="grid gap-2" role="status" aria-busy="true" aria-label="Loading your local menus">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>}
          {menus.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-3 text-[13px] text-muted-foreground">
              <span>Couldn't load your local menus. {menus.error.message}</span>
              <Button size="sm" variant="outline" onClick={() => void menus.refetch()}>Try again</Button>
            </div>
          )}
          {menus.isSuccess && !menus.data.length && (
            <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">
              No local menus yet. {assistants?.length ? 'Send one to your assistant, or add one by hand.' : 'Add one by hand to get started.'}
            </p>
          )}
          {menus.isSuccess && menus.data.length > 0 && (
            <ul className="grid gap-3">
              {menus.data.map((m) => <MenuCard key={m.id} menu={m} onEdit={() => setForm({ menu: m })} onDelete={() => setRemoving(m)} />)}
            </ul>
          )}
        </section>
      </div>

      {form && <MenuForm key={form.menu?.id ?? 'new'} menu={form.menu} open onOpenChange={(o) => !o && setForm(null)} />}

      <Dialog open={!!removing} onOpenChange={(o) => !o && !pending('delete') && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{removing?.name}”?</DialogTitle>
            <DialogDescription>Food parties already started with it keep their copy. This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending('delete')} onClick={() => setRemoving(null)}>Keep it</Button>
            <Button
              variant="destructive"
              disabled={pending('delete')}
              onClick={() => {
                if (!removing) return;
                void run('delete', () => del.mutateAsync(removing.id))
                  .then(() => { toast.success('Menu deleted', { description: removing.name }); setRemoving(null); })
                  .catch((e: Error) => toast.error("Couldn't delete the menu", { description: e.message }));
              }}
            >
              {pending('delete') ? 'Deleting…' : 'Delete menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
