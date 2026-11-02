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

// Headline set word by word: each word lifts out of a soft blur, 60ms apart.
export function WordsIn({ lines, delay = 0, className }: { lines: string[]; delay?: number; className?: string }) {
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
                  {w}
                </motion.span>{' '}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
