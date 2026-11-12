// Art for the 30-second promo (promo/promo30.html): "one phone, two hours" and the way out.
// Same print style as the lunch line (style.mjs); the people are the lunch line's own figures
// drawn one by one, in a calm mood and a fed-up mood, so they can be animated separately.
//
//   node scripts/art/story.mjs      writes promo/art/*.png (transparent) and scripts/art/out/story-*.svg

import { INK, GREY, WHITE, p, ln, c, e, g, svgDoc, writeSvg, rasterise } from './style.mjs';
import { PEOPLE, setMood, tiffin, cloudPath } from './lunch-line.mjs';

const jobs = [];
const add = (name, w, h, body, scale = 1.5) => {
  const svg = writeSvg(`story-${name}.svg`, svgDoc(w, h, body));
  jobs.push({ svg, png: `../../promo/art/${name}.png`, w, h, scale });
};

// ---- the eight people, calm and fed up. Feet on y = 0; canvas 260 x 680, origin (110, 665).
for (const mood of ['calm', 'fedup']) {
  setMood(mood);
  PEOPLE.forEach((draw, i) => add(`p-${mood}-${i}`, 260, 680, g(110, 665, draw())));
}

// ---- the one phone: a long, hopeless cart on a small screen.
{
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const y = 160 + i * 74;
    rows.push(
      p(`M 62 ${y} L 94 ${y} L 94 ${y + 32} L 62 ${y + 32} Z`, i % 2 ? GREY : WHITE, 2.8),
      ln(`M 112 ${y + 8} L ${236 - (i % 3) * 22} ${y + 8}`, INK, 4),
      ln(`M 112 ${y + 26} L ${190 - (i % 2) * 28} ${y + 26}`, GREY, 4),
      ln(`M 306 ${y + 8} L 352 ${y + 8}`, INK, 4),
    );
  }
  const strike = [
    ln('M 108 242 L 240 238', INK, 3.4), ln('M 108 390 L 232 392', INK, 3.4), ln('M 302 538 L 356 534', INK, 3.4),
  ];
  const body = [
    p('M 76 20 L 344 20 C 384 20 404 40 404 80 L 404 700 C 404 740 384 760 344 760 L 76 760 C 36 760 16 740 16 700 L 16 80 C 16 40 36 20 76 20 Z', INK),
    ln('M 404 190 L 412 190 L 412 260 L 404 260', INK, 5),
    p('M 40 78 C 40 62 48 54 64 54 L 356 54 C 372 54 380 62 380 78 L 380 700 C 380 716 372 726 356 726 L 64 726 C 48 726 40 716 40 700 Z', WHITE),
    p('M 150 36 L 270 36 L 270 46 L 150 46 Z', GREY, 2.4),
    p('M 40 78 C 40 62 48 54 64 54 L 356 54 C 372 54 380 62 380 78 L 380 126 L 40 126 Z', INK),
    ln('M 62 90 L 160 90', WHITE, 5), ln('M 330 90 L 356 90', WHITE, 5),
    p('M 62 140 L 358 140 L 358 156 L 62 156 Z', 'none', 2),
    ...rows, ...strike,
    p('M 60 676 L 360 676 L 360 712 L 60 712 Z', GREY, 3),
    ln('M 150 694 L 270 694', WHITE, 5),
  ].join('');
  add('phone', 420, 780, body, 1.5);
}

// ---- the clock: face, then the two hands as separate images so they can turn.
{
  const ticks = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, big = k % 3 === 0;
    const r0 = big ? 150 : 166, r1 = 184;
    ticks.push(ln(`M ${220 + Math.sin(a) * r0} ${220 - Math.cos(a) * r0} L ${220 + Math.sin(a) * r1} ${220 - Math.cos(a) * r1}`, INK, big ? 9 : 4.4));
  }
  add('clock-face', 440, 440, [
    c(220, 220, 208, INK), c(220, 220, 192, WHITE, 3), ...ticks,
    ln('M 80 108 C 100 84 126 66 156 54', WHITE, 4),
  ].join(''));
  add('clock-minute', 440, 440, [
    p('M 213 248 L 216 66 L 220 44 L 224 66 L 227 248 Z', INK), ln('M 220 90 L 220 214', WHITE, 2.2), c(220, 220, 15, INK, 3), c(220, 220, 5, WHITE, 2),
  ].join(''));
  add('clock-hour', 440, 440, [
    p('M 210 244 L 214 120 L 220 100 L 226 120 L 230 244 Z', INK), ln('M 220 140 L 220 214', WHITE, 2.2), c(220, 220, 15, INK, 3), c(220, 220, 5, WHITE, 2),
  ].join(''));
}

// ---- the idea: a light bulb with rays.
{
  const rays = [];
  for (let k = 0; k < 9; k++) {
    const a = (-80 + k * 20) * Math.PI / 180;
    rays.push(ln(`M ${150 + Math.sin(a) * 128} ${150 - Math.cos(a) * 128} L ${150 + Math.sin(a) * 150} ${150 - Math.cos(a) * 150}`, INK, 6));
  }
  add('bulb', 300, 400, [
    ...rays,
    p('M 150 52 C 96 52 62 92 62 140 C 62 176 80 196 96 218 C 104 230 106 240 106 252 L 194 252 C 194 240 196 230 204 218 C 220 196 238 176 238 140 C 238 92 204 52 150 52 Z', WHITE),
    ln('M 96 120 C 96 98 112 84 132 82', GREY, 8), ln('M 96 120 C 96 98 112 84 132 82', WHITE, 2),
    ln('M 124 250 L 124 190 L 150 160 L 176 190 L 176 250', INK, 4),
    p('M 106 256 L 194 256 L 190 282 L 110 282 Z', GREY),
    p('M 110 282 L 190 282 L 186 308 L 114 308 Z', INK), ln('M 114 295 L 186 295', WHITE, 2.4),
    p('M 118 308 L 182 308 L 170 332 L 130 332 Z', INK),
  ].join(''), 1.5);
}

// ---- thought bubble for words: a cloud with a trail, 360 x 300.
add('cloud', 360, 330, [
  p(cloudPath(180, 128, 164, 96, 13, 0.62), WHITE, 3.4),
  c(86, 244, 12, WHITE, 3), c(64, 274, 8, WHITE, 3), c(48, 298, 5, WHITE, 3),
].join(''), 2);

// ---- small things: a sweat drop, an angry scribble, a sigh puff.
add('drop', 60, 90, p('M 30 8 C 18 30 8 42 8 58 C 8 74 18 82 30 82 C 42 82 52 74 52 58 C 52 42 42 30 30 8 Z', WHITE, 3.2) + ln('M 20 56 C 20 64 24 68 30 70', GREY, 5), 2);
{
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let d = '', ang = 0;
  for (let k = 0; k < 34; k++) {
    ang += 2.3 + rnd() * 0.9;
    const r = 28 + rnd() * 62;
    const x = 150 + Math.cos(ang) * r * 1.55, y = 100 + Math.sin(ang) * r;
    d += k ? ` Q ${x + (rnd() - 0.5) * 70} ${y + (rnd() - 0.5) * 70} ${x} ${y}` : `M ${x} ${y}`;
  }
  add('scribble', 300, 200, ln(d, INK, 5.5), 1.5);
}
add('puff', 220, 120, [
  p('M 30 78 C 6 78 4 46 28 44 C 28 22 62 16 76 34 C 88 14 124 18 128 42 C 156 34 176 58 160 76 C 172 92 150 104 132 96 C 118 108 94 106 84 94 C 70 106 44 100 40 88 Z', WHITE, 3.2),
].join(''), 2);

// ---- the counter line, and the tiffin that takes the phone's place on it.
add('counter', 1600, 40, ln('M 10 10 L 1590 10') + ln('M 30 28 L 1570 28'), 1.5);
// ---- a local place's paper menu (the "coming soon" scene): a card, a dark header, dotted price rows.
{
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const y = 150 + i * 52, w1 = [150, 118, 136, 104, 142, 124][i];
    rows.push(ln(`M 52 ${y} L ${52 + w1} ${y}`, INK, 5), ln(`M ${70 + w1} ${y + 2} L 226 ${y + 2}`, GREY, 2.6), ln(`M 240 ${y} L 270 ${y}`, INK, 5));
  }
  add('menu', 320, 470, [
    p('M 24 22 L 290 14 L 298 440 L 30 452 Z', WHITE, 4),
    p('M 40 36 L 276 30 L 278 104 L 42 108 Z', INK, 3),
    ln('M 96 70 L 222 67', WHITE, 9),
    ...rows,
    p('M 252 452 L 298 410 L 298 440 Z', GREY, 3),
  ].join(''), 1.5);
}

add('tiffin-counter', 200, 180, tiffin(100, 170), 2);

rasterise(jobs);
