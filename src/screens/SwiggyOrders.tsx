import { useState } from 'react';
import { toast } from 'sonner';
import { useOrderDelivered, useOrderPlaced, useOrderRetry } from '@/api/queries';
import { CheckIcon, CircleIcon, Loader2Icon, XIcon } from 'lucide-react';
import type { ApiBotStep, ApiCart, ApiOrder, ApiOrderStatus } from '@/api/types';
import { rupees } from '@/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BotSetup } from './BotSetup';
import { Label } from '@/components/ui/label';

const STATUS: Record<ApiOrderStatus, { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  pending: { label: 'Waiting', variant: 'secondary' },
  placing: { label: 'Placing', variant: 'warning' },
  needs_host: { label: 'Needs you', variant: 'warning' },
  placed: { label: 'Placed', variant: 'success' },
  delivered: { label: 'Arrived', variant: 'success' },
};

// The lunch's Swiggy checkouts from the API. Picks lock into one checkout per five restaurants. The host
// checks out in Swiggy by hand: each restaurant's page, its dishes and the cooking note are listed here,
// then the host enters the order's number.
export function SwiggyOrders({ orders }: { orders: ApiOrder[] }) {
  const done = orders.filter((o) => o.status === 'placed' || o.status === 'delivered').length;
  return (
    <Card aria-labelledby="orders-h">
      <CardHeader>
        <CardTitle id="orders-h">Swiggy orders</CardTitle>
        {orders.length > 0 && (
          <CardAction>
            <Badge variant={done === orders.length ? 'success' : 'secondary'}>{done}/{orders.length} placed</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <BotSetup />
        {orders.length ? (
          <ul className="grid gap-3">
            {orders.map((o) => <OrderRow key={o.id} order={o} />)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            They appear when picks lock: the cart is split into Swiggy checkouts, then you confirm it and they go out.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order }: { order: ApiOrder }) {
  const [number, setNumber] = useState('');
  const placed = useOrderPlaced();
  const delivered = useOrderDelivered();
  const retry = useOrderRetry();
  const s = STATUS[order.status];
  const fieldId = `swiggy-${order.id}`;

  return (
    <li className="rounded-xl p-3 shadow-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{order.restaurants.join(', ')}</div>
          <div className="text-[13px] text-muted-foreground num">
            {order.restaurant_count} {order.restaurant_count === 1 ? 'restaurant' : 'restaurants'} · {rupees(order.total_paise / 100)}
            {order.swiggy_order_id && <> · #{order.swiggy_order_id}</>}
          </div>
        </div>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
      {order.last_error && <p className="mt-2 text-[13px] text-warn">{order.last_error}</p>}
      {order.bot_steps.length > 0 && <BotSteps steps={order.bot_steps} />}

      {order.status === 'needs_host' && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={retry.isPending}
          onClick={() =>
            retry.mutate(order.id, {
              onSuccess: () => toast.success('Trying again', { description: 'The bot is filling your Swiggy cart.' }),
              onError: (err) => toast.error("Couldn't retry", { description: err.message }),
            })
          }
        >
          {retry.isPending ? 'Retrying…' : 'Retry automatic ordering'}
        </Button>
      )}

      {(order.status === 'needs_host' || order.status === 'pending') && order.carts.length > 0 && (
        <ol className="mt-3 grid gap-2.5">
          {order.carts.map((c, i) => <CartToAdd key={c.restaurant_name} cart={c} step={i + 1} />)}
        </ol>
      )}

      {order.status === 'pending' && order.last_error === '' && (
        <p className="mt-3 text-[13px] text-muted-foreground">Waiting its turn: the bot orders one restaurant at a time.</p>
      )}

      {order.status === 'needs_host' && (
        <div className="mt-3 grid gap-3">
          <Button
            type="button"
            size="sm"
            className="h-9 justify-self-start"
            disabled={placed.isPending}
            onClick={() =>
              placed.mutate(
                { orderId: order.id, swiggyOrderId: number.trim() },
                {
                  onSuccess: () => toast.success('Marked as ordered', { description: 'The next restaurant starts if one is waiting.' }),
                  onError: (err) => toast.error("Couldn't mark it as ordered", { description: err.message }),
                },
              )
            }
          >
            {placed.isPending ? 'Saving…' : 'Mark as ordered'}
          </Button>
          <div className="grid gap-1.5">
            <Label htmlFor={fieldId} className="text-[13px]">Swiggy order number (optional)</Label>
            <Input id={fieldId} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="From the Swiggy app, e.g. 184220973" autoComplete="off" className="h-9" />
          </div>
        </div>
      )}

      {order.status === 'placed' && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={delivered.isPending}
          onClick={() => delivered.mutate(order.id, { onError: (err) => toast.error("Couldn't mark it as arrived", { description: err.message }) })}
        >
          Mark as arrived
        </Button>
      )}
    </li>
  );
}

// The order bot's checkpoints: each step says why it exists, and a failed step says why it failed.
// Steps after a failure were never reached.
function BotSteps({ steps }: { steps: ApiBotStep[] }) {
  const failed = steps.some((st) => st.status === 'failed');
  const doneCount = steps.filter((st) => st.status === 'done').length;
  return (
    <section aria-label="Order bot steps" className="mt-3 rounded-lg bg-muted/60 p-3">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium">Order bot steps</span>
        <span className="text-muted-foreground num">{doneCount}/{steps.length} done</span>
      </div>
      <ol className="mt-2 grid gap-2">
        {steps.map((st) => {
          const skipped = failed && st.status === 'pending';
          return (
            <li key={st.key} className={`flex gap-2.5 text-sm ${skipped ? 'opacity-50' : ''}`}>
              <StepIcon status={st.status} />
              <div className="min-w-0 flex-1">
                <div className={st.status === 'failed' ? 'font-medium text-destructive' : 'font-medium'}>
                  {st.label}
                  {skipped && <span className="ml-1.5 text-xs font-normal text-muted-foreground">not reached</span>}
                </div>
                <div className="text-xs text-muted-foreground">Why: {st.why}</div>
                {st.detail && (
                  <div className={`mt-0.5 text-[13px] ${st.status === 'failed' ? 'text-destructive' : 'text-ok'}`}>
                    {st.status === 'failed' ? 'Failed: ' : ''}{st.detail}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StepIcon({ status }: { status: ApiBotStep['status'] }) {
  const base = 'mt-0.5 size-4 flex-none';
  if (status === 'done') return <CheckIcon className={`${base} text-ok`} aria-label="Done" />;
  if (status === 'failed') return <XIcon className={`${base} text-destructive`} aria-label="Failed" />;
  if (status === 'running') return <Loader2Icon className={`${base} animate-spin text-warn`} aria-label="Running" />;
  return <CircleIcon className={`${base} text-muted-foreground`} aria-label="Waiting" />;
}

// One restaurant to check out in Swiggy: open its page, add each dish, paste the note into
// "Cooking requests". Swiggy's cart holds one restaurant at a time.
function CartToAdd({ cart, step }: { cart: ApiCart; step: number }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cart.cooking_note);
      toast.success('Cooking note copied', { description: `Paste it into Cooking requests in ${cart.restaurant_name}'s cart.` });
    } catch {
      toast.error("Couldn't copy the note", { description: 'Select it and copy it by hand.' });
    }
  };
  return (
    <li className="rounded-lg bg-muted/60 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          <span className="text-muted-foreground num">{step}. </span>
          {cart.restaurant_name}
          <span className="ml-1.5 text-[13px] font-normal text-muted-foreground num">{rupees(cart.total_paise / 100)}</span>
        </span>
        <Button asChild size="sm" variant="outline" className="h-8">
          <a href={cart.swiggy_url} target="_blank" rel="noopener noreferrer">
            {cart.restaurant_id ? 'Open in Swiggy' : 'Find in Swiggy'}
          </a>
        </Button>
      </div>
      <ul className="mt-2 grid gap-1">
        {cart.dishes.map((d) => (
          <li key={d.name} className="flex gap-2">
            <span className="w-7 flex-none text-right font-semibold num">{d.quantity}×</span>
            <span className="min-w-0 flex-1">
              {d.name}
              <span className="block truncate text-xs text-muted-foreground">{d.people.join(', ')}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex items-start gap-2">
        <pre className="min-w-0 flex-1 whitespace-pre-wrap rounded-md bg-background p-2 font-sans text-xs text-muted-foreground shadow-ring">{cart.cooking_note}</pre>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => void copy()} aria-label={`Copy the cooking note for ${cart.restaurant_name}`}>
          Copy note
        </Button>
      </div>
    </li>
  );
}
