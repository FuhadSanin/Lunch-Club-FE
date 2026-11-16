import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/cn';
import { Reveal } from './motion';

// The questions people ask before they try it. Each answer is plain sentences, because this is also what
// a search engine shows under the page's name: the same list is given to it as structured data.
export const FAQ = [
  {
    q: 'What is Lunch Board?',
    a: 'Lunch Board is group lunch ordering for teams. The host starts a lunch, everyone picks their own dish from any restaurant on Swiggy, and the host places one order for the whole team.',
  },
  {
    q: 'Do we all have to order from the same restaurant?',
    a: 'No. Each person picks from any restaurant, and Lunch Board adds every pick into one cart, grouped by restaurant. The host places the order restaurant by restaurant.',
  },
  {
    q: 'How does the host know who ordered what?',
    a: "Every dish goes into the restaurant's note with the person's name, so each bag arrives labelled. The board also shows who still has to pick and how much each person owes.",
  },
  {
    q: 'Who can join our team on Lunch Board?',
    a: "Anyone who signs in with a Google account at your company's email domain joins your team. The host can switch that off and invite people one by one. People with a Gmail address can start a party and share its link.",
  },
  {
    q: 'Does Lunch Board pay for the food?',
    a: 'No. The host places the Swiggy order and pays on delivery. Lunch Board collects the picks, builds the cart, tracks who has their food, and never touches payment.',
  },
];

export default function Faq({ onStart }: { onStart: () => void }) {
  // The first answer is open, so the section never looks like a list of closed doors; one at a time after that.
  const [open, setOpen] = useState<string | null>(FAQ[0].q);

  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 pt-32 sm:px-8 md:pt-44">
      <script
        type="application/ld+json"
        // Structured data for search engines: the same questions and answers as below.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
          }),
        }}
      />
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 id="faq-title" className="text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.04em]">
            Good to know.
          </h2>
          <p className="mt-4 max-w-sm text-[17px] leading-7 text-body">Short answers to what teams ask before their first lunch.</p>
          <div className="mt-6 hidden lg:block">
            <p className="text-sm text-mute">Ready to try it?</p>
            <Button onClick={onStart} className="mt-2">Start a lunch</Button>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="rounded-3xl bg-canvas p-2 shadow-card sm:p-3">
            {FAQ.map(({ q, a }, i) => {
              const isOpen = open === q;
              return (
                <Collapsible
                  key={q}
                  open={isOpen}
                  onOpenChange={(next) => setOpen(next ? q : null)}
                  className={cn('rounded-2xl transition-colors duration-200', isOpen ? 'bg-soft' : 'hover:bg-soft/70', i > 0 && 'mt-1')}
                >
                  <h3>
                    <CollapsibleTrigger className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left text-[17px] font-medium tracking-[-0.01em] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5">
                      {q}
                      <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center rounded-full bg-soft-2 text-body">
                        <span className="absolute h-0.5 w-3.5 rounded-full bg-current" />
                        <span className={cn('absolute h-3.5 w-0.5 rounded-full bg-current transition-transform duration-300', isOpen && 'scale-y-0')} />
                      </span>
                    </CollapsibleTrigger>
                  </h3>
                  {/* Always in the page (so it can be read by search engines), just folded away when closed. */}
                  <CollapsibleContent
                    forceMount
                    inert={!isOpen}
                    className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-apple', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[60ch] px-4 pb-5 text-[15px] leading-7 text-body sm:px-5">{a}</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
          <p className="mt-5 text-center text-sm text-mute lg:hidden">
            Ready to try it?{' '}
            <button type="button" onClick={onStart} className="font-medium text-foreground underline-offset-4 hover:underline">Start a lunch</button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
