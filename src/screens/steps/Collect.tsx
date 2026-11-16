import { motion } from 'motion/react';
import { restaurantById } from '@/data/catalog';
import { useLunch, useStore } from '@/store';
import { FoodPhoto, firstName, Icon, rupees, VegMark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NextStep, StepPage } from '@/components/steps';
import { originOf, useCelebrate } from '@/components/celebrate';
import { ReviewProgress } from '../ReviewCard';
import { cn, spring } from '@/lib/cn';
import { usePending } from '@/lib/use-pending';

// Step 4 (collect): the food comes in one restaurant at a time. Each restaurant lists what we ordered
// from it, to check the bags against; mark it as it arrives, and once they all have, the lunch has arrived.
export default function Collect() {
  const { state, dispatch } = useStore();
  const lunch = useLunch();
  const { session } = state;
  const celebrate = useCelebrate();
  const { pending, run } = usePending();
  const arrived = (id: string) => !!session.arrived?.[id];
  const count = lunch.cart.filter((g) => arrived(g.restaurantId)).length;
  const all = lunch.cart.length > 0 && count === lunch.cart.length;
  // Not yet arrived first; arrived ones sink to the bottom.
  const list = [...lunch.cart].sort((a, b) => Number(arrived(a.restaurantId)) - Number(arrived(b.restaurantId)));

  return (
    <StepPage id="collect">
      <Card>
        <CardContent>
          <ReviewProgress done={count} of={lunch.cart.length} label="restaurants arrived" />
          <ul className="grid gap-2">
            {list.map((g) => {
              const done = arrived(g.restaurantId);
              const saving = pending(g.restaurantId);
              const people = new Set(g.lines.flatMap((l) => l.people)).size;
              return (
                <motion.li
                  key={g.restaurantId}
                  layout="position"
                  transition={spring}
                  className={cn('flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-300', done ? 'bg-ok-soft/70' : 'shadow-card')}
                >
                  <FoodPhoto size={44} src={restaurantById(g.restaurantId)?.photo} className="rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm font-semibold', done && 'text-ok')}>{g.name}</span>
                    <span className="block text-[13px] text-muted-foreground num">{g.dishes} {g.dishes === 1 ? 'dish' : 'dishes'} for {people} {people === 1 ? 'person' : 'people'} · {rupees(g.total)}</span>
                  </span>
                  {done ? (
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-ok"><Icon name="check" size={14} /> Arrived</span>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={saving} onClick={() => void run(g.restaurantId, () => dispatch({ type: 'arrive', restaurantId: g.restaurantId, done: false })).catch(() => undefined)}>
                        {saving ? 'Saving…' : 'Undo'}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      disabled={saving}
                      onClick={(e) => {
                        const from = originOf(e);
                        const last = count + 1 === lunch.cart.length;
                        // The doorbell and the green moment come when the last restaurant is saved as arrived, not on the click.
                        run(g.restaurantId, () => dispatch({ type: 'arrive', restaurantId: g.restaurantId, done: true })).then(
                          () => last && celebrate({ ...from, title: "Food's here!", sub: `All ${lunch.cart.length} restaurants have arrived. Time to hand it out.`, tone: 'indigo', icon: 'bag', sound: 'doorbell' }),
                          () => undefined, // the reason is already on screen as a toast
                        );
                      }}
                    >
                      {saving ? 'Saving…' : 'Mark as arrived'}
                    </Button>
                  )}
                  {/* What we ordered from here, to check the bags against. */}
                  <ul className="grid basis-full gap-1.5 border-t border-dashed pt-2.5 pl-14">
                    {g.lines.map((l) => (
                      <li key={l.dishId} className="flex items-baseline gap-2 text-[13px]">
                        <VegMark veg={l.veg} />
                        <span className="min-w-0 flex-1">
                          <span className={cn('font-medium', done ? 'text-ok' : 'text-foreground')}><span className="num">{l.qty} ×</span> {l.name}</span>
                          <span className="text-muted-foreground"> · for {l.people.map(firstName).join(', ')}</span>
                        </span>
                        <span className="text-muted-foreground num">{rupees(l.qty * l.price)}</span>
                      </li>
                    ))}
                  </ul>
                </motion.li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      {all && <NextStep to="distribute">Everything has arrived. Next, hand each person their food.</NextStep>}
    </StepPage>
  );
}
