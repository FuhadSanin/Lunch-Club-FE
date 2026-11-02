export { cn } from './utils';

// Apple-style motion: a soft spring for things that move, a long ease-out for things that appear.
export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;
export const softSpring = { type: 'spring', stiffness: 170, damping: 26 } as const;
export const easeOut = [0.16, 1, 0.3, 1] as const;
