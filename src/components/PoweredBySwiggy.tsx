import { useStore } from '@/store';
import { cn } from '@/lib/cn';

// Swiggy's attribution, shown wherever Swiggy content appears (Discover, Choose, Order, Track), as its brand
// guidelines ask: Swiggy's own logo, as supplied, with the exact words "Powered by Swiggy" at least 14 px, an
// 8 px gap, in a colour that reads on the page. The logo is never recoloured, faded or given effects, so it stays
// orange in dark mode too. Swiggy has to supply the artwork: swap public/illustrations/swiggy.webp for the file
// from Swiggy's brand-guidelines page (the square logo, at least 24 px) when you have it.
export function PoweredBySwiggy({ className }: { className?: string }) {
  // Shown where Swiggy content appears. A food party made only of the host's own local menus has none, so it
  // does not carry Swiggy's name.
  const { state, live } = useStore();
  const ids = state.session.restaurantIds;
  if (live && ids.length > 0 && ids.every((id) => id.startsWith('local-'))) return null;
  return (
    <span className={cn('inline-flex items-center gap-2 text-base leading-none font-medium text-foreground', className)}>
      <img src="/illustrations/swiggy.webp" alt="" width={82} height={24} className="h-6 w-auto flex-none select-none" />
      Powered by Swiggy
    </span>
  );
}
