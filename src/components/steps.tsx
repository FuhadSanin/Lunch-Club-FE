import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useLunch, useStore } from '@/store';
import { STEPS, canOpen, lunchSteps, type StepId, type StepState } from '@/lib/steps';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageTitle } from '@/components/PageTitle';
import { cn, spring } from '@/lib/cn';

// Where today's lunch is in its seven steps.
export function useLunchSteps() {
  const { state, live } = useStore();
  const lunch = useLunch();
  const active = live ? !!live.lunchId : !state.session.completed;
  return { ...lunchSteps(state.session, active, lunch.cart, lunch.picked.map((p) => p.id)), active };
}

// A step's marker: its number, a pulsing dot while it's the one to do, a check once done.
export function StepDot({ n, state, size = 22 }: { n: number; state: StepState; size?: number }) {
  return (
    <motion.span
      aria-hidden="true"
      initial={false}
      animate={{ scale: state === 'now' ? [1, 1.12, 1] : 1 }}
      transition={state === 'now' ? { duration: 1.8, repeat: Infinity } : spring}
      style={{ width: size, height: size }}
      className={cn(
        'relative grid flex-none place-items-center rounded-full text-[11px] font-semibold transition-colors duration-300 num',
        state === 'done' && 'bg-ok text-white',
        state === 'now' && 'bg-foreground text-background',
        state === 'todo' && 'bg-background text-muted-foreground shadow-[0_0_0_1.5px_var(--color-line-strong)]',
      )}
    >
      {state === 'done' ? <Icon name="check" size={Math.round(size * 0.55)} /> : n}
    </motion.span>
  );
}

// The seven steps in a column, with the current one opened up: what it means and its button.
export function StepTracker({ canRun }: { canRun: boolean }) {
  const { states, current, progress } = useLunchSteps();
  return (
    <ol className="grid" aria-label="Lunch steps">
      {STEPS.map((s, i) => {
        const st = states[s.id];
        const p = progress[s.id];
        const on = s.id === current;
        return (
          <li key={s.id} className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className="absolute top-[26px] bottom-1 left-[10px] w-0.5 overflow-hidden rounded-full bg-line">
                <motion.span className="block h-full w-full origin-top bg-ok" initial={false} animate={{ scaleY: st === 'done' ? 1 : 0 }} transition={{ duration: 0.5 }} />
              </span>
            )}
            <StepDot n={i + 1} state={st} />
            <div className={cn('min-w-0 pt-0.5', st === 'todo' && 'text-muted-foreground')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className={cn('text-sm', on ? 'font-semibold' : 'font-medium')}>
                  {s.label}
                  <span className="sr-only">{st === 'done' ? ' (done)' : st === 'now' ? ' (now)' : ' (to come)'}</span>
                </span>
                {p && p.of > 0 && st !== 'todo' && <span className="text-xs text-muted-foreground num">{p.done} of {p.of}</span>}
              </div>
              {on && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
                  <p className="text-[13px] text-muted-foreground">{s.hint}</p>
                  {canRun && (
                    <Button asChild size="sm" className="mt-2.5">
                      <a href={`#${s.route}`}>{s.id === 'start' ? 'Start a lunch' : `Go to ${s.label.toLowerCase()}`} <Icon name="arrow" size={13} /></a>
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// The frame of a step page: which step it is and what it's for, and a gentle stop when an earlier
// step isn't done yet.
export function StepPage({ id, title, sub, actions, children }: { id: StepId; title?: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { states, current } = useLunchSteps();
  const n = STEPS.findIndex((s) => s.id === id);
  const step = STEPS[n];
  const at = STEPS.findIndex((s) => s.id === current);
  const early = n > at;

  // Finishing this step moves on to the next one by itself, under the step's celebration, so the
  // host never has to look for where to go next.
  // The timer is only cancelled when the page closes, not by the re-renders the celebration causes.
  const was = useRef(states[id]);
  const advance = useRef(0);
  useEffect(() => {
    const before = was.current;
    was.current = states[id];
    if (before === 'now' && states[id] === 'done' && n < STEPS.length - 1) {
      advance.current = window.setTimeout(() => {
        window.location.hash = STEPS[n + 1].route;
      }, 900);
    }
  }, [states, id, n]);
  useEffect(() => () => window.clearTimeout(advance.current), []);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Lunch steps">
        {STEPS.map((s, i) => {
          const chip = (
            <>
              <StepDot n={i + 1} state={states[s.id]} size={18} />
              <span className="max-sm:hidden">{s.label}</span>
            </>
          );
          const cls = cn('flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs', s.id === id ? 'bg-muted font-semibold' : 'text-muted-foreground');
          // A step still to come isn't a link: the steps before it come first.
          return canOpen(s.id, current) ? (
            <a key={s.id} href={`#${s.route}`} className={cn(cls, 'transition-colors hover:bg-muted')}>{chip}</a>
          ) : (
            <span key={s.id} aria-disabled="true" title={`Finish "${STEPS[at].label}" first`} className={cn(cls, 'cursor-not-allowed opacity-60')}>{chip}</span>
          );
        })}
      </div>
      <PageTitle title={title ?? `${n + 1}. ${step.label}`} sub={sub ?? step.hint} actions={early ? undefined : actions} />
      {early ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <StepDot n={n + 1} state="todo" size={40} />
            <p className="max-w-sm text-sm text-muted-foreground">
              Not yet. This comes after <span className="font-medium text-foreground">{STEPS[at].label.toLowerCase()}</span>, the step the lunch is on now.
            </p>
            <Button asChild><a href={`#${STEPS[at].route}`}>Go to {STEPS[at].label.toLowerCase()}</a></Button>
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </>
  );
}

// The "you're done here" bar at the bottom of a step, pointing at the next one.
export function NextStep({ to, children }: { to: StepId; children?: ReactNode }) {
  const n = STEPS.findIndex((s) => s.id === to);
  const step = STEPS[n];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <Card className="mt-4 border-0 bg-ok-soft shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-ok text-white" aria-hidden="true"><Icon name="check" size={15} /></span>
          <p className="min-w-0 flex-1 text-sm">{children ?? 'This step is done.'}</p>
          <Button asChild className="max-sm:w-full">
            <a href={`#${step.route}`}>Next: {step.label} <Icon name="arrow" size={14} /></a>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
