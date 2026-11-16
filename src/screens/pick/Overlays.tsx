import { motion } from 'motion/react';
import type { Pick, SessionStatus } from '@/model';
import { dishById } from '@/data/catalog';
import { personById } from '@/data/people';
import { LockScene } from '@/components/lock-scene';
import { Button } from '@/components/ui/button';
import { useLunch, useStore } from '@/store';
import { FoodPhoto, Icon, rupees } from '@/ui';
import { cn, spring } from '@/lib/cn';

// What covers the menus when you can no longer pick: your order is complete (or you skipped), or picks
// are locked and the order is on its way.

// Over the menus once your order is complete or you skipped: it's final, and only the host can reopen it.
export function DoneOver({ mine, total }: { mine: Pick; total: number }) {
  const { state } = useStore();
  const host = personById(state.session.hostId)?.name.split(' ')[0] ?? 'the host';
  const dishes = mine.items.reduce((n, l) => n + l.qty, 0);
  return (
    <motion.div
      className="absolute inset-0 z-20 rounded-2xl bg-background/30 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sticky top-24 flex justify-center px-4 pt-12 pb-10">
        <motion.div
          role="status"
          className="grid w-full max-w-md justify-items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
        >
          <span className={cn('grid size-14 place-items-center rounded-full', mine.skipped ? 'bg-muted text-muted-foreground' : 'bg-ok-soft text-ok')} aria-hidden="true">
            <Icon name={mine.skipped ? 'close' : 'check'} size={24} />
          </span>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">{mine.skipped ? "You're skipping today" : 'Your order is complete'}</h2>
          {!mine.skipped && (
            <ul className="grid w-full gap-2 rounded-xl bg-muted/60 p-3 text-left">
              {mine.items.map((l) => {
                const f = dishById(l.dishId);
                return f ? (
                  <li key={l.dishId} className="flex items-center gap-3 text-sm">
                    <FoodPhoto size={28} src={f.dish.photo} className="rounded-md" />
                    <span className="min-w-0 flex-1 truncate">{l.qty > 1 && <span className="num">{l.qty} × </span>}{f.dish.name}</span>
                    <span className="num">{rupees(f.dish.price * l.qty)}</span>
                  </li>
                ) : null;
              })}
              <li className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>{dishes} {dishes === 1 ? 'dish' : 'dishes'}</span><span className="num">{rupees(total)}</span>
              </li>
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            It's on the board for the {state.session.cutoff} cutoff. Need a change? Ask {host} to reopen it for you.
          </p>
          <Button asChild className="w-full">
            <a href="#/">See the board</a>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Over the menus once picks lock: everything behind is blurred and can't be used. The lock comes
// down over the latest picks with the cutoff stamped on it (as in "How lunch runs"), then what you
// ended up with.
export function LockedOver({ status, mine, total }: { status: SessionStatus; mine?: Pick; total: number }) {
  const { state } = useStore();
  const lunch = useLunch();
  const rows = [...lunch.picked]
    .sort((a, b) => (state.picks[b.id]?.updatedAt ?? '').localeCompare(state.picks[a.id]?.updatedAt ?? ''))
    .map((person) => ({
      person,
      amount: state.picks[person.id]?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0,
    }));
  const dishes = mine?.items.reduce((n, l) => n + l.qty, 0) ?? 0;
  const ordered = status !== 'locked';
  const why =
    status === 'locked'
      ? 'The host is checking the cart.'
      : status === 'placing'
        ? 'The host confirmed the cart. The Swiggy order is going out now.'
        : status === 'placed'
          ? 'Food party is on its way. Your name is on your food.'
          : 'The food has arrived. Collect yours from the host.';
  return (
    <motion.div
      className="absolute inset-0 z-20 rounded-2xl bg-background/30 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sticky top-24 flex justify-center px-4 pt-12 pb-10">
        <motion.div
          key={ordered ? 'ordered' : 'locked'}
          role="status"
          aria-label={ordered ? 'Order placed' : `Picks locked at ${state.session.cutoff}`}
          className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
        >
          {ordered ? (
            <OrderedScene
              status={status}
              orderRef={state.session.orderRef}
              people={lunch.picked.length}
              dishes={lunch.dishes}
              total={lunch.total}
            />
          ) : (
            <LockScene
              large
              rows={rows}
              cutoff={state.session.cutoff}
              people={lunch.picked.length}
              dishes={lunch.dishes}
              waiting={lunch.waiting.length}
            />
          )}
          <p className="mt-4 text-sm text-muted-foreground">{why}</p>
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm">
            {mine?.skipped
              ? 'You skipped today.'
              : dishes
                ? <>Your pick: <span className="font-semibold num">{dishes} {dishes === 1 ? 'dish' : 'dishes'}, {rupees(total)}</span></>
                : "You didn't pick today."}
          </p>
          <Button asChild className="mt-4 w-full">
            <a href="#/">See the board</a>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// When the check finishes drawing in the order scene, for lining the till sound up with it.
export const ORDER_CHECK = 0.6;

// Once the host has placed the order: a green check draws itself, then what went out.
function OrderedScene({ status, orderRef, people, dishes, total }: { status: SessionStatus; orderRef: string | null; people: number; dishes: number; total: number }) {
  const title = status === 'placing' ? 'Order going out' : status === 'delivered' ? 'The food has arrived' : 'Order placed';
  return (
    <div className="grid justify-items-center gap-3 py-4 text-center">
      <motion.div
        className="grid size-20 place-items-center rounded-full bg-ok-soft text-ok"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring, delay: 0.1 }}
      >
        <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
          <motion.circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }} />
          <motion.path d="M19 33 l9 9 l17 -19" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: 'easeOut', delay: 0.45 }} />
        </svg>
      </motion.div>
      <motion.h2 className="text-2xl font-semibold tracking-[-0.03em]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        {title}
      </motion.h2>
      {orderRef && (
        <motion.span initial={{ scale: 1.6, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: -3 }} transition={{ ...spring, delay: 0.75 }}
          className="inline-block rounded-lg border-2 border-ok px-3 py-1 text-sm font-semibold text-ok num">
          Swiggy {orderRef}
        </motion.span>
      )}
      <motion.p className="text-[13px] text-muted-foreground num" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }}>
        {people} {people === 1 ? 'person' : 'people'} · {dishes} {dishes === 1 ? 'dish' : 'dishes'} · {rupees(total)}
      </motion.p>
    </div>
  );
}
