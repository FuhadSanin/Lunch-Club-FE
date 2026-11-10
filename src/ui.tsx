import { useEffect, useState, type CSSProperties } from 'react';
import { personById, type Person } from './data/demo';
import { cn } from './lib/cn';
import { Avatar as UiAvatar, AvatarFallback } from './components/ui/avatar';

export const rupees = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const firstName = (id: string) => personById(id)?.name.split(' ')[0] ?? 'Someone';

// A person's initials on shadcn's Avatar, tinted with their own hue (see .avatar-tint).
export function Avatar({ person, size = 'md', className }: { person: Person; size?: 'sm' | 'md'; className?: string }) {
  return (
    <UiAvatar aria-hidden="true" className={cn(size === 'sm' ? 'size-7' : 'size-9', 'after:hidden', className)}>
      <AvatarFallback
        className={cn('avatar-tint font-semibold', size === 'sm' ? 'text-[11px]' : 'text-[13px]')}
        style={{ '--h': person.hue } as CSSProperties}
      >
        {initials(person.name)}
      </AvatarFallback>
    </UiAvatar>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      role="img"
      aria-label={veg ? 'Veg' : 'Non-veg'}
      className={cn('inline-grid size-3.5 flex-none place-items-center rounded-[3px] border-[1.5px] align-[-2px]', veg ? 'border-veg' : 'border-nonveg')}
    >
      {veg ? (
        <span className="size-1.5 rounded-full bg-veg" />
      ) : (
        <span className="h-0 w-0 border-x-4 border-b-[7px] border-x-transparent border-b-nonveg" />
      )}
    </span>
  );
}

// One placeholder photo stands in for every dish and restaurant until menus carry real photos.
export const PLACEHOLDER_PHOTO = '/photos/dish.jpg';

export function FoodPhoto({ src, size = 40, cover, className }: { src?: string; size?: number; cover?: boolean; className?: string }) {
  return (
    <img
      src={src || PLACEHOLDER_PHOTO}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={cover ? undefined : { width: size, height: size }}
      className={cn('flex-none rounded-lg bg-soft-2 object-cover ring-1 ring-ink/10', className)}
    />
  );
}

// The product's mark: the tiffin carrier from the illustrations (scripts/art/tiffin.mjs), simplified
// to read at 20px. Ink in the current theme, with canvas-coloured seams, and the order ticket.
export function Mark({ size = 28, inverse }: { size?: number; inverse?: boolean }) {
  const ink = inverse ? 'fill-canvas' : 'fill-ink';
  const cut = inverse ? 'stroke-ink' : 'stroke-canvas';
  return (
    <svg width={(size * 36) / 40} height={size} viewBox="0 0 36 40" aria-hidden="true" className="flex-none">
      <g className={ink}>
        <rect x="1.5" y="1.5" width="27" height="5" rx="2.5" />
        <ellipse cx="15" cy="4" rx="4.2" ry="3.4" />
        <path d="M2.5 6h3.4v29.5l2 2.3V39H4l-1.5-2z" />
        <path d="M27.5 6h-3.4v29.5l-2 2.3V39H26l1.5-2z" />
        <path d="M10.4 14.2c0-4.4 9.2-4.4 9.2 0z" />
        <ellipse cx="15" cy="10.3" rx="2.4" ry="1" />
        <ellipse cx="15" cy="14.6" rx="8.6" ry="1.6" />
        <path d="M7.3 15.4h15.4c.9 6.2.9 14.6-.4 19.6-1.4 3.6-13.2 3.6-14.6 0-1.3-5-1.3-13.4-.4-19.6z" />
      </g>
      <g className={cut} fill="none" strokeWidth="1.1" strokeLinecap="round">
        <path d="M7.6 21.2q7.4 1.2 14.8 0M7.4 27q7.6 1.2 15.2 0M7.8 32.8q7.2 1.2 14.4 0" />
        <path d="M9.9 17.2v2.4M9.8 23v2.4M9.9 28.8v2.4" opacity="0.7" />
      </g>
      <path d="M28 7.5c2.4 1 3.6 2.6 3.7 4.6" fill="none" className={inverse ? 'stroke-canvas' : 'stroke-ink'} strokeWidth="0.9" />
      <rect x="29.4" y="12.2" width="5.4" height="7.6" rx="0.8" transform="rotate(-4 32 16)" className={inverse ? 'fill-ink stroke-canvas' : 'fill-canvas stroke-ink'} strokeWidth="1" />
      <path d="M30.8 15.4h2.6M30.9 17.4h2.2" className={inverse ? 'stroke-canvas' : 'stroke-ink'} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

export function useHashRoute(): [string, (to: string) => void] {
  const get = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => {
      // In-page anchors on the landing page (#how, #cart) are not routes.
      if (window.location.hash && !window.location.hash.startsWith('#/')) return;
      setRoute(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (to: string) => (window.location.hash = to)];
}

const paths: Record<string, string> = {
  today: 'M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z',
  pick: 'M4 3v6a3 3 0 0 0 3 3v6M7 3v5M10 3v6a3 3 0 0 1-3 3M15 3c-1.7 0-3 2-3 5s1.3 4 3 4v6M15 3v15',
  order: 'M3 4h2l2 9h9l2-6H6.5M8 17.5a1 1 0 1 0 0 .01M15 17.5a1 1 0 1 0 0 .01',
  new: 'M10 4v12M4 10h12',
  settings: 'M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  menu: 'M3 7h14M3 13h14',
  close: 'M5 5l10 10M15 5 5 15',
  search: 'M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zM13.5 13.5 17 17',
  arrow: 'M4 10h12M11 5l5 5-5 5',
  check: 'M4 10.5 8 14.5 16 6',
  sun: 'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1',
  moon: 'M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5z',
  lock: 'M6 9V6.5a4 4 0 0 1 8 0V9M5 9h10v8H5z',
  clock: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2',
  out: 'M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M12 6l4 4-4 4M16 10H8',
};

export function Icon({ name, size = 16, className }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('flex-none', className)}>
      <path d={paths[name]} />
    </svg>
  );
}

export function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}

// A gently pulsing dot for things that are live right now.
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)} aria-hidden="true">
      <span className="absolute inset-0 animate-pulse-dot rounded-full bg-ok" />
    </span>
  );
}

// A restaurant's Swiggy rating as five golden stars, each filled as far as the score reaches
// (4.3: four full and a third), then the number.
const STAR = 'M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z';
export function Rating({ value, size = 14, className }: { value?: number; size?: number; className?: string }) {
  if (!value) return null;
  const score = Math.max(0, Math.min(5, value));
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold text-foreground num', className)} role="img" aria-label={`Rated ${score.toFixed(1)} out of 5`}>
      <span className="inline-flex gap-px" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, score - i));
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox="0 0 20 20" className="absolute inset-0 fill-[#e3e3e3] dark:fill-[#3a3a3a]"><path d={STAR} /></svg>
              {fill > 0 && (
                <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <svg width={size} height={size} viewBox="0 0 20 20" className="fill-[#f5a623]"><path d={STAR} /></svg>
                </span>
              )}
            </span>
          );
        })}
      </span>
      {score.toFixed(1)}
    </span>
  );
}
