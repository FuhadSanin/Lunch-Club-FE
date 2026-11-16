import { toast } from 'sonner';
import { useLunches, useSetJoining } from '@/api/queries';
import { useStore } from '@/store';
import { Switch } from '@/components/ui/switch';

// For the host of a running lunch: let new people join with the link, or close it. Anyone already in
// the lunch stays and can keep picking. Nothing shows for guests, in the demo, or once picks lock.
export function JoiningSwitch() {
  const { live, state, meId } = useStore();
  const lunches = useLunches(!!live);
  const setJoining = useSetJoining();
  const id = live?.lunchId;
  if (!live || !id || state.session.hostId !== meId || state.session.status !== 'open') return null;
  const open = lunches.data?.find((l) => l.id === id)?.joining_open !== false;

  const change = (next: boolean) =>
    setJoining.mutate(
      { id, open: next },
      {
        onSuccess: () =>
          next
            ? toast.success('Joining is open', { description: 'Anyone with the link can join again.' })
            : toast.success('Joining is closed', { description: 'New people can no longer join with the link.' }),
        onError: (e) => toast.error("Couldn't change that", { description: e.message }),
      },
    );

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 p-3">
      <div className="grid gap-0.5">
        <label htmlFor="joining-switch" className="text-sm font-medium">
          {open ? 'Anyone with the link can join' : 'Joining is closed'}
        </label>
        <p className="text-[13px] text-muted-foreground">
          {open ? 'Turn off to stop new people joining. People already in can keep picking.' : 'The link no longer lets new people in. People already in can keep picking.'}
        </p>
      </div>
      <Switch id="joining-switch" checked={open} disabled={setJoining.isPending} onCheckedChange={change} aria-label="Let new people join with the link" />
    </div>
  );
}
