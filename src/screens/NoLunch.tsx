import { useLunches } from '@/api/queries';
import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageTitle } from '@/components/PageTitle';
import { lunchDay } from './ExistingLunches';

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Today's screens when no lunch is running: the host starts the next one, everyone else waits for it.
export function NoLunch({ canHost }: { canHost: boolean }) {
  const { live } = useStore();
  const lunches = useLunches(!!live);
  const last = lunches.data?.find((l) => l.status === 'delivered' || l.status === 'cancelled');
  const lastLine = last
    ? `The last lunch, for ${lunchDay(last.cutoff_at).toLowerCase()} at ${hhmm(last.cutoff_at)}, ${last.status === 'delivered' ? 'has arrived' : 'was called off'}.`
    : null;

  return (
    <>
      <PageTitle
        title="No lunch running"
        sub={canHost ? 'Start a new lunch and the team can pick from any restaurant near the office.' : 'When the host starts the next lunch, it shows up here and you can pick.'}
      />
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
          <img src="/illustrations/tiffin.png" alt="" width={120} height={150} className="h-auto w-24 select-none dark:invert" />
          <div className="grid gap-1.5">
            <p className="max-w-sm text-sm text-muted-foreground">
              {canHost
                ? 'Pick the restaurants, a cutoff and the delivery address. Everyone gets the link and picks their own dish.'
                : 'Nothing to pick yet. This page refreshes on its own.'}
            </p>
            {lastLine && <p className="text-[13px] text-muted-foreground">{lastLine}</p>}
          </div>
          {canHost && (
            <Button asChild size="lg">
              <a href="#/new">Start a new lunch</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
