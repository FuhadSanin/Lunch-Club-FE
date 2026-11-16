import { useState } from 'react';
import { useLunch, useStore } from '@/store';
import { usePending } from '@/lib/use-pending';
import { Icon, rupees } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StepPage } from '@/components/steps';
import { originOf, useCelebrate } from '@/components/celebrate';

// The last step: everything is handed out, so the host closes the lunch and the next one can start,
// with a cheerful send-off.
const CHEERS = ['Enjoy your meal!', 'Have fun!', 'Bon appétit!', 'Dig in!', 'Food is served!', 'Happy eating!'];
export default function Finish() {
  const { state, dispatch } = useStore();
  const lunch = useLunch();
  const celebrate = useCelebrate();
  const { pending, run } = usePending();
  const [confirming, setConfirming] = useState(false);
  const { session } = state;

  const finish = (e: React.MouseEvent<HTMLButtonElement>) => {
    const from = originOf(e);
    setConfirming(false);
    const line = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    run('finish', () => dispatch({ type: 'finishLunch' })).then(() => {
      celebrate({ ...from, title: line, sub: `${lunch.picked.length} people fed from ${lunch.cart.length} restaurants. The next food party can start whenever you're hungry again.`, tone: 'coral', icon: 'cutlery', sound: 'cheer' });
      window.location.hash = '/';
    }, () => undefined);
  };

  const facts = [
    { label: 'People fed', value: lunch.picked.length },
    { label: 'Dishes', value: lunch.dishes },
    { label: 'Restaurants', value: lunch.cart.length },
    { label: 'Items total', value: rupees(lunch.total) },
  ];

  return (
    <StepPage id="finish">
      <Card>
        <CardContent className="grid justify-items-center gap-5 py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-ok-soft text-ok" aria-hidden="true"><Icon name="check" size={28} /></span>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Everyone has their food. Enjoy!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.orderRef ? <>Swiggy {session.orderRef}. </> : null}Completing closes this food party for everyone.
            </p>
          </div>
          <dl className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-xl bg-muted/60 px-3 py-3">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="mt-1 text-lg font-semibold num">{f.value}</dd>
              </div>
            ))}
          </dl>
          <Button size="lg" disabled={pending('finish')} onClick={() => setConfirming(true)}>{pending('finish') ? 'Completing…' : 'Complete and enjoy your meal'}</Button>
        </CardContent>
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete today's food party?</DialogTitle>
            <DialogDescription>It moves to the food party history, and the next food party can start.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Not yet</Button>
            <Button onClick={finish}>Complete the food party</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepPage>
  );
}
