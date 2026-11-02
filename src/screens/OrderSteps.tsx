import { motion } from 'motion/react';
import { useStore } from '../store';
import { Icon } from '../ui';
import { cn, spring } from '../lib/cn';

const STAGES = [
  { key: 'open', label: 'Everyone picks' },
  { key: 'locked', label: 'Picks lock at the cutoff' },
  { key: 'confirm', label: 'Host confirms the cart' },
  { key: 'placed', label: 'Order bot places one Swiggy order' },
  { key: 'delivered', label: 'Food arrives and is handed out' },
] as const;

const ORDER = ['open', 'locked', 'placing', 'placed', 'delivered'];

export default function OrderSteps() {
  const { state } = useStore();
  const { session } = state;
  const at = ORDER.indexOf(session.status); // 0..4
  // stage index reached: open→0, locked→1 (awaiting confirm = 2 now), placing→3 now, placed→3 done, delivered→4
  const reached = [0, 2, 3, 4, 5][at];
  return (
    <ol className="grid" aria-live="polite">
      {STAGES.map((s, i) => {
        const cls = i < reached ? 'done' : i === reached ? 'now' : 'todo';
        const time =
          s.key === 'open' ? session.cutoff && `until ${session.cutoff}` :
          s.key === 'placed' && session.orderRef ? session.bot.at(-1)?.at : '';
        return (
          <li key={s.key} className={cn('relative grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-2.5 py-2 text-sm', cls === 'todo' && 'text-mute')}>
            {i < STAGES.length - 1 && (
              <span aria-hidden="true" className="absolute top-[26px] bottom-[-6px] left-[10px] w-0.5 overflow-hidden rounded-full bg-line">
                <motion.span className="block h-full w-full origin-top bg-ink" initial={false} animate={{ scaleY: cls === 'done' ? 1 : 0 }} transition={{ duration: 0.5 }} />
              </span>
            )}
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scale: cls === 'now' ? [1, 1.15, 1] : 1 }}
              transition={cls === 'now' ? { duration: 1.6, repeat: Infinity } : spring}
              className={cn(
                'relative mt-0.5 grid size-[22px] place-items-center rounded-full transition-colors duration-300',
                cls === 'done' && 'bg-ink text-on-ink',
                cls === 'now' && 'bg-canvas shadow-[0_0_0_2px_var(--color-ink)]',
                cls === 'todo' && 'bg-canvas shadow-[0_0_0_1.5px_var(--color-line-strong)]',
              )}
            >
              {cls === 'done' && <Icon name="check" size={12} />}
              {cls === 'now' && <span className="size-2 rounded-full bg-ink" />}
            </motion.span>
            <span className="pt-0.5">
              {s.label}
              {s.key === 'placed' && session.orderRef ? <>, <span className="font-mono text-[13px]">{session.orderRef}</span></> : ''}
              <span className="sr-only">{cls === 'done' ? ' (done)' : cls === 'now' ? ' (now)' : ' (to come)'}</span>
            </span>
            <time className="pt-0.5 text-[13px] text-mute num">{time}</time>
          </li>
        );
      })}
    </ol>
  );
}
