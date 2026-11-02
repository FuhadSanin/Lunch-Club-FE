import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { cn, spring } from '@/lib/cn';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

type Option<T extends string> = { value: T; label: ReactNode };

// The selected item's background slides between options, like the iOS segmented control.
const Pill = ({ id }: { id: string }) => (
  <motion.span layoutId={`pill-${id}`} transition={spring} className="absolute inset-0 rounded-full bg-raised shadow-card dark:shadow-none" />
);

const item =
  'relative h-8 rounded-full px-3.5 text-[13px] font-normal text-muted-foreground focus-visible:ring-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand hover:bg-transparent hover:text-foreground aria-pressed:bg-transparent data-[state=on]:bg-transparent data-[state=on]:font-medium data-[state=on]:text-foreground';

// A single-choice pill group built on shadcn's ToggleGroup: filters, the demo role switch.
export function Segmented<T extends string>({
  options, value, onChange, label, className, fill,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  fill?: boolean; // equal-width items that fill the row
}) {
  const id = useId();
  return (
    <ToggleGroup
      type="single"
      spacing={0.5}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn('no-scrollbar max-w-full overflow-x-auto rounded-full bg-muted p-[3px]', className)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className={cn(item, fill ? 'flex-1' : 'flex-none')}>
          {o.value === value && <Pill id={id} />}
          <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// The same look as a shadcn TabsList, for tabs that switch a panel (restaurant menus).
// Use inside <Tabs value={...} onValueChange={...}> with matching <TabsContent>.
export function PillTabsList<T extends string>({ options, value, label, className }: {
  options: Option<T>[];
  value: T;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <TabsList
      aria-label={label}
      className={cn('no-scrollbar h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full bg-muted p-1 group-data-horizontal/tabs:h-auto', className)}
    >
      {options.map((o) => (
        <TabsTrigger
          key={o.value}
          value={o.value}
          className="relative h-9 flex-none rounded-full border-0 px-4 text-[13px] font-normal focus-visible:ring-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand text-muted-foreground data-active:bg-transparent data-active:font-medium data-active:text-foreground data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent"
        >
          {o.value === value && <Pill id={id} />}
          <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
