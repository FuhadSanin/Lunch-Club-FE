import { CheckIcon, CopyIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useBotStatus } from '@/api/queries';
import type { ApiBotCheck } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Command copied', { description: 'Paste it into Terminal.' });
  } catch {
    toast.error("Couldn't copy", { description: 'Select the command and copy it by hand.' });
  }
}

function Command({ command }: { command: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-2 rounded-md bg-background/60 p-2">
      <code className="min-w-0 flex-1 break-all font-mono text-xs">{command}</code>
      <Button type="button" size="sm" variant="ghost" className="h-7 flex-none px-2" onClick={() => copy(command)} aria-label="Copy command">
        <CopyIcon className="size-3.5" />
      </Button>
    </div>
  );
}

function CheckRow({ check }: { check: ApiBotCheck }) {
  return (
    <li className="flex gap-2.5 text-sm">
      {check.ok ? (
        <CheckIcon className="mt-0.5 size-4 flex-none text-ok" aria-label="OK" />
      ) : (
        <XIcon className="mt-0.5 size-4 flex-none text-destructive" aria-label="Not ready" />
      )}
      <div className="min-w-0 flex-1">
        <div className={check.ok ? 'font-medium' : 'font-medium text-destructive'}>{check.label}</div>
        <div className="text-xs text-muted-foreground">Why: {check.why}</div>
        <div className={`text-[13px] ${check.ok ? 'text-ok' : 'text-destructive'}`}>{check.detail}</div>
        {check.fix && (
          <>
            <div className="mt-1 text-xs text-muted-foreground">Fix:</div>
            <Command command={check.fix} />
          </>
        )}
      </div>
    </li>
  );
}

// Everything a host needs to get the order bot running: live checks (is Chrome listening on the debug
// port? is Playwright installed?), the command that fixes each failure, and the debugging commands.
// Hosts only: the API refuses everyone else, and then nothing shows.
export function BotSetup() {
  const status = useBotStatus();
  if (!status.data) return null;
  const { ready, checks, commands } = status.data;
  return (
    <section aria-label="Order bot setup" className="mb-4 rounded-xl p-3 shadow-ring">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Order bot setup</div>
        <div className="flex items-center gap-2">
          <Badge variant={ready ? 'success' : 'warning'}>{ready ? 'Ready' : 'Not ready'}</Badge>
          <Button type="button" size="sm" variant="outline" className="h-8" disabled={status.isFetching} onClick={() => status.refetch()}>
            <RefreshCwIcon className={`size-3.5 ${status.isFetching ? 'animate-spin' : ''}`} />
            Check again
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Checked every few seconds, so a step turns green as soon as you finish it.</p>
      <ul className="mt-3 grid gap-3">
        {checks.map((c) => <CheckRow key={c.key} check={c} />)}
      </ul>
      <details className="mt-3 text-sm" open={!ready}>
        <summary className="cursor-pointer font-medium">Commands and debugging</summary>
        <ol className="mt-2 grid gap-3">
          {commands.map((c) => (
            <li key={c.title}>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">Why: {c.why}</div>
              <Command command={c.command} />
              {c.note && <div className="mt-1 text-xs text-muted-foreground">{c.note}</div>}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
