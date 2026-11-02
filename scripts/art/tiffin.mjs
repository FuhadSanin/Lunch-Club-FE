// Draws the closing section's tiffin carrier in the print style (scripts/art/style.mjs):
// four lacquered tiers, a domed lid, the tall turned-wood handle frame, and the order ticket
// tied to the handle, the same ticket as on the counter in the lunch line.
//
//   node scripts/art/tiffin.mjs          writes scripts/art/out/tiffin.svg
//   node scripts/art/tiffin.mjs --png    also renders public/illustrations/tiffin.png

import { INK, GREY, WHITE, p, ln, c, e, svgDoc, writeSvg, rasterise } from './style.mjs';

export const TIFFIN = { width: 420, height: 640 };
const X = 190; // centre line of the carrier

function frame() {
  // Posts run outside the tiers and tuck in under the base; the crossbar is turned wood.
  const post = (x, dir) =>
    p(`M ${x} 70 L ${x + 22 * dir} 70 L ${x + 22 * dir} 556 L ${x + 40 * dir} 582 L ${x + 40 * dir} 596 L ${x + 14 * dir} 596 L ${x} 574 Z`, INK);
  return [
    post(44, 1),
    post(336, -1),
    ln(`M 52 96 L 52 540`, WHITE, 2.2),
    ln(`M 328 96 L 328 540`, GREY, 3),
    p(`M 34 50 Q 30 66 34 82 L 346 82 Q 350 66 346 50 Z`, INK),
    e(X, 66, 40, 21, INK),
    e(X - 52, 66, 13, 19, INK),
    e(X + 52, 66, 13, 19, INK),
    ln(`M ${X - 70} 52 L ${X - 70} 80 M ${X - 36} 50 L ${X - 36} 82 M ${X + 36} 50 L ${X + 36} 82 M ${X + 70} 52 L ${X + 70} 80`, WHITE, 1.8),
    ln(`M ${X - 22} 56 C ${X - 8} 50 ${X + 8} 50 ${X + 20} 55`, WHITE, 3),
    ln(`M 60 60 L 110 59 M 270 59 L 320 60`, WHITE, 2.4),
  ].join('');
}

function tiers() {
  const out = [];
  const rows = [[244, 326], [326, 408], [408, 490]];
  for (const [y0, y1] of rows) {
    out.push(p(`M 78 ${y0} C 72 ${y0 + 28} 72 ${y1 - 28} 78 ${y1} L 302 ${y1} C 308 ${y1 - 28} 308 ${y0 + 28} 302 ${y0} Z`, INK));
  }
  out.push(p('M 78 490 C 72 520 76 556 104 572 C 150 592 230 592 276 572 C 304 556 308 520 302 490 Z', INK));
  // Rim seams between the tiers, curved for the round body.
  for (const y of [326, 408, 490]) out.push(ln(`M 80 ${y} C 140 ${y + 9} 240 ${y + 9} 300 ${y}`, WHITE, 2.6));
  // Lacquer: a soft grey streak with a white core on the left of every tier, a short glint on the right.
  for (const [y0, y1] of [...rows, [490, 566]]) {
    out.push(ln(`M 112 ${y0 + 16} C 109 ${y0 + 34} 109 ${y1 - 34} 112 ${y1 - 16}`, GREY, 9));
    out.push(ln(`M 112 ${y0 + 20} C 110 ${y0 + 36} 110 ${y1 - 36} 112 ${y1 - 20}`, WHITE, 2));
    out.push(ln(`M 274 ${y0 + 22} L 276 ${y0 + 36}`, WHITE, 2.4));
  }
  return out.join('');
}

function lid() {
  return [
    e(X, 234, 122, 16, INK),
    ln(`M 76 238 C 126 249 254 249 304 238`, WHITE, 2.2),
    p(`M ${X - 42} 232 C ${X - 44} 188 ${X + 44} 188 ${X + 42} 232 Z`, INK),
    e(X, 194, 36, 9, INK),
    p(`M ${X - 24} 192 C ${X - 24} 172 ${X + 24} 172 ${X + 24} 192 Z`, INK),
    ln(`M ${X - 26} 214 C ${X - 18} 202 ${X - 6} 198 ${X + 6} 198`, WHITE, 2.6),
    ln(`M ${X - 12} 182 C ${X - 6} 177 ${X + 2} 176 ${X + 8} 177`, WHITE, 2),
  ].join('');
}

// The order ticket on a string from the handle: the one order, as in the lunch line.
function ticket() {
  return [
    ln('M 334 96 C 356 112 368 130 368 154', INK, 2.2),
    p('M 346 154 L 392 150 L 397 224 L 351 228 Z', WHITE),
    c(369, 162, 3.4, WHITE, 2),
    ln('M 356 176 L 384 174 M 356 186 L 380 184 M 357 196 L 384 194', INK, 2),
    c(380, 211, 7, INK, 2),
    ln('M 376.5 211 l 2.6 2.6 l 4.6 -5', WHITE, 2),
  ].join('');
}

const svg = svgDoc(TIFFIN.width, TIFFIN.height, frame() + tiers() + lid() + ticket() + ln('M 40 604 L 340 604', INK, 2.4));
const file = writeSvg('tiffin.svg', svg);
console.log('wrote tiffin.svg');

if (process.argv.includes('--png')) rasterise([{ svg: file, png: 'tiffin.png', w: TIFFIN.width, h: TIFFIN.height, scale: 2 }]);
