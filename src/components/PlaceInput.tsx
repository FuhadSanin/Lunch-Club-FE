import { useEffect, useId, useRef, useState } from 'react';
import { fetchPlace, usePlaceSuggestions } from '@/api/queries';
import type { ApiPlace } from '@/api/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui';

// A text box that suggests real places while you type (two letters or more), nearest to `near` first.
// Choosing one looks up its coordinates, so restaurants can be offered near it.
export function PlaceInput({
  id,
  value,
  onChange,
  onPlace,
  placeholder = 'Search a place, building or area…',
  near,
  className,
}: {
  id?: string;
  value: string;
  onChange: (text: string) => void;
  onPlace: (place: ApiPlace) => void;
  placeholder?: string;
  near?: { lat: number; lng: number };
  className?: string;
}) {
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ask only once typing pauses.
  const [settled, setSettled] = useState(value.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);
  // Once a place is chosen the box holds its full address; that is not a new search.
  const [chosen, setChosen] = useState('');
  const typed = value.trim();
  const asking = settled.length >= 2 && settled !== chosen && settled === typed;
  const suggestions = usePlaceSuggestions(asking ? settled : '', near);
  // Searching: typing hasn't paused yet, or the answer for exactly this text is still on its way.
  // Until it lands the box shows a spinner and no list, so old results never flash up.
  const waiting = typed.length >= 2 && typed !== chosen && (typed !== settled || suggestions.isFetching || suggestions.isPlaceholderData);
  const ready = asking && !waiting && !suggestions.isError;
  const list = open && ready ? (suggestions.data ?? []) : [];
  const busy = waiting || loading;
  const picked = !!chosen && typed === chosen;
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const choose = async (index: number) => {
    const s = list[index];
    if (!s) return;
    setOpen(false);
    setLoading(true);
    setError('');
    try {
      // Suggestions carry their coordinates; only an older API makes a second call for them.
      const place: ApiPlace =
        s.lat !== undefined && s.lng !== undefined
          ? { place_id: s.place_id, address: s.description, lat: s.lat, lng: s.lng }
          : await fetchPlace(s.place_id);
      setChosen(place.address || s.description);
      onChange(place.address || s.description);
      onPlace({ ...place, address: place.address || s.description });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't look that place up.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (list.length ? (a + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length : -1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      void choose(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={box} className={cn('relative', className)}>
      <Icon name="pin" size={16} className={cn('pointer-events-none absolute top-1/2 left-3 -translate-y-1/2', picked ? 'text-foreground' : 'text-muted-foreground')} />
      <Input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-busy={busy || undefined}
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); setError(''); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 pr-10 pl-9"
      />
      <span className="absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center">
        {busy ? (
          <span role="status" aria-label="Searching places" className="size-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground" />
        ) : picked ? (
          <span className="grid size-5 place-items-center rounded-full bg-[#12a150] text-white" aria-label="Place chosen"><Icon name="check" size={12} /></span>
        ) : typed ? (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => { onChange(''); setChosen(''); setOpen(true); input.current?.focus(); }}
            className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </span>
      {open && list.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-72 animate-in overflow-auto rounded-xl bg-popover p-1 shadow-float ring-1 ring-foreground/10 fade-in-0 zoom-in-95">
          {list.map((s, i) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); void choose(i); }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2', i === active && 'bg-muted')}
            >
              <Icon name="pin" size={15} className="mt-0.5 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{s.main_text || s.description}</span>
                {s.secondary_text && <span className="block truncate text-[13px] text-muted-foreground">{s.secondary_text}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && !picked && !busy && list.length === 0 && (() => {
        // A nudge before typing, and a clear answer when nothing matched; while searching, the spinner says it.
        const note = !typed ? 'Type an area, building or landmark, like Infopark or Kakkanad.'
          : typed.length < 2 ? 'Keep typing…'
          : ready && suggestions.data?.length === 0 ? 'No places found. Try a landmark or area name.' : '';
        return note ? <p className="absolute inset-x-0 top-full z-50 mt-1.5 animate-in rounded-xl bg-popover p-3 text-[13px] text-muted-foreground shadow-float ring-1 ring-foreground/10 fade-in-0">{note}</p> : null;
      })()}
      {(error || suggestions.isError) && <p role="alert" className="mt-1.5 text-[13px] text-destructive">{error || "Couldn't search places right now."}</p>}
    </div>
  );
}
