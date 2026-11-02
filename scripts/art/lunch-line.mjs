// Draws the landing page's "lunch line" illustration as SVG, in a monochrome print style:
// ink outlines, flat black / grey / white fills, a slight hand-drawn wobble and white specks.
//
//   node scripts/art/lunch-line.mjs          writes scripts/art/out/*.svg
//   node scripts/art/lunch-line.mjs --png    also rasterises them into public/illustrations/ with Chrome
//
// crowd.svg is the queue of eight people at the counter with the tiffin; bubble-<kind>.svg are
// the thought bubbles, one per dish kind, placed over the crowd by src/landing/Tastes.tsx.

import { INK, GREY, WHITE, p, ln, c, e, g, bone, clipped, svgDoc, writeSvg, rasterise } from './style.mjs';

// ---------- a person, drawn facing right with the feet on y = 0 ----------

const neck = (skin) => p('M -8 -494 L -10 -460 L 14 -460 L 12 -494 Z', skin);

function face(skin, eye = 'calm', mouth = 'smile') {
  const eyes = {
    calm: 'M 15 -533 Q 20 -529 26 -533',
    down: 'M 16 -527 Q 21 -523 26 -526',
    up: 'M 16 -538 Q 21 -542 26 -538',
  };
  const mouths = {
    smile: 'M 21 -507 Q 26 -503 31 -507',
    grin: 'M 20 -509 Q 27 -499 34 -509',
    flat: 'M 22 -506 L 30 -506',
  };
  return (
    p('M -24 -548 C -26 -574 26 -580 32 -550 L 34 -534 L 42 -521 L 34 -516 C 35 -506 33 -498 24 -494 C 12 -488 -12 -490 -20 -504 C -26 -514 -26 -534 -24 -548 Z', skin) +
    p('M -6 -537 C -20 -543 -22 -515 -6 -518 Z', skin, 2.6) +
    ln(eyes[eye], INK, 2.6) +
    ln(mouths[mouth], INK, 2.6)
  );
}

const sneaker = (x, fill = WHITE) =>
  p(`M ${x - 26} -32 L ${x + 2} -32 C ${x + 14} -30 ${x + 24} -20 ${x + 26} -10 L ${x + 26} -2 L ${x - 26} -2 Z`, fill) +
  ln(`M ${x - 26} -11 L ${x + 26} -11`);

// 1. Hoodie, laptop under the arm, glasses, curly hair.
function personHoodie() {
  const skin = GREY;
  const hair = [[-22, -552, 13], [-9, -566, 14], [7, -572, 13], [21, -567, 11], [30, -557, 7], [-28, -536, 11], [-24, -521, 8]];
  return [
    p('M -38 -456 C -62 -470 -54 -510 -22 -506 L -4 -470 Z', GREY),
    p('M -24 -322 C -26 -240 -24 -120 -22 -30 L 0 -30 C 0 -120 2 -240 4 -322 Z', INK),
    p('M -2 -322 C 4 -230 12 -130 16 -30 L 38 -30 C 36 -130 32 -240 30 -322 Z', INK),
    ln('M 27 -300 C 28 -220 30 -130 33 -44', WHITE, 2.2),
    ln('M -6 -300 L -8 -44', WHITE, 2.2),
    sneaker(-2),
    p('M 12 -32 L 40 -32 C 52 -30 62 -20 64 -10 L 64 -2 L 12 -2 Z', WHITE),
    ln('M 12 -11 L 64 -11'),
    ln('M 30 -30 l 4 7 M 37 -29 l 4 7', INK, 2.2),
    neck(skin),
    p('M -38 -458 C -48 -430 -52 -360 -48 -300 L -46 -282 L 42 -282 L 42 -300 C 46 -360 46 -430 38 -456 C 18 -468 -18 -470 -38 -458 Z', GREY),
    ln('M -47 -300 L 42 -300'),
    ln('M -10 -362 L 28 -362 L 36 -302'),
    ln('M -10 -362 L -14 -302'),
    face(skin, 'calm', 'smile'),
    c(22, -530, 9, 'none', 2.4),
    ln('M 13 -532 L -4 -535', INK, 2.2),
    hair.map(([x, y, r]) => c(x, y, r, INK)).join(''),
    ln('M 16 -462 L 18 -420', INK, 2.4),
    ln('M 26 -460 L 28 -426', INK, 2.4),
    p('M -46 -356 L 66 -350 L 66 -338 L -46 -344 Z', INK),
    ln('M -40 -347 L 60 -342', WHITE, 1.8),
    p('M 6 -452 C 26 -444 34 -410 34 -370 L 32 -334 L 12 -334 L 12 -372 C 12 -400 6 -424 -2 -438 Z', GREY),
    ln('M 12 -346 L 32 -346'),
    p('M 12 -336 C 14 -322 31 -320 33 -334 Z', skin),
  ].join('');
}

// 2. Kurta, scarf, phone in both hands, long braid.
function personKurta() {
  const skin = WHITE;
  const kurta = 'M -34 -456 C -44 -400 -50 -280 -54 -168 L 48 -166 C 46 -280 42 -400 32 -454 C 14 -466 -16 -468 -34 -456 Z';
  const diamonds = [];
  for (let y = -446, row = 0; y < -200; y += 17, row++) {
    for (let x = -60 + (row % 2) * 8; x < 56; x += 16) diamonds.push(`M ${x} ${y - 3.2} L ${x + 3.2} ${y} L ${x} ${y + 3.2} L ${x - 3.2} ${y} Z`);
  }
  const braid = [[-25, -518], [-28, -499], [-30, -480], [-31, -461], [-32, -443], [-32, -426]];
  return [
    p('M -18 -322 C -18 -240 -16 -120 -14 -30 L 0 -30 C 2 -120 4 -240 6 -322 Z', INK),
    p('M 2 -322 C 6 -230 12 -130 14 -30 L 28 -30 C 28 -130 26 -240 24 -322 Z', INK),
    p('M -18 -30 L 2 -30 C 10 -28 14 -14 14 -6 L 14 -2 L -18 -2 Z', INK),
    p('M 12 -30 L 30 -30 C 42 -28 50 -16 50 -8 L 50 -2 L 12 -2 Z', INK),
    ln('M 14 -24 L 30 -24', WHITE, 2),
    ln('M -16 -24 L 2 -24', WHITE, 2),
    neck(skin),
    p(kurta, WHITE),
    clipped(kurta, `<path d="${diamonds.join(' ')}" fill="${GREY}"/>`),
    ln('M -53 -196 L 47 -194'),
    ln('M -54 -180 L 48 -178'),
    ln('M -52 -188 l 8 -5 l 8 5 l 8 -5 l 8 5 l 8 -5 l 8 5 l 8 -5 l 8 5 l 8 -5 l 8 5 l 8 -5 l 8 5', INK, 2),
    ln('M 44 -250 L 47 -168'),
    p('M -2 -462 L 8 -438 L 18 -462 Z', skin, 2.6),
    braid.map(([x, y], i) => e(x, y, 8 - i * 0.4, 11, INK)).join(''),
    braid.slice(0, -1).map(([x, y]) => ln(`M ${x - 6} ${y + 8} q 6 4 12 0`, WHITE, 1.6)).join(''),
    e(-32, -414, 5, 3, GREY, 2),
    face(skin, 'down', 'smile'),
    p('M -26 -536 C -30 -580 30 -586 34 -552 C 22 -566 2 -566 -8 -556 C -16 -548 -20 -540 -26 -528 Z', INK),
    c(-8, -511, 3.2, GREY, 2),
    p('M 14 -466 C -6 -420 -34 -330 -58 -250 L -44 -244 C -22 -320 6 -410 30 -462 Z', GREY),
    ln('M -57 -248 l -4 11 M -51 -246 l -4 11 M -45 -244 l -4 11', INK, 2.2),
    p('M 4 -452 C 22 -440 26 -410 26 -384 L 8 -380 C 6 -404 0 -428 -8 -440 Z', WHITE),
    p('M 10 -386 L 26 -390 L 64 -432 L 56 -442 Z', skin),
    p('M 56 -472 L 73 -464 L 65 -428 L 48 -436 Z', INK),
    ln('M 58 -463 L 67 -459', WHITE, 2),
    p('M 49 -446 C 59 -453 72 -447 70 -432 C 66 -424 54 -426 49 -434 Z', skin),
  ].join('');
}

// 3. Pinstripe shirt, hand on the chin, beard: deciding.
function personThinking() {
  const skin = GREY;
  const shirt = 'M -40 -458 C -48 -420 -48 -360 -44 -318 L 40 -318 C 42 -360 44 -420 38 -456 C 18 -468 -20 -470 -40 -458 Z';
  const stripes = Array.from({ length: 12 }, (_, i) => `M ${-52 + i * 9} -480 L ${-52 + i * 9} -300`).join(' ');
  return [
    p('M -26 -322 C -28 -240 -26 -130 -24 -62 L -2 -62 C -2 -130 0 -240 4 -322 Z', GREY),
    p('M -2 -322 C 4 -230 12 -140 16 -62 L 38 -62 C 36 -140 34 -240 30 -322 Z', GREY),
    ln('M 26 -306 C 28 -230 30 -150 30 -72', WHITE, 2.2),
    p('M -24 -64 L -2 -64 L 0 -14 C 8 -12 16 -8 18 -2 L -26 -2 Z', INK),
    p('M 14 -64 L 38 -64 L 40 -18 C 52 -16 58 -8 60 -2 L 12 -2 Z', INK),
    ln('M 12 -8 L 60 -8', WHITE, 2),
    ln('M 24 -56 L 34 -54 M 23 -48 L 33 -46 M 23 -40 L 33 -38', WHITE, 2),
    neck(skin),
    p(shirt, WHITE),
    clipped(shirt, ln(stripes, INK, 1.7)),
    p('M -44 -326 L 40 -326 L 40 -312 L -44 -312 Z', INK),
    p('M 22 -324 L 32 -324 L 32 -314 L 22 -314 Z', WHITE, 2),
    p('M -6 -466 L 6 -446 L 16 -466 Z', WHITE, 2.6),
    ln('M 10 -446 L 14 -330', INK, 2.2),
    face(skin, 'up', 'flat'),
    p('M -26 -540 C -32 -586 30 -596 42 -560 C 30 -566 18 -566 8 -560 C 0 -556 -10 -552 -16 -538 Z', INK),
    p('M -16 -516 C -14 -496 4 -484 22 -490 C 30 -492 34 -500 34 -512 L 26 -508 C 18 -500 4 -502 -6 -514 Z', INK),
    ln('M 22 -515 q 8 -5 15 1', INK, 4),
    ln('M 14 -546 Q 21 -551 28 -547', INK, 2.4),
    p('M 6 -454 C 22 -440 30 -410 32 -380 L 14 -372 C 12 -400 4 -430 -4 -442 Z', WHITE),
    p('M 14 -378 L 33 -382 L 35 -368 L 16 -364 Z', WHITE),
    p('M 15 -368 L 36 -374 L 49 -488 L 30 -493 Z', skin),
    p('M 30 -500 C 32 -515 51 -515 50 -500 C 50 -488 34 -484 30 -492 Z', skin),
    ln('M 45 -510 L 41 -527', INK, 2.6),
  ].join('');
}

// 4. Turtleneck, wide trousers, coffee mug.
function personMug() {
  const skin = WHITE;
  return [
    p('M -30 -322 C -32 -230 -36 -120 -40 -24 L -6 -24 C -4 -120 0 -230 4 -322 Z', WHITE),
    p('M -2 -322 C 6 -230 16 -120 24 -24 L 54 -24 C 48 -120 38 -230 30 -322 Z', WHITE),
    ln('M 14 -300 C 18 -200 26 -110 38 -30', INK, 2.2),
    p('M -36 -24 L -6 -24 C 2 -22 8 -12 10 -2 L -36 -2 Z', INK),
    p('M 26 -24 L 54 -24 C 62 -22 68 -12 70 -2 L 24 -2 Z', INK),
    neck(skin),
    p('M -38 -456 C -46 -420 -46 -360 -42 -320 L 38 -320 C 40 -360 42 -420 36 -454 C 16 -466 -18 -468 -38 -456 Z', INK),
    p('M -12 -464 L -12 -492 L 16 -492 L 16 -464 Z', INK),
    ln('M -12 -478 L 16 -478', WHITE, 1.8),
    face(skin, 'calm', 'smile'),
    p('M -24 -536 C -30 -582 32 -588 36 -552 C 30 -560 16 -560 8 -556 L 2 -546 L -6 -554 C -12 -550 -16 -544 -18 -534 Z', GREY),
    c(-8, -509, 3.4, INK, 2),
    p('M 4 -452 C 22 -440 28 -410 28 -384 L 10 -378 C 8 -404 2 -430 -6 -442 Z', INK),
    p('M 10 -394 L 28 -398 L 58 -416 L 52 -432 Z', INK),
    p('M 58 -448 L 86 -448 L 84 -404 C 82 -398 62 -398 60 -404 Z', WHITE),
    ln('M 84 -440 C 97 -440 97 -414 84 -416'),
    p('M 51 -434 C 57 -440 66 -434 64 -422 C 62 -414 52 -414 49 -421 Z', skin),
    ln('M 66 -458 C 61 -469 71 -476 66 -488 M 78 -458 C 73 -469 83 -476 78 -488', INK, 2.4),
  ].join('');
}

// 5. Headscarf, long tunic, phone at the waist.
function personHijab() {
  const skin = WHITE;
  return [
    p('M -22 -322 L -20 -30 L 0 -30 L 4 -322 Z', INK),
    p('M 0 -322 C 6 -230 10 -130 12 -30 L 32 -30 C 30 -130 28 -240 26 -322 Z', INK),
    sneaker(-1, GREY),
    p('M 10 -30 L 34 -30 C 46 -28 54 -18 56 -8 L 56 -2 L 10 -2 Z', GREY),
    ln('M 10 -10 L 56 -10'),
    p('M -36 -456 C -46 -400 -50 -300 -52 -200 L 46 -198 C 44 -300 40 -400 32 -454 C 14 -466 -16 -468 -36 -456 Z', WHITE),
    ln('M -51 -222 L 45 -220'),
    ln('M -51 -210 L 45 -208'),
    ln('M -48 -216 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4', INK, 1.8),
    p('M -34 -540 C -36 -594 42 -598 44 -548 L 44 -510 C 44 -486 32 -472 22 -464 C 32 -458 42 -442 40 -420 C 12 -410 -30 -414 -46 -430 C -52 -462 -46 -512 -34 -540 Z', GREY),
    p('M 0 -556 C 18 -564 32 -556 34 -544 L 35 -532 L 42 -521 L 35 -516 C 36 -506 33 -498 24 -494 C 14 -490 4 -492 -2 -500 C -6 -512 -6 -544 0 -556 Z', skin),
    ln('M 16 -527 Q 21 -523 26 -526', INK, 2.6),
    ln('M 21 -507 Q 26 -503 31 -507', INK, 2.6),
    ln('M -2 -562 C -10 -540 -10 -505 -2 -490'),
    ln('M -30 -470 C -10 -462 10 -462 24 -470', INK, 2.4),
    ln('M -40 -444 C -20 -436 10 -436 30 -444', INK, 2.4),
    p('M 6 -450 C 22 -440 28 -410 28 -380 L 10 -376 C 8 -404 2 -430 -6 -442 Z', WHITE),
    p('M 10 -386 L 28 -390 L 56 -376 L 52 -360 Z', WHITE),
    p('M 48 -394 L 76 -386 L 72 -373 L 44 -381 Z', INK),
    p('M 52 -381 C 62 -386 69 -375 64 -365 C 58 -358 50 -362 50 -370 Z', skin),
  ].join('');
}

// 6. Cap on backwards, T-shirt, hands in pockets.
function personCap() {
  const skin = GREY;
  return [
    p('M -26 -64 L -2 -64 L 0 -26 C 10 -24 18 -16 20 -6 L 20 -2 L -26 -2 Z', WHITE),
    p('M 14 -64 L 38 -64 L 40 -28 C 52 -26 60 -16 62 -6 L 62 -2 L 14 -2 Z', WHITE),
    ln('M -26 -10 L 20 -10'),
    ln('M 14 -10 L 62 -10'),
    ln('M 44 -10 C 44 -20 52 -26 57 -21', INK, 2.2),
    p('M -26 -322 C -28 -240 -26 -130 -24 -36 L -2 -36 C -2 -130 0 -240 4 -322 Z', GREY),
    p('M -2 -322 C 4 -230 12 -140 16 -36 L 40 -36 C 38 -140 34 -240 30 -322 Z', GREY),
    p('M 16 -204 L 37 -206 L 39 -160 L 18 -158 Z', GREY, 2.6),
    ln('M 16 -194 L 37 -196', INK, 2.4),
    ln('M -24 -44 L -2 -44 M 16 -46 L 40 -46', INK, 2.4),
    neck(skin),
    p('M -40 -460 C -48 -420 -48 -360 -44 -314 L 40 -314 C 42 -360 44 -420 38 -458 C 18 -470 -20 -472 -40 -460 Z', WHITE),
    p('M 14 -420 L 30 -420 L 30 -400 L 14 -400 Z', WHITE, 2.4),
    ln('M -10 -466 C -2 -456 10 -456 16 -466', INK, 2.6),
    face(skin, 'calm', 'grin'),
    p('M -26 -548 C -26 -586 32 -590 36 -552 Z', INK),
    p('M -26 -557 L -50 -550 L -48 -541 L -24 -546 Z', INK),
    ln('M -14 -572 C -4 -578 10 -578 20 -572', WHITE, 1.8),
    p('M 4 -456 C 22 -446 30 -420 30 -400 L 12 -396 C 10 -420 2 -440 -6 -448 Z', WHITE),
    p('M 12 -398 L 30 -402 L 28 -318 L 12 -316 Z', skin),
    ln('M 6 -316 L 34 -320', INK, 4),
  ].join('');
}

// 7. Sweater vest, reading glasses, pointing up at the thought.
function personPointing() {
  const skin = WHITE;
  return [
    p('M -24 -322 C -26 -240 -24 -130 -22 -28 L 0 -28 C 0 -130 2 -240 6 -322 Z', INK),
    p('M 0 -322 C 6 -230 12 -130 16 -28 L 38 -28 C 36 -130 32 -240 30 -322 Z', INK),
    ln('M 27 -304 C 28 -220 30 -130 32 -40', WHITE, 2.2),
    p('M -24 -28 L 2 -28 C 12 -26 20 -16 22 -6 L 22 -2 L -24 -2 Z', INK),
    p('M 14 -28 L 40 -28 C 54 -26 62 -16 64 -6 L 64 -2 L 14 -2 Z', INK),
    ln('M 18 -9 L 60 -9 M -20 -9 L 18 -9', WHITE, 1.6),
    neck(skin),
    p('M -40 -458 C -48 -420 -48 -360 -44 -318 L 40 -318 C 42 -360 44 -420 38 -456 C 18 -468 -20 -470 -40 -458 Z', WHITE),
    p('M -36 -448 C -44 -410 -46 -360 -44 -318 L 40 -318 C 42 -360 42 -410 34 -444 L 16 -404 L 4 -446 Z', GREY),
    p('M 6 -456 L 12 -456 L 15 -404 L 10 -396 L 4 -404 Z', INK),
    ln('M -44 -334 L 40 -334', INK, 2.4),
    ln('M -36 -334 L -36 -318 M -24 -334 L -24 -318 M -12 -334 L -12 -318 M 0 -334 L 0 -318 M 12 -334 L 12 -318 M 24 -334 L 24 -318 M 36 -334 L 36 -318', INK, 1.8),
    face(skin, 'up', 'grin'),
    p('M -24 -532 C -30 -568 -10 -584 12 -580 C -6 -572 -14 -560 -16 -540 Z', GREY),
    p('M 21 -514 q 9 -5 17 2 q -9 4 -17 -2 Z', GREY, 2.2),
    p('M 15 -540 L 31 -540 L 31 -529 L 15 -529 Z', 'none', 2.4),
    ln('M 15 -535 L -4 -537', INK, 2.2),
    p('M 6 -454 C 30 -466 52 -488 72 -506 L 58 -522 C 40 -500 18 -480 -4 -468 Z', WHITE),
    ln('M 58 -518 L 72 -506', INK, 2.4),
    p('M 60 -518 L 74 -508 L 82 -596 L 67 -600 Z', skin),
    p('M 63 -602 C 63 -618 83 -620 82 -602 C 82 -592 68 -590 63 -598 Z', skin),
    p('M 73 -616 L 75 -650 L 82 -650 L 81 -616 Z', skin, 2.6),
  ].join('');
}

// 8. Blazer, high ponytail, reaching for the tiffin at the front of the line.
function personReaching() {
  const skin = GREY;
  return [
    p('M -20 -572 C -52 -580 -62 -540 -54 -500 C -52 -486 -46 -480 -42 -484 C -48 -520 -42 -556 -18 -562 Z', INK),
    p('M -22 -322 C -24 -240 -22 -130 -20 -30 L 0 -30 C 0 -130 2 -240 6 -322 Z', INK),
    p('M 0 -322 C 6 -230 12 -130 16 -30 L 36 -30 C 34 -130 30 -240 28 -322 Z', INK),
    sneaker(-1),
    p('M 12 -32 L 38 -32 C 50 -30 60 -20 62 -10 L 62 -2 L 12 -2 Z', WHITE),
    ln('M 12 -11 L 62 -11'),
    neck(skin),
    p('M -40 -458 C -48 -420 -50 -330 -48 -290 L 42 -290 C 44 -340 44 -420 38 -456 C 18 -468 -20 -470 -40 -458 Z', GREY),
    p('M 0 -462 L 16 -412 L 22 -462 Z', WHITE, 2.6),
    ln('M 0 -462 L 16 -412 L 10 -360', INK, 2.6),
    c(14, -346, 3, INK, 1.6),
    c(15, -324, 3, INK, 1.6),
    ln('M -32 -340 L -8 -340', INK, 2.4),
    face(skin, 'calm', 'smile'),
    p('M -26 -536 C -30 -584 32 -588 36 -552 C 24 -566 4 -566 -8 -556 C -14 -550 -20 -544 -26 -534 Z', INK),
    p('M -24 -566 L -14 -574 L -10 -564 Z', GREY, 2),
    p('M 6 -452 C 26 -444 40 -420 50 -400 L 36 -386 C 26 -404 12 -422 -2 -436 Z', GREY),
    p('M 40 -406 L 50 -392 L 92 -392 L 92 -408 Z', GREY),
    p('M 88 -411 L 97 -411 L 97 -389 L 88 -389 Z', WHITE, 2.4),
    p('M 97 -410 C 111 -414 119 -404 115 -394 C 109 -388 99 -390 97 -394 Z', skin),
  ].join('');
}

const PEOPLE = [personHoodie, personKurta, personThinking, personMug, personHijab, personCap, personPointing, personReaching];

// ---------- the scene ----------

export const SCENE = { width: 1600, height: 860, ground: 840 };
export const XS = [100, 280, 460, 640, 820, 1000, 1180, 1360];
// Which bubbles sit on the higher row; the pointing person (index 6) has no trail, the finger is it.
export const TIERS = [1, 0, 1, 0, 1, 0, 1, 0];

function trails() {
  return XS.map((x, i) => {
    if (i === 6) return '';
    const dots = TIERS[i]
      ? [[x + 20, 238, 5], [x + 28, 214, 7], [x + 37, 188, 8.5], [x + 44, 160, 10]]
      : [[x + 20, 238, 5], [x + 30, 216, 8]];
    return dots.map(([cx, cy, r]) => c(cx, cy, r, WHITE, 2.8)).join('');
  }).join('');
}

function tiffin(x, base) {
  const w = 74, h = 30;
  const tiers = [0, 1, 2].map((k) => {
    const y = base - (k + 1) * h - k * 5;
    return p(`M ${x - w / 2} ${y} L ${x + w / 2} ${y} L ${x + w / 2} ${y + h - 6} Q ${x + w / 2} ${y + h} ${x + w / 2 - 6} ${y + h} L ${x - w / 2 + 6} ${y + h} Q ${x - w / 2} ${y + h} ${x - w / 2} ${y + h - 6} Z`, INK) +
      ln(`M ${x - w / 2 + 5} ${y + 7} L ${x + w / 2 - 5} ${y + 7}`, WHITE, 2.2);
  });
  const top = base - 3 * h - 2 * 5;
  return [
    ln(`M ${x - w / 2 - 7} ${base - 24} L ${x - w / 2 - 7} ${top - 40} L ${x + w / 2 + 7} ${top - 40} L ${x + w / 2 + 7} ${base - 24}`, INK, 6),
    ...tiers,
    p(`M ${x - w / 2 - 2} ${top} C ${x - w / 2} ${top - 26} ${x + w / 2} ${top - 26} ${x + w / 2 + 2} ${top} Z`, GREY),
    c(x, top - 22, 6, INK, 2.4),
    ln(`M ${x + w / 2 + 7} ${top - 30} C ${x + w / 2 + 20} ${top - 22} ${x + w / 2 + 22} ${top - 6} ${x + w / 2 + 18} ${top + 6}`, INK, 2),
    p(`M ${x + w / 2 + 8} ${top + 6} L ${x + w / 2 + 30} ${top + 4} L ${x + w / 2 + 32} ${top + 40} L ${x + w / 2 + 10} ${top + 42} Z`, WHITE, 2.6),
    ln(`M ${x + w / 2 + 13} ${top + 15} L ${x + w / 2 + 27} ${top + 14} M ${x + w / 2 + 13} ${top + 23} L ${x + w / 2 + 25} ${top + 22} M ${x + w / 2 + 13} ${top + 31} L ${x + w / 2 + 27} ${top + 30}`, INK, 1.8),
  ].join('');
}

function crowd() {
  const G = SCENE.ground;
  const counter = ln(`M 10 ${G - 372} L 1590 ${G - 372}`) + ln(`M 30 ${G - 354} L 1570 ${G - 354}`);
  const people = PEOPLE.map((draw, i) => g(XS[i], G, draw())).join('');
  return svgDoc(SCENE.width, SCENE.height, counter + trails() + people + tiffin(1508, G - 372));
}

// ---------- thought bubbles, one per dish kind ----------

function cloudPath(cx, cy, rx, ry, n = 11, bulge = 0.64) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.15;
    const j = 1 + Math.sin(i * 2.7) * 0.05;
    return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j];
  });
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i % n];
    const r = Math.hypot(x1 - x0, y1 - y0) * bulge;
    d += ` A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d + ' Z';
}

const leaf = (x, y, rot, fill) =>
  g(x, y, p('M -17 0 C -9 -11 9 -11 17 0 C 9 11 -9 11 -17 0 Z', fill, 2.4) + ln('M -12 0 L 12 0', fill === INK ? WHITE : INK, 1.6), ` rotate(${rot})`);
const grains = (pts) => ln(pts.map(([x, y]) => `M ${x} ${y} l 6 -2`).join(' '), INK, 2);

export const DISHES = {
  thali: () => [
    e(0, 8, 58, 27, GREY),
    e(0, 6, 48, 20, '#b9b9b9', 2.2),
    ...[[-27, -2, INK], [0, -10, GREY], [27, -2, INK]].map(([x, y, f]) => e(x, y, 13, 6.5, WHITE, 2.6) + e(x, y + 1, 9, 3.8, f, 1.8)),
    p('M -22 20 C -20 7 -3 4 3 11 C 9 6 18 10 18 20 Z', WHITE, 2.6),
    grains([[-14, 16], [-6, 12], [4, 16]]),
    e(31, 16, 15, 7.5, WHITE, 2.6),
    c(26, 15, 2.2, GREY, 0),
    c(35, 18, 2.2, GREY, 0),
  ].join(''),
  biryani: () => [
    p('M -36 -2 C -32 -30 -10 -38 6 -36 C 22 -36 34 -26 36 -2 Z', WHITE),
    grains([[-22, -12], [-10, -22], [2, -16], [-26, -4], [12, -6], [-12, -6]]),
    p('M 2 -22 C 6 -40 30 -42 34 -28 C 36 -18 24 -12 12 -14 Z', INK),
    bone('M 29 -37 L 41 -51'),
    c(42, -53, 4, WHITE, 2),
    p('M -38 -18 L -22 -30 L -19 -14 Z', WHITE, 2.4),
    ln('M -33 -19 L -23 -25 M -30 -16 L -22 -20', INK, 1.4),
    p('M -46 -2 L 46 -2 C 44 22 24 32 0 32 C -24 32 -44 22 -46 -2 Z', GREY),
    ln('M -44 8 L 44 8', WHITE, 2.4),
    ln('M -38 14 l 6 6 l 6 -6 l 6 6 l 6 -6 l 6 6 l 6 -6 l 6 6 l 6 -6 l 6 6 l 6 -6 l 6 6 l 6 -6', WHITE, 2),
    e(0, -2, 46, 6, 'none'),
  ].join(''),
  burrito: () => g(0, 0, [
    p('M -46 -17 L 30 -17 C 45 -17 51 -8 51 0 C 51 8 45 17 30 17 L -46 17 C -56 17 -58 -17 -46 -17 Z', WHITE),
    ln('M 4 -14 L 12 14 M 18 -14 L 26 12', GREY, 3),
    p('M -50 -19 L -6 -19 L -2 -11 L -8 -3 L -2 5 L -8 12 L -4 19 L -50 19 C -60 19 -60 -19 -50 -19 Z', GREY),
    ln('M -40 -12 l 8 6 M -30 6 l 10 -4 M -44 8 l 6 6', WHITE, 1.8),
    e(45, 0, 9, 15, INK),
    c(43, -6, 2.4, WHITE, 0),
    c(47, 3, 2.2, WHITE, 0),
    c(42, 7, 2, GREY, 0),
  ].join(''), ' rotate(-12)'),
  bowl: () => [
    bone('M 30 -16 L 56 -42', 8),
    p('M -42 -4 C -32 -32 32 -32 42 -4 Z', WHITE),
    p('M -26 -12 l 12 -7 l 7 8 l -12 7 Z', GREY, 2.4),
    p('M 2 -24 l 14 -2 l 2 10 l -14 2 Z', INK, 2.4),
    p('M 15 -10 l 12 -4 l 4 8 l -12 4 Z', GREY, 2.4),
    leaf(-8, -20, -20, INK),
    p('M -48 -4 L 48 -4 C 46 22 24 32 0 32 C -24 32 -46 22 -48 -4 Z', INK),
    ln('M -40 7 C -20 13 20 13 40 7', WHITE, 2.4),
  ].join(''),
  salad: () => [
    leaf(-26, -10, -30, GREY),
    leaf(-6, -18, 10, INK),
    leaf(16, -14, 35, GREY),
    leaf(30, -4, -20, INK),
    leaf(-34, 0, 20, INK),
    c(-10, -6, 7, WHITE, 2.4),
    ln('M -13 -6 L -7 -6 M -10 -9 L -10 -3', INK, 1.4),
    c(10, -4, 6, WHITE, 2.4),
    p('M -50 -2 L 50 -2 C 46 24 24 32 0 32 C -24 32 -46 24 -50 -2 Z', WHITE),
    ln('M -44 9 C -20 15 20 15 44 9', INK, 2.4),
    ln('M -30 14 L -26 26 M -14 16 L -12 30 M 2 17 L 2 31 M 16 16 L 14 30 M 30 14 L 26 26', INK, 1.8),
  ].join(''),
  wrap: () => g(0, 0, [
    p('M -16 -40 L 16 -40 L 16 30 C 16 38 -16 38 -16 30 Z', WHITE),
    ln('M -14 -22 l 28 4 M -14 -6 l 28 4', GREY, 2.4),
    e(0, -40, 16, 6, INK),
    p('M -14 -44 C -10 -54 -2 -46 2 -52 C 6 -46 12 -54 16 -44 Z', WHITE, 2.2),
    c(-5, -41, 2.4, WHITE, 0),
    c(6, -39, 2, GREY, 0),
    p('M -18 0 L 18 0 L 18 32 C 18 42 -18 42 -18 32 Z', GREY),
    ln('M -18 10 L 18 10', WHITE, 1.8),
    ln('M -12 18 L -6 30 M 0 18 L 4 30 M 10 18 L 12 28', WHITE, 1.6),
  ].join(''), ' rotate(-24)'),
  burger: () => [
    p('M -42 18 L 42 18 C 42 30 34 34 24 34 L -24 34 C -34 34 -42 30 -42 18 Z', GREY),
    p('M -46 6 L 46 6 C 48 12 46 19 40 19 L -40 19 C -46 19 -48 12 -46 6 Z', INK),
    p('M -40 0 L 40 0 L 36 8 L 22 8 L 18 16 L 14 8 L -40 8 Z', WHITE, 2.4),
    p('M -48 -6 C -40 2 -32 -8 -24 0 C -16 -8 -8 2 0 -6 C 8 2 16 -8 24 0 C 32 -8 40 2 48 -6 L 48 2 L -48 2 Z', WHITE, 2.4),
    p('M -44 -6 C -42 -40 42 -40 44 -6 Z', GREY),
    ...[[-22, -22], [-8, -28], [8, -27], [22, -20], [0, -16], [-14, -14], [14, -13]].map(([x, y]) => e(x, y, 3, 1.8, WHITE, 1.2)),
  ].join(''),
  ramen: () => [
    p('M -46 -4 L 46 -4 C 44 22 24 32 0 32 C -24 32 -44 22 -46 -4 Z', WHITE),
    ln('M -42 8 l 7 8 l 7 -8 l 7 8 l 7 -8 l 7 8 l 7 -8 l 7 8 l 7 -8 l 7 8 l 7 -8 l 7 8 l 7 -8', INK, 2.2),
    e(0, -4, 46, 9, GREY),
    p('M 18 -24 L 32 -20 L 28 -2 L 14 -6 Z', INK, 2.4),
    ln('M -32 -4 C -28 -16 -20 -16 -16 -4 C -12 -16 -4 -16 0 -4 C 4 -16 12 -16 16 -4', INK, 2.4),
    e(-22, -10, 10, 7, WHITE, 2.4),
    e(-22, -10, 4.5, 3.5, GREY, 1.8),
    bone('M -6 -46 L 56 -8', 7),
    bone('M 2 -52 L 60 -16', 7),
  ].join(''),
  drink: () => g(0, 0, [
    bone('M 6 -30 L 22 -60', 8),
    p('M -18 -32 L 18 -32 L 14 36 L -14 36 Z', WHITE),
    p('M -17 -12 L 17 -12 L 14 36 L -14 36 Z', GREY, 2.4),
    p('M -10 -4 l 9 -2 l 2 9 l -9 2 Z', WHITE, 2),
    p('M 2 8 l 9 -2 l 2 9 l -9 2 Z', WHITE, 2),
    c(-19, -32, 11, WHITE, 2.6),
    ln('M -19 -32 L -11 -32 M -19 -32 L -24 -39 M -19 -32 L -24 -25', INK, 1.6),
    c(-6, 22, 2, WHITE, 1.2),
    c(6, 26, 1.6, WHITE, 1.2),
  ].join(''), ' scale(1.15)'),
  chicken: () => [
    e(0, 12, 56, 22, WHITE),
    p('M -32 6 C -36 -16 -10 -24 0 -10 C 6 0 -2 12 -14 12 Z', INK),
    bone('M -2 -8 L 16 -24'),
    c(18, -26, 4, WHITE, 2),
    p('M 4 16 C 0 -2 24 -10 34 2 C 40 12 32 22 20 22 Z', INK),
    bone('M 32 2 L 50 -10'),
    c(52, -12, 4, WHITE, 2),
    p('M -50 10 L -34 0 L -32 16 Z', WHITE, 2.4),
    e(-14, 24, 8, 3.6, 'none', 2),
    e(24, 26, 7, 3.2, 'none', 2),
  ].join(''),
  dosa: () => [
    e(0, 22, 58, 14, WHITE),
    p('M -46 18 L 40 -44 C 50 -38 54 -24 48 -14 L -40 26 Z', GREY),
    p('M 40 -44 C 50 -38 54 -24 48 -14 C 42 -20 38 -32 40 -44 Z', WHITE, 2.4),
    ln('M -30 12 L 34 -32 M -14 10 L 40 -24', INK, 1.6),
    e(-30, 30, 10, 4, WHITE, 2.2) + e(-30, 30, 7, 2.6, INK, 1.4),
    e(-6, 32, 10, 4, WHITE, 2.2) + e(-6, 32, 7, 2.6, GREY, 1.4),
  ].join(''),
  icecream: () => [
    c(-12, -16, 17, GREY),
    c(12, -20, 17, WHITE),
    ln('M 4 -26 q 6 -4 12 0 M -20 -14 q 6 -4 12 0', INK, 1.6),
    p('M 16 -30 L 34 -46 L 40 -40 L 22 -24 Z', GREY, 2.4),
    ln('M 22 -36 L 32 -44 M 26 -32 L 36 -40', INK, 1.4),
    p('M -32 -6 L 32 -6 L 24 34 L -24 34 Z', INK),
    ln('M -28 4 L 28 4', WHITE, 2),
    ln('M -20 18 L -14 30 M -4 18 L 0 30 M 12 18 L 14 30', WHITE, 1.6),
  ].join(''),
  fries: () => [
    ...[[-22, -40, -8], [-12, -48, -4], [-2, -44, 2], [8, -50, 6], [18, -42, 10], [26, -36, 14]].map(([x, y, r]) =>
      p(`M ${x - 4} 0 L ${x - 4} ${y} L ${x + 4} ${y} L ${x + 4} 0 Z`, WHITE, 2.4).replace('<path', `<path transform="rotate(${r} ${x} 0)"`)),
    p('M -34 -16 L 34 -16 L 26 36 L -26 36 Z', INK),
    p('M -34 -16 C -20 -4 20 -4 34 -16 L 33 -9 C 20 2 -20 2 -33 -9 Z', GREY, 2),
    ln('M -8 14 l 8 8 l 8 -8', WHITE, 2.6),
  ].join(''),
  pizza: () => [
    e(-6, 16, 50, 18, GREY),
    e(-6, 14, 42, 13, WHITE, 2.4),
    c(-26, 14, 4, INK, 1.6), c(-4, 20, 4, INK, 1.6), c(10, 10, 4, INK, 1.6),
    g(18, -14, [
      p('M -18 -24 L 26 -14 L -10 30 Z', WHITE),
      p('M -18 -24 L 26 -14 L 24 -8 L -19 -18 Z', GREY, 2.4),
      c(0, -4, 3.6, INK, 1.4), c(8, 6, 3.4, GREY, 1.4), c(-6, 12, 3, INK, 1.4),
      ln('M -2 30 q 2 6 -2 10', INK, 2),
    ].join(''), ' rotate(-8) scale(1.35)'),
  ].join(''),
};

function bubble(kind) {
  const cloud = p(cloudPath(100, 76, 86, 56), WHITE, 3.2);
  return svgDoc(200, 150, cloud + g(100, 80, DISHES[kind]()));
}

// ---------- write and rasterise ----------

const crowdSvg = writeSvg('crowd.svg', crowd());
const bubbleSvgs = Object.keys(DISHES).map((kind) => [kind, writeSvg(`bubble-${kind}.svg`, bubble(kind))]);
console.log(`wrote ${1 + bubbleSvgs.length} SVGs`);

if (process.argv.includes('--png')) {
  rasterise([
    { svg: crowdSvg, png: 'lunch-line.png', w: SCENE.width, h: SCENE.height, scale: 1.5 },
    ...bubbleSvgs.map(([kind, svg]) => ({ svg, png: `thoughts/${kind}.png`, w: 200, h: 150, scale: 2 })),
  ]);
}
