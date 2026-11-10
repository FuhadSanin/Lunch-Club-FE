import { motion, useReducedMotion } from 'motion/react';
import type { Person } from '@/data/demo';
import { Avatar, rupees } from '@/ui';
import { cn, spring } from '@/lib/cn';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// When the shackle hits home, for lining a sound up with it (seconds after the scene mounts).
export const SHACKLE_SHUT = 0.49;

export type LockCounts = { cutoff: string; people: number; dishes: number; waiting: number };

// The moment picks lock: the padlock's shackle drops shut, the cutoff is stamped across it at a
// tilt, then the counts. From "How lunch runs" on the landing page; Pick my lunch shows it too.
export function LockStamp({ cutoff, people, dishes, waiting, large }: LockCounts & { large?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid justify-items-center gap-3 text-center">
      <svg width={large ? 76 : 64} height={large ? 86 : 72} viewBox="0 0 64 72" aria-hidden="true" className="text-foreground">
        <motion.path
          d="M18 34 V22 a14 14 0 0 1 28 0 V34"
          fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          initial={reduce ? false : { y: -12 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 900, damping: 20, delay: 0.45 }}
        />
        <rect x="8" y="32" width="48" height="36" rx="9" className="fill-primary" />
        <motion.circle cx="32" cy="50" r="5" className="fill-primary-foreground" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.75 }} />
      </svg>
      <motion.div initial={reduce ? false : { scale: 1.8, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ ...spring, delay: 0.9 }}>
        <span className={cn('inline-block rounded-lg border-2 border-foreground bg-background font-semibold', large ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm')}>
          Picks locked at {cutoff}
        </span>
      </motion.div>
      <motion.p
        className="rounded-full bg-background/80 px-3 text-[13px] text-muted-foreground num"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {plural(people, 'person', 'people')} · {plural(dishes, 'dish', 'dishes')} · {waiting} did not answer
      </motion.p>
    </div>
  );
}

// The stamp over the latest picks, which fade back as the lock comes down.
export function LockScene({ rows, className, ...counts }: LockCounts & { rows: { person: Person; amount: number }[]; large?: boolean; className?: string }) {
  return (
    <div className={cn('relative min-h-[260px]', className)}>
      <motion.ul className="grid gap-2" initial={{ opacity: 1 }} animate={{ opacity: 0.25 }} transition={{ delay: 0.7, duration: 0.6 }}>
        {rows.slice(0, 3).map(({ person, amount }) => (
          <li key={person.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
            <Avatar person={person} size="sm" />
            <span className="flex-1 truncate text-left">{person.name.split(' ')[0]}</span>
            <span className="num">{rupees(amount)}</span>
          </li>
        ))}
      </motion.ul>
      <div className="absolute inset-0 grid place-items-center p-5">
        <LockStamp {...counts} />
      </div>
    </div>
  );
}
