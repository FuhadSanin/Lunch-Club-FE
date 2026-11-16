import { useReceipt } from '@/api/queries';
import { hhmm } from '@/api/adapt';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FoodPhoto, rupees } from '@/ui';
import type { ApiLunch, ApiReceipt } from '@/api/types';

const money = (paise: number) => rupees(paise / 100);
const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const ORDER_WORDS: Record<string, string> = { pending: 'Not ordered', placing: 'Ordering', needs_host: 'Needs you', placed: 'Ordered', delivered: 'Arrived' };

// What a lunch was called: the host's name for it, or the day.
export const receiptTitle = (r: { name: string; cutoff_at: string }) => r.name.trim() || `Food party on ${when(r.cutoff_at)}`;

function Details({ r }: { r: ApiReceipt }) {
  const owing = r.people.filter((p) => p.user.id !== r.host.id);
  return (
    <div className="grid gap-6">
      <p className="text-[13px] text-muted-foreground">
        {when(r.cutoff_at)} · picks closed {hhmm(new Date(r.cutoff_at))} · delivered to {r.address}
      </p>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['People', String(r.people.length)],
          ['Restaurants', String(r.restaurants.length)],
          ['Total', money(r.total_paise)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/60 px-2 py-3">
            <dt className="text-[12px] text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold tracking-[-0.02em] num">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="owe-h" className="grid gap-2.5">
        <h3 id="owe-h" className="text-sm font-semibold">Who ordered what, and what they owe you</h3>
        {!r.people.length && <p className="text-sm text-muted-foreground">Nobody picked anything.</p>}
        <ul className="grid gap-2">
          {r.people.map((p) => (
            <li key={p.user.id} className="rounded-xl border p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{p.user.name}{p.user.id === r.host.id && <span className="font-normal text-muted-foreground"> (you)</span>}</span>
                <span className="text-sm font-semibold num">{money(p.owes_paise)}</span>
              </div>
              <ul className="mt-1.5 grid gap-1 text-[13px] text-muted-foreground">
                {p.items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      {i.quantity} × {i.dish_name} <span className="opacity-70">· {i.restaurant_name}</span>
                      {i.note && <span className="block text-[12px] italic">“{i.note}”</span>}
                    </span>
                    <span className="flex-none num">{money(i.quantity * i.price_paise)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {owing.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            In all, {owing.length} {owing.length === 1 ? 'person owes' : 'people owe'} you {money(owing.reduce((n, p) => n + p.owes_paise, 0))}; your own share was {money(r.people.find((p) => p.user.id === r.host.id)?.owes_paise ?? 0)}.
          </p>
        )}
      </section>

      <section aria-labelledby="rest-h" className="grid gap-2.5">
        <h3 id="rest-h" className="text-sm font-semibold">Restaurants</h3>
        <ul className="grid gap-2">
          {r.restaurants.map((x) => (
            <li key={`${x.restaurant_id}-${x.name}`} className="rounded-xl border p-3">
              <div className="flex items-start gap-3">
                <FoodPhoto size={44} src={x.photo ?? undefined} className="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{x.name}</span>
                    <span className="flex-none text-sm font-semibold num">{money(x.total_paise)}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {[x.cuisines.join(', '), x.area, x.rating ? `${x.rating} rating` : '', x.eta, x.distance_km != null ? `${x.distance_km} km` : ''].filter(Boolean).join(' · ') || 'No more details kept'}
                  </p>
                  {x.order && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Badge variant={x.order.status === 'delivered' ? 'success' : 'info'}>{ORDER_WORDS[x.order.status] ?? x.order.status}</Badge>
                      {x.order.platform_order_id && <span>Swiggy order <span className="font-mono text-[12px] text-foreground">{x.order.platform_order_id}</span></span>}
                    </p>
                  )}
                </div>
              </div>
              <ul className="mt-2 grid gap-1 border-t pt-2 text-[13px]">
                {x.dishes.map((d) => (
                  <li key={d.dish_name + d.price_paise} className="flex justify-between gap-3">
                    <span className="min-w-0"><span className="text-foreground">{d.quantity} × {d.dish_name}</span> <span className="text-muted-foreground">· {d.people.join(', ')}</span></span>
                    <span className="flex-none text-muted-foreground num">{money(d.quantity * d.price_paise)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// The receipt of a past lunch, in a window: its name, what each person ordered and owes, and the restaurants.
// Only the host who ran it can open it, and the server says no to anyone else.
export function LunchReceipt({ lunch, onOpenChange }: { lunch: ApiLunch | null; onOpenChange: (open: boolean) => void }) {
  const receipt = useReceipt(lunch?.id ?? null);
  return (
    <Dialog open={!!lunch} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="p-5 pr-12 pb-3">
          <DialogTitle className="text-xl tracking-[-0.03em]">{receipt.data ? receiptTitle(receipt.data) : lunch ? receiptTitle({ name: lunch.name ?? '', cutoff_at: lunch.cutoff_at }) : 'Food party'}</DialogTitle>
          <DialogDescription>{lunch?.status === 'cancelled' ? 'This food party was called off.' : 'What everyone ordered and what they owe you.'}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {receipt.isPending && (
            <div className="grid gap-3" role="status" aria-busy="true" aria-label="Loading the food party">
              <Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-28 w-full rounded-xl" /><Skeleton className="h-28 w-full rounded-xl" />
            </div>
          )}
          {receipt.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-3 text-[13px] text-muted-foreground">
              <span>{receipt.error.message}</span>
              <Button size="sm" variant="outline" onClick={() => void receipt.refetch()}>Try again</Button>
            </div>
          )}
          {receipt.isSuccess && <Details r={receipt.data} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
