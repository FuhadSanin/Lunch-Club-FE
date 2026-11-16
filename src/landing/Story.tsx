import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Reveal } from './motion';

// The promo film, "the story cut": the organiser's 11:58 nightmare in the dark, then Lunch Board and its
// six steps in the light. Nothing is downloaded until someone presses play (the film is 7 MB).
export default function Story() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const play = () => {
    setStarted(true);
    void video.current?.play();
  };

  return (
    <section id="story" aria-labelledby="story-title" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 pt-40 sm:px-8 md:pt-56">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-7">
          <h2 id="story-title" className="text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.04em]">
            The story.
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-5">
          <p className="text-lg leading-7 text-body">
            It's 11:58. Thirty-five hungry people, one phone going round, and you're the one ordering. Two minutes on how
            lunch stops being a nightmare.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.12} className="mt-12 md:mt-16">
        <figure>
          <div className="relative overflow-hidden rounded-3xl bg-soft shadow-modal">
            <video
              ref={video}
              className="block aspect-video w-full bg-black"
              src="/promo/story.mp4"
              poster="/promo/story-poster.jpg"
              preload="none"
              playsInline
              controls={started}
              aria-label="The Lunch Board story: a two-minute film with narration and on-screen captions"
              onEnded={() => setStarted(false)}
            />
            {!started && (
              <div className="absolute inset-0 grid place-items-end p-5 sm:p-8">
                <Button size="lg" onClick={play} className="shadow-float">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /></svg>
                  Play the story
                </Button>
              </div>
            )}
          </div>
          <figcaption className="mt-3 text-[13px] text-mute">1 min 56 s, with sound. Every line is also on screen.</figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
