import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { EXAMPLES, type Example } from './what-to-say';

// One line of the conversation: what you said (dark, on the right) or what the assistant answers (on the left).
function Bubble({ who, children }: { who: 'you' | 'assistant'; children: string }) {
  const you = who === 'you';
  return (
    <div className={you ? 'ml-auto grid max-w-[88%] justify-items-end gap-1' : 'grid max-w-[88%] justify-items-start gap-1'}>
      <span className="px-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{you ? 'You say' : 'Assistant'}</span>
      <p className={you ? 'rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14px] leading-6 text-on-ink' : 'rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-[14px] leading-6'}>{children}</p>
    </div>
  );
}

// The light and the dark picture of one screen: the page's own look decides which one shows.
function Pictures({ example, className, eager }: { example: Example; className?: string; eager?: boolean }) {
  const loading = eager ? 'eager' : 'lazy';
  const { id, alt, size } = example;
  return (
    <>
      <img src={`/connect/${id}-light.webp`} alt={alt} width={size.w} height={size.h} loading={loading} decoding="async" className={cn('block h-auto dark:hidden', className)} />
      <img src={`/connect/${id}-dark.webp`} alt={alt} width={size.w} height={size.h} loading={loading} decoding="async" className={cn('hidden h-auto dark:block', className)} />
    </>
  );
}

// The screen of the app that changes. Press it to see it larger: on a phone it is bigger than the screen, so it scrolls.
function Screen({ example }: { example: Example }) {
  return (
    <figure className="grid gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`Enlarge the picture: ${example.seen}`}
            className="block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-background shadow-xs outline-none transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Pictures example={example} className="w-full" />
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[92dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-2 pt-11 sm:max-w-[min(96vw,1060px)]">
          <DialogTitle className="sr-only">{example.title}</DialogTitle>
          <DialogDescription className="sr-only">{example.seen}</DialogDescription>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background">
            <Pictures example={example} eager className="w-[900px] max-w-none sm:w-full" />
          </div>
        </DialogContent>
      </Dialog>
      <figcaption className="px-1 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">In the app: </span>
        {example.seen} <span className="whitespace-nowrap">Press the picture to enlarge it.</span>
      </figcaption>
    </figure>
  );
}

// Plain sentences to try, with the answer, the tools used and the screen that changes.
export function Examples() {
  return (
    <section aria-labelledby="examples-h" className="grid gap-4">
      <div>
        <h2 id="examples-h" className="text-xl font-semibold tracking-[-0.03em]">How to use</h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-6 text-body">
          Once it is connected, just talk to it in plain sentences. Here are four to try, with the screen of the app that changes. What your assistant says back will vary.
        </p>
      </div>
      <ol className="grid gap-4">
        {EXAMPLES.map((e, i) => (
          <li key={e.id}>
            <Card aria-labelledby={`example-${e.id}`}>
              <CardHeader>
                <CardTitle id={`example-${e.id}`}>{i + 1}. {e.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3">
                  <Bubble who="you">{e.say}</Bubble>
                  <Bubble who="assistant">{e.reply}</Bubble>
                </div>
                <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                  Tools it uses
                  {e.tools.map((t) => (
                    <Badge key={t} variant="secondary" className="font-mono text-[11.5px] font-normal">{t}</Badge>
                  ))}
                </p>
                <Screen example={e} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
