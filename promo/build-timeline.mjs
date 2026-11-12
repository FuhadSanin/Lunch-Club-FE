// Records the promo's voiceover with Kokoro TTS (audio/kokoro_say.py), measures every line, and lays the lines
// out on one timeline (promo/timeline60.js). The animation, sound effects and music all read it,
// so they stay in sync with the voice. Rerun after changing a line: node promo/build-timeline.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const VO = join(here, 'audio', 'vo');
const NARRATOR = { voice: 'af_heart', speed: 0.92 };
const PY = join(here, '.venv', 'bin', 'python');
const TOTAL = 75;

// gap: seconds of quiet before the line. scene: which section of the film it opens.
const LINES = [
  { id: 'n1', scene: 'team', gap: 1.0, text: 'Every day at noon, thirty-five people get hungry.' },
  { id: 'n2a', gap: 0.45, text: 'Veg.' },
  { id: 'n2b', gap: 0.15, text: 'Pizza.' },
  { id: 'n2c', gap: 0.15, text: 'Burgers.' },
  { id: 'n2d', gap: 0.35, text: 'Everyone wants something different.' },
  { id: 'n3', scene: 'organiser', gap: 0.8, text: 'So, one person becomes the organiser.' },
  { id: 'n4', gap: 0.35, text: 'They pass their phone round, so everyone can pick.' },
  { id: 'c1', gap: 0.6, voice: 'bf_emma', speed: 1.05, text: 'A paneer roll for me, please.' },
  { id: 'c2', gap: 0.6, voice: 'am_michael', speed: 1.05, text: 'Is the biryani veg?' },
  { id: 'c3', gap: 0.6, voice: 'am_fenrir', speed: 1.0, text: 'No onions, please.' },
  { id: 'c4', gap: 0.6, voice: 'bm_george', speed: 1.08, text: 'Wait, what are you getting?' },
  { id: 'n4b', gap: 0.6, text: 'And on and on, until all thirty-five have picked.' },
  { id: 'n5', scene: 'byhand', gap: 0.8, text: 'Then they order by hand, one restaurant at a time.' },
  { id: 'n6', gap: 1.0, text: 'It takes a few hours. Every single day.' },
  { id: 'n7a', scene: 'gap', gap: 1.7, text: 'Thirty-five people.' },
  { id: 'n7b', gap: 0.3, text: 'One organiser.' },
  { id: 'n7c', gap: 0.3, text: 'Orders by hand.' },
  { id: 'n8a', gap: 1.0, text: "Swiggy's group order shares one cart, but only from one restaurant." },
  { id: 'n8b', gap: 0.5, text: "And its multi-restaurant checkout is still one person's cart." },
  { id: 'n9', scene: 'meet', gap: 1.0, text: 'Meet Lunch Board.' },
  { id: 'n10', scene: 'how', gap: 1.5, text: 'Everyone picks their own lunch, from any restaurant.' },
  { id: 'n11', gap: 0.7, text: 'The app groups the picks by restaurant.' },
  { id: 'n12', gap: 0.7, text: 'The host taps confirm, and the app places the order.' },
  { id: 'n13', scene: 'result', gap: 1.3, text: 'From a few hours a day, to about five minutes.' },
  { id: 'n15', scene: 'soon', gap: 1.4, text: "Coming soon: add menus from local places, even ones that aren't on Swiggy." },
  { id: 'n14', scene: 'end', gap: 1.1, text: 'Lunch Board. Everyone picks. One order.' },
];

const wavSeconds = (f) => {
  const b = readFileSync(f);
  let o = 12, dataLen = 0;
  while (o < b.length) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'data') { dataLen = len; break; } o += 8 + len; }
  return dataLen / 2 / 44100;
};

const jobs = LINES.map((l) => ({ text: l.text, voice: l.voice || NARRATOR.voice, speed: l.speed || NARRATOR.speed, out: join(VO, `${l.id}.raw.wav`) }));
process.stdout.write(execFileSync(PY, [join(here, 'audio', 'kokoro_say.py')], { input: JSON.stringify(jobs) }));
for (const l of LINES) {
  const voice = l.voice || NARRATOR.voice;
  const aiff = join(VO, `${l.id}.raw.wav`), wav = join(VO, `${l.id}.wav`);
  // Trim the silence say leaves at both ends, warm the voice a little, level it.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', aiff, '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,alimiter=limit=0.89',
    '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  l.voice = voice; l.dur = +wavSeconds(wav).toFixed(3);
}

// Lay out, then stretch or squeeze the gaps so the last line ends ~2 s before the end.
const speech = LINES.reduce((a, l) => a + l.dur, 0);
const gaps = LINES.reduce((a, l) => a + l.gap, 0);
const target = TOTAL - 2.2;
const k = Math.min(1.6, Math.max(0.6, (target - speech) / gaps));
let t = 0;
for (const l of LINES) { t += l.gap * k; l.s = +t.toFixed(3); t += l.dur; l.e = +t.toFixed(3); }
console.log(`speech ${speech.toFixed(1)} s, gaps x${k.toFixed(2)}, last line ends ${t.toFixed(2)} s`);

// ---- events: the moments the picture and the sound effects share. Times in seconds.
const C = Object.fromEntries(LINES.map((l) => [l.id, l]));
const at = (id, frac) => C[id].s + (C[id].e - C[id].s) * frac;
const ev = {
  peopleIn: [...Array(8).keys()].map((i) => 0.25 + i * 0.12),
  count35: [C.n1.s + 0.5, C.n1.e],
  dishPop: [C.n2a.s, C.n2b.s, C.n2c.s, ...[0, 1, 2, 3, 4].map((k) => C.n2d.s + 0.3 + k * 0.17)],
  dishOut: C.n3.s - 0.4,
  organiser: C.n3.s + 1.0,
  ask: ['c1', 'c2', 'c3', 'c4'].map((id) => ({ arc: C[id].s - 0.5, pop: C[id].s - 0.08, check: C[id].e + 0.05, out: C[id].e + 0.45 })),
  // the organiser's phone goes hand to hand: four slow hand-offs with a voice each, then a blur of the rest
  pass: (() => {
    const ORG = 4, slow = [[ORG, 1, at('n4', 0.45)], [1, 2, C.c2.s - 0.5], [2, 5, C.c3.s - 0.5], [5, 6, C.c4.s - 0.5]].map(([from, to, t0]) => ({ from, to, t0, t1: t0 + 0.45 }));
    const seq = [6, 7, 3, 0, 2, 1, 5, 7, 3, 0, 6, 2, ORG], a = C.n4b.s - 0.1, b = C.n4b.e + 0.35, d = (b - a) / (seq.length - 1);
    const fast = seq.slice(1).map((to, k) => ({ from: seq[k], to, t0: a + k * d, t1: a + k * d + d * 0.8, fast: 1 }));
    return [...slow, ...fast];
  })(),
  rush: [C.n4b.s - 0.1, C.n4b.e + 0.35],   // the picks counter races 4 -> 35, the small clock 12:40 -> 1:30
  clockMin: [[C.n3.s, 0], [C.c4.e + 0.3, 40], [C.n4b.s - 0.1, 40], [C.n4b.e + 0.35, 90]],
  byhandIn: C.n5.s - 0.6,
  orders: [0, 1, 2, 3, 4].map((k) => C.n5.s + 0.35 + k * 0.6),
  clockIn: C.n6.s - 0.75,
  spin: [C.n6.s - 0.35, C.n6.s + 1.7],
  hours: C.n6.s,
  everyDay: at('n6', 0.5),
  fedup: [C.n6.e + 0.2, C.n7a.s - 0.4],
  diagramIn: C.n7a.s - 0.35,
  box: [C.n7a.s, C.n7b.s, C.n7c.s, C.n7c.e + 0.4],
  swiggy: [C.n8a.s + 0.2, C.n8b.s + 0.2],
  bottleneck: at('n8b', 0.75),
  panelIn: [C.n9.s - 0.7, C.n9.s - 0.12],
  titleChime: C.n9.s - 0.1,
  panelOut: [C.n10.s - 0.95, C.n10.s - 0.4],
  winIn: C.n10.s - 0.75,
  pickClick: C.n10.e - 0.1,
  toOrder: C.n11.s - 0.35,
  ring: at('n11', 0.45),
  toBot: C.n12.s - 0.35,
  placed: C.n12.e - 0.25,
  resultIn: C.n13.s - 0.9,
  strike: at('n13', 0.38),
  after: [0, 1, 2].map((k) => C.n13.s + 0.15 + k * 0.4),
  fiveMin: at('n13', 0.78),
  soonIn: C.n15.s - 0.8,
  menuRows: [0, 1, 2, 3].map((k) => at('n15', 0.3) + k * 0.32),
  localTag: at('n15', 0.82),
  endIn: C.n14.s - 0.5,
};
const round = (x) => (typeof x === 'number' ? +x.toFixed(3) : Array.isArray(x) ? x.map(round) : Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)])));

const scenes = LINES.filter((l) => l.scene).map((l) => ({ id: l.scene, cue: l.id }));
const tl = { total: TOTAL, ev: round(ev), cues: Object.fromEntries(LINES.map((l) => [l.id, { s: l.s, e: l.e, text: l.text, voice: l.voice, narrator: !l.id.startsWith('c') }])), scenes };
writeFileSync(join(here, 'timeline60.json'), JSON.stringify(tl, null, 1));
writeFileSync(join(here, 'timeline60.js'), `window.TL = ${JSON.stringify(tl)};\n`);
for (const l of LINES) console.log(l.id.padEnd(4), l.s.toFixed(2).padStart(6), l.e.toFixed(2).padStart(6), l.voice.padEnd(8), l.text);
