// The page ships with a pre-rendered copy of the landing page (#prerender: for search engines and the first paint;
// see vite.config.ts and scripts/prerender.mjs). It goes the moment the real page is there, in the same frame,
// so nothing jumps.
export const dropPrerender = () => document.getElementById('prerender')?.remove();
