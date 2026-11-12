import { useEffect, useId, useRef, useState } from 'react';
import { fetchPlace, usePlaceSuggestions } from '@/api/queries';
import type { ApiPlace } from '@/api/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

// A text box that suggests real places while you type (three letters or more). Choosing one looks up its
// coordinates, so restaurants can be offered near it.
export function PlaceInput({
  id,
  value,
  onChange,
  onPlace,
  placeholder = 'Search a place, building or area…',
  className,
}: {
  id?: string;
  value: string;
  onChange: (text: string) => void;
  onPlace: (place: ApiPlace) => void;
  placeholder?: string;
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
    const timer = window.setTimeout(() => setSettled(value.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [value]);
  const suggestions = usePlaceSuggestions(settled);
  const list = open && settled.length >= 3 ? (suggestions.data ?? []) : [];

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
      const place = await fetchPlace(s.place_id);
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
      <Input
        id={id}
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); setError(''); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10"
      />
      {loading && <span className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-input border-t-foreground" aria-hidden="true" />}
      {open && list.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-72 overflow-auto rounded-xl bg-popover p-1 shadow-float ring-1 ring-foreground/10">
          {list.map((s, i) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); void choose(i); }}
              onMouseEnter={() => setActive(i)}
              className={cn('cursor-pointer rounded-lg px-3 py-2', i === active && 'bg-muted')}
            >
              <span className="block truncate text-sm font-medium">{s.main_text || s.description}</span>
              {s.secondary_text && <span className="block truncate text-[13px] text-muted-foreground">{s.secondary_text}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && settled.length >= 3 && !suggestions.isFetching && suggestions.data?.length === 0 && (
        <p className="absolute inset-x-0 top-full z-50 mt-1.5 rounded-xl bg-popover p-3 text-[13px] text-muted-foreground shadow-float ring-1 ring-foreground/10">No places found. Try a landmark or area name.</p>
      )}
      {(error || suggestions.isError) && <p role="alert" className="mt-1.5 text-[13px] text-destructive">{error || "Couldn't search places right now."}</p>}
    </div>
  );
}
