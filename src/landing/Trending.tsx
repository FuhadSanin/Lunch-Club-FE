import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '../ui';
import { Reveal } from './motion';

const FEATURES = [
  {
    tag: 'MCP',
    icon: 'plug',
    title: 'Works with every AI chat.',
    body: 'Connect ChatGPT, Claude or any chat that speaks MCP. Then start a food party, see who picked what and lock the picks, just by talking.',
  },
  {
    tag: 'Local menu',
    icon: 'store',
    title: 'Any restaurant, even off Swiggy.',
    body: 'Sitting in a place with only a paper menu? Photograph it and send it to your AI chat. Tiffmate reads every dish and price and starts the food party. Or add the menu by hand.',
  },
];

// The two newest features and the film that shows them together. Nothing of the film is downloaded until someone
// presses play (it is 2.5 MB).
export default function Trending() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const play = () => {
    setStarted(true);
    void video.current?.play();
  };

  return (
    <section id="trending" aria-labelledby="trending-title" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 pt-40 sm:px-8 md:pt-56">
      <Reveal>
        <Badge variant="warning" className="h-7 gap-1.5 px-3 text-[13px] font-semibold">
          <Icon name="flame" size={14} className="flame-flicker" /> Trending now
        </Badge>
        <h2 id="trending-title" className="mt-4 text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.04em]">
          Trending features: MCP and Local menu.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-body">
          Friends walk into a restaurant, photograph the menu, and their AI chat starts the food party. Share the link and everyone adds their own. Easy.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
        <Reveal delay={0.08} className="lg:col-span-7">
          <figure>
            <div className="relative overflow-hidden rounded-3xl bg-soft shadow-modal">
              <video
                ref={video}
                className="block aspect-video w-full bg-black"
                src="/promo/mcp.mp4"
                poster="/promo/mcp-poster.jpg"
                preload="none"
                playsInline
                controls={started}
                aria-label="Tiffmate with your AI chat: friends photograph a paper menu, the chat starts a food party, and everyone adds their own dish"
                onEnded={() => setStarted(false)}
              />
              {!started && (
                <div className="absolute inset-0 grid place-items-end p-5 sm:p-8">
                  <Button size="lg" onClick={play} className="shadow-float">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /></svg>
                    Play the film
                  </Button>
                </div>
              )}
            </div>
            <figcaption className="mt-3 text-[13px] text-mute">51 seconds, with sound. Every line is also on screen.</figcaption>
          </figure>
        </Reveal>

        <div className="grid gap-4 lg:col-span-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.tag} delay={0.12 + i * 0.08}>
              <article className="rounded-3xl bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-ink text-on-ink"><Icon name={f.icon} size={20} /></span>
                  <Badge variant="secondary">{f.tag}</Badge>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-body">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
