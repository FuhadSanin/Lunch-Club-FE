import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { personById } from '@/data/demo';
import { dishById, restaurantById } from '@/data/menus';
import { useLunch, useStore } from '@/store';
import { Avatar, FoodPhoto, firstName, Icon, rupees, VegMark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList } from '@/components/ui/segmented';
import { StatusBadge, StatusDot } from '@/components/status';
import { NextStep, StepPage } from '@/components/steps';
import { UnlockPicks } from '@/components/unlock';
import { LockScene } from '@/components/lock-scene';
import { originOf, useCelebrate } from '@/components/celebrate';
import { ReviewCard, ReviewLine, ReviewProgress } from './ReviewCard';

type View = 'restaurant' | 'person';
const VIEWS: { value: View; label: string }[] = [
  { value: 'restaurant', label: 'By restaurant' },
  { value: 'person', label: 'By person' },
];

// Step 2, review & lock: what everyone picked, by restaurant or by person, while picks are open (the
// host can let someone who completed their order change it), then locking the picks.
export default function ReviewScreen() {
  const { state, dispatch, live } = useStore();
  const lunch = useLunch();
  const { session, picks } = state;
  const [view, setView] = useState<View>('restaurant');
  const [query, setQuery] = useState('');
  const canReopen = session.status === 'open' && (live ? live.canReopen : state.role === 'host');
  const reopen = (id: string, name: string) =>
    Promise.resolve(dispatch({ type: 'reopenPick', userId: id })).then(() => toast.success(`${name.split(' ')[0]} can change their order again`), () => undefined);

  // Each person's own order: their dishes, which restaurant each comes from, their note and what they owe.
  const people = useMemo(
    () =>
      lunch.picked.map((p) => {
        const pick = picks[p.id];
        const lines = pick.items.flatMap((l) => {
          const f = dishById(l.dishId);
          return f ? [{ ...l, dish: f.dish, restaurant: f.restaurant }] : [];
        });
        return {
          person: p,
          note: pick.note.trim(),
          lines,
          dishes: lines.reduce((n, l) => n + l.qty, 0),
          total: lines.reduce((n, l) => n + l.qty * l.dish.price, 0),
        };
      }),
    [lunch.picked, picks],
  );
  const q = query.trim().toLowerCase();
  const shown = q
    ? people.filter((o) => o.person.name.toLowerCase().includes(q) || o.lines.some((l) => l.dish.name.toLowerCase().includes(q) || l.restaurant.name.toLowerCase().includes(q)))
    : people;
  const completed = lunch.picked.filter((p) => picks[p.id]?.done).length;
  const host = state.role === 'host';
  const open = session.status === 'open';
  const celebrate = useCelebrate();

  // Locking closes picks for everyone: the dark moment with the padlock snapping shut and its click.
  const lockNow = (e: React.MouseEvent<HTMLButtonElement>) => {
    const from = originOf(e);
    const sub = `${lunch.picked.length} ${lunch.picked.length === 1 ? 'person' : 'people'}, ${lunch.dishes} ${lunch.dishes === 1 ? 'dish' : 'dishes'}, ${rupees(lunch.total)}. Nobody can change their pick now.`;
    Promise.resolve(dispatch({ type: 'lock' })).then(
      () => celebrate({ ...from, kind: 'lock', title: 'Picks locked', sub, sound: 'lock' }),
      () => undefined,
    );
  };
  const rows = lunch.picked.map((person) => ({
    person,
    amount: picks[person.id]?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0,
  }));

  return (
    <StepPage
      id="review"
      sub={
        <>
          <strong className="font-semibold text-foreground">{lunch.cart.length} restaurants, {lunch.dishes} dishes, {rupees(lunch.total)}</strong> for {lunch.picked.length} people so far.
          Everything goes into one Swiggy cart.
        </>
      }
      actions={open && host ? (
        <Button disabled={!lunch.dishes} onClick={lockNow}><Icon name="lock" size={14} /> Lock picks now</Button>
      ) : <UnlockPicks />}
    >
      {!open && (
        <>
          <Card className="mb-4">
            <CardContent className="mx-auto w-full max-w-md">
              <LockScene large rows={rows} cutoff={session.cutoff} people={lunch.picked.length} dishes={lunch.dishes} waiting={lunch.waiting.length} />
            </CardContent>
          </Card>
          {host && <div className="mb-4"><NextStep to="order">Picks are locked. Next, place the order on Swiggy.</NextStep></div>}
        </>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8" aria-labelledby="cart-h">
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="gap-6">
            <CardHeader className="max-sm:has-data-[slot=card-action]:grid-cols-1">
              <CardTitle id="cart-h">The cart</CardTitle>
              <CardDescription>Swiggy adds its delivery fee and taxes at checkout. Each person's name goes in the restaurant note so the food comes labelled.</CardDescription>
              <CardAction className="max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-3 max-sm:mt-3 max-sm:justify-self-stretch">
                <PillTabsList label="View the cart" value={view} options={VIEWS} className="max-sm:grid max-sm:w-full max-sm:grid-cols-2" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <TabsContent value="restaurant">
                <div className="grid gap-2.5">
                  {lunch.cart.map((g) => (
                    <ReviewCard
                      key={g.restaurantId}
                      media={<FoodPhoto size={40} src={restaurantById(g.restaurantId)?.photo} className="rounded-lg" />}
                      title={g.name}
                      meta={`${g.dishes} ${g.dishes === 1 ? 'dish' : 'dishes'} for ${new Set(g.lines.flatMap((l) => l.people)).size} people`}
                      total={rupees(g.total)}
                    >
                      {g.lines.map((l) => (
                        <ReviewLine
                          key={l.dishId}
                          mark={<VegMark veg={l.veg} />}
                          name={l.name}
                          sub={<>{rupees(l.price)} each · for {l.people.map(firstName).join(', ')}</>}
                          qty={l.qty}
                          amount={rupees(l.qty * l.price)}
                        />
                      ))}
                    </ReviewCard>
                  ))}
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t pt-4 text-sm font-semibold">
                  <span>Items total, {lunch.dishes} dishes</span>
                  <span className="num">{rupees(lunch.total)}</span>
                </div>
              </TabsContent>

              <TabsContent value="person">
                <ReviewProgress done={people.filter((o) => picks[o.person.id]?.done).length} of={people.length} label="orders completed" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a person, dish or restaurant"
                  aria-label="Find a person, dish or restaurant"
                  className="mb-3 h-10"
                />
                <div className="grid gap-2.5">
                  {[...shown].sort((a, b) => Number(!!picks[a.person.id]?.done) - Number(!!picks[b.person.id]?.done)).map((o) => {
                    const from = [...new Set(o.lines.map((l) => l.restaurant.name))];
                    return (
                      <ReviewCard
                        key={o.person.id}
                        media={<Avatar person={personById(o.person.id)!} />}
                        title={o.person.name}
                        meta={<>{o.dishes} {o.dishes === 1 ? 'dish' : 'dishes'} · {from.join(', ')}</>}
                        total={rupees(o.total)}
                        done={!!picks[o.person.id]?.done}
                        doneLabel="Completed"
                        action={canReopen && picks[o.person.id]?.done ? (
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => reopen(o.person.id, o.person.name)}>Reopen</Button>
                        ) : undefined}
                      >
                        {o.lines.map((l) => (
                          <ReviewLine
                            key={l.dishId}
                            mark={<VegMark veg={l.dish.veg} />}
                            name={l.dish.name}
                            sub={
                              <span className="inline-flex items-center gap-1.5">
                                <FoodPhoto size={16} src={l.restaurant.photo} className="rounded" />
                                {l.restaurant.name} · {rupees(l.dish.price)} each
                              </span>
                            }
                            qty={l.qty}
                            amount={rupees(l.qty * l.dish.price)}
                          />
                        ))}
                        {o.note && (
                          <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-[13px]">
                            <span className="font-medium">Note for the restaurant:</span> <span className="text-muted-foreground">{o.note}</span>
                          </p>
                        )}
                      </ReviewCard>
                    );
                  })}
                  {shown.length === 0 && (
                    <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">
                      Nobody's order matches “{query.trim()}”.{' '}
                      <Button variant="link" className="h-auto p-0" onClick={() => setQuery('')}>Clear the search</Button>
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t pt-4 text-sm font-semibold">
                  <span>{q ? `${shown.length} of ${people.length} people` : `${people.length} people`}, {shown.reduce((n, o) => n + o.dishes, 0)} dishes</span>
                  <span className="num">{rupees(shown.reduce((n, o) => n + o.total, 0))}</span>
                </div>
                {(lunch.skipped.length > 0 || lunch.waiting.length > 0) && (
                  <ul className="mt-4 grid gap-1.5 text-[13px] text-muted-foreground">
                    {lunch.waiting.length > 0 && (
                      <li className="flex items-baseline gap-2"><StatusDot status="waiting" className="translate-y-[-1px]" /><span><span className="font-medium text-warn">Not picked yet:</span> {lunch.waiting.map((p) => firstName(p.id)).join(', ')}</span></li>
                    )}
                    {lunch.skipped.length > 0 && (
                      <li className="flex items-baseline gap-2"><StatusDot status="skipped" className="translate-y-[-1px]" /><span><span className="font-medium text-foreground">Skipping today:</span> {lunch.skipped.map((p) => firstName(p.id)).join(', ')}</span></li>
                    )}
                  </ul>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card className="lg:sticky lg:top-8 lg:col-span-4" aria-labelledby="sum-h">
          <CardHeader><CardTitle id="sum-h">So far</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between"><StatusBadge status="picked">Completed</StatusBadge><span className="font-semibold num">{completed} of {lunch.team}</span></div>
            <div className="flex items-center justify-between"><StatusBadge status="waiting" /><span className="font-semibold num">{lunch.waiting.length}</span></div>
            <div className="flex items-center justify-between"><StatusBadge status="skipped" /><span className="font-semibold num">{lunch.skipped.length}</span></div>
            {lunch.waiting.length > 0 && (
              <p className="flex gap-2 text-[13px] text-muted-foreground"><StatusDot status="waiting" className="mt-1.5" /><span>Still to pick: {lunch.waiting.map((p) => firstName(p.id)).join(', ')}</span></p>
            )}
            {open && host && (
              <>
                {lunch.waiting.length > 0 && <p className="text-[13px] text-warn">Locking now leaves out the people still to pick.</p>}
                <Button className="mt-1 w-full" disabled={!lunch.dishes} onClick={lockNow}><Icon name="lock" size={14} /> Lock picks now</Button>
                <p className="text-center text-[13px] text-muted-foreground">Or they lock by themselves at {session.cutoff}.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </StepPage>
  );
}
