import { PoweredBySwiggy } from '@/components/PoweredBySwiggy';
// A full-width strip along the bottom of the first screen, like a row of customer logos: hairlines above
// and below, the two ways to order centred with a hairline between them. It stands still.

// Swiggy's logo as supplied, with its attribution; never recoloured (see PoweredBySwiggy).
function Swiggy() {
  return <PoweredBySwiggy />;
}

// The built-in menu, set as a wordmark to stand beside Swiggy's: a solid mark (a food cloche, in the page's ink
// like Swiggy's flattened pin) and the name in small tracked capitals, "LOCAL" bold and "MENU" lighter.
function LocalMenu() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden="true" className="grid size-5 place-items-center rounded-[6px] bg-ink text-on-ink">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
          {/* A food cloche: the dome, the tray under it, and the knob on top. */}
          <path d="M2.3 8.3a3.7 3.7 0 0 1 7.4 0" />
          <path d="M1.7 9.7h8.6" />
          <circle cx="6" cy="3.5" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {/* Tracked capitals leave space after the last letter; the negative margin takes it back so the row stays centred. */}
      <span className="-mr-[0.22em] text-[12px] leading-none tracking-[0.22em] uppercase">
        <span className="font-bold">Local</span> <span className="font-medium opacity-60">Menu</span>
      </span>
    </span>
  );
}

export function PlatformStrip() {
  return (
    <div role="group" aria-label="Order from Swiggy or from the local menu" className="col-span-12 mt-12 border-y border-line md:absolute md:inset-x-0 md:bottom-0 md:mt-0">
      <ul className="mx-auto flex max-w-[1200px] items-center justify-center gap-8 px-5 py-4 sm:gap-14 sm:px-8">
        <li><Swiggy /></li>
        <li aria-hidden="true" className="h-5 w-px bg-border" />
        <li><LocalMenu /></li>
      </ul>
    </div>
  );
}
