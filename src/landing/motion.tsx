import { motion, type HTMLMotionProps } from 'motion/react';
import { easeOut } from '../lib/cn';

// Section entrance: rises 24px and fades in once, Apple's long ease-out.
export function Reveal({ delay = 0, y = 24, ...props }: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease: easeOut, delay }}
      {...props}
    />
  );
}

// Headline set word by word: each word lifts out of a soft blur, 60ms apart. `accent` is one word that is
// a drawing instead (an inline image, scripts/art/craving.mjs); the image's alt text is the word, so the
// headline still reads as text to screen readers and search engines.
export function WordsIn({ lines, delay = 0, className, accent }: { lines: string[]; delay?: number; className?: string; accent?: { word: string; src: string; width: number; height: number } }) {
  let i = 0;
  return (
    <span className={className}>
      {lines.map((line) => (
        <span key={line} className="block">
          {line.split(' ').map((w) => {
            const d = delay + i++ * 0.06;
            return (
              <span key={w + d}>
                <motion.span
                  className="inline-block will-change-transform"
                  initial={{ opacity: 0, y: '0.35em', filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1, ease: easeOut, delay: d }}
                >
                  {accent && w === accent.word ? (
                    <img
                      src={accent.src}
                      alt={w}
                      width={accent.width}
                      height={accent.height}
                      className="-my-[0.3em] -ml-[0.06em] inline-block h-[2.1em] w-auto max-w-full select-none align-[-0.62em] dark:invert"
                    />
                  ) : (
                    w
                  )}
                </motion.span>{' '}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
