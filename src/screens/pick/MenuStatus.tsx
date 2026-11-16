import type { Load } from '@/data/swiggy';
import { Button } from '@/components/ui/button';

// While a live menu loads: placeholder rows if there's nothing to show yet. If it fails: the reason
// and a retry, above the saved dishes when there are some.
export function MenuStatus({ load, empty }: { load: Load; empty: boolean }) {
  if (load.status === 'loading' && empty) {
    return (
      <ul className="mt-6 grid gap-3" aria-busy="true" aria-label="Loading the menu">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 py-1">
            <span className="size-12 animate-pulse rounded-xl bg-muted" />
            <span className="grid gap-2">
              <span className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
              <span className="h-3 w-1/5 animate-pulse rounded bg-muted" />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (load.status === 'error') {
    return (
      <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-4 text-sm">
        <span className="text-muted-foreground">
          {empty ? "This menu didn't load. " : "Showing saved dishes; the live menu didn't load. "}
          {load.error}
        </span>
        <Button size="sm" variant="outline" onClick={load.retry}>Try again</Button>
      </div>
    );
  }
  if (load.status === 'ready' && empty) {
    return <p className="mt-6 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">Swiggy shows no dishes here right now. The restaurant may be closed.</p>;
  }
  return null;
}
