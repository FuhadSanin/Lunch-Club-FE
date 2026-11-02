// Lunch Board's illustration style, shared by every drawing in scripts/art/.
// Monochrome print: ink outlines, flat black / grey / white fills, a slight hand-drawn wobble and
// white specks inside filled areas, like worn ink on paper. See .claude/skills/print-illustration.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const OUT = join(here, 'out');
export const PUBLIC = resolve(here, '../../public/illustrations');

// The only three colours. Dark mode inverts the rendered PNGs, so never add a hue.
export const INK = '#1d1d1d';
export const GREY = '#8f8f8f';
export const WHITE = '#ffffff';
export const SW = 3.2; // outline width at the scene's own scale

// ---------- drawing helpers ----------

export const p = (d, fill = 'none', w = SW, stroke = INK) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
export const ln = (d, stroke = INK, w = SW) => p(d, 'none', w, stroke);
export const c = (cx, cy, r, fill, w = SW) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${w}"/>`;
export const e = (cx, cy, rx, ry, fill, w = SW, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="${w}" ${extra}/>`;
export const g = (x, y, body, extra = '') => `<g transform="translate(${x} ${y})${extra}">${body}</g>`;
// A bone, stick or bar: an ink outline with a white core.
export const bone = (d, w = 9) => ln(d, INK, w) + ln(d, WHITE, w - 4.4);

let clipId = 0;
export const clipped = (shape, inner) => {
  const id = `clip${++clipId}`;
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
};

// The print look: a gentle displacement for a hand-drawn line, then white specks inside every
// filled area. Tuned so specks read as worn print, not as noise: keep these numbers.
export const FILTER = `
<filter id="print" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="5" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="rough"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="3" seed="9" result="fine"/>
  <feColorMatrix in="fine" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  14 0 0 0 -9.35" result="specks"/>
  <feComposite in="specks" in2="rough" operator="in" result="specksIn"/>
  <feMerge><feMergeNode in="rough"/><feMergeNode in="specksIn"/></feMerge>
</filter>`;

// A transparent SVG document with the print filter over everything.
export const svgDoc = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<defs>${FILTER}</defs>` +
  `<g filter="url(#print)">${body}</g></svg>`;

// ---------- output ----------

export function writeSvg(name, svg) {
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, name);
  writeFileSync(path, svg);
  return path;
}

// Renders SVGs to transparent greyscale PNGs with the installed Chrome.
// jobs: [{ svg, png, w, h, scale }], png relative to public/illustrations.
export function rasterise(jobs) {
  const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
  if (!chrome) throw new Error('Chrome not found; add its path in scripts/art/style.mjs');
  for (const { svg, png, w, h, scale } of jobs) {
    const out = join(PUBLIC, png);
    mkdirSync(dirname(out), { recursive: true });
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`, `--screenshot=${out}`, `file://${svg}`], { stdio: 'ignore' });
    // Greyscale halves the files without changing the look (macOS only; skipped elsewhere).
    const gray = '/System/Library/ColorSync/Profiles/Generic Gray Profile.icc';
    if (existsSync('/usr/bin/sips') && existsSync(gray)) execFileSync('/usr/bin/sips', ['-m', gray, out, '--out', out], { stdio: 'ignore' });
  }
  console.log(`rasterised ${jobs.length} into ${PUBLIC}`);
}
