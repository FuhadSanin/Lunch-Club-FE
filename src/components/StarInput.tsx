import { useRef } from 'react';
import { STAR } from '@/ui';
import { cn } from '@/lib/cn';

// Pick a rating by pressing the stars: the left half of a star is a half point (3.5), the right half is a whole one.
// Pressing the same value again takes the rating off. With the keyboard: left and right arrows move by half a point,
// Home and End jump to 0.5 and 5, Backspace or Delete clears it.
export function StarInput({ value, onChange, id, label, invalid, size = 22, className }: {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  label: string;
  invalid?: boolean;
  size?: number;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const score = value ?? 0;
  const set = (v: number) => onChange(v === value ? null : Math.max(0.5, Math.min(5, v)));

  const press = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    set(e.clientX - r.left < r.width / 2 ? i + 0.5 : i + 1);
  };
  const key = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.5 : 0;
    if (step) { e.preventDefault(); const next = score + step; onChange(next <= 0 ? null : Math.min(5, next)); }
    else if (e.key === 'Home') { e.preventDefault(); onChange(0.5); }
    else if (e.key === 'End') { e.preventDefault(); onChange(5); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); onChange(null); }
  };

  return (
    <div
      ref={box}
      id={id}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={score}
      aria-valuetext={value === null ? 'Not rated' : `${score} out of 5`}
      aria-invalid={invalid || undefined}
      onKeyDown={key}
      className={cn('flex h-12 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-line-strong focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 aria-invalid:border-destructive dark:bg-input/30', className)}
    >
      <span className="inline-flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, score - i));
          return (
            <button key={i} type="button" tabIndex={-1} aria-hidden="true" onClick={(e) => press(e, i)} className="relative inline-block cursor-pointer" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox="0 0 20 20" className="absolute inset-0 fill-[#d9d9d9] dark:fill-[#444]"><path d={STAR} /></svg>
              {fill > 0 && (
                <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <svg width={size} height={size} viewBox="0 0 20 20" className="fill-[#f5a623]"><path d={STAR} /></svg>
                </span>
              )}
            </button>
          );
        })}
      </span>
      <span aria-hidden="true" className={cn('min-w-[1.6em] text-[13px] font-semibold num', value === null && 'font-normal text-muted-foreground')}>{value === null ? 'Rate' : score.toFixed(1)}</span>
    </div>
  );
}
