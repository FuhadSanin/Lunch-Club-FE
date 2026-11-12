// Music, sound effects and the final mix for the 60-second promo, all synthesised here from
// promo/timeline60.json: node promo/audio/mix.mjs  ->  promo/audio/mix.wav
// The music is a gentle minor loop with a ticking clock for the problem, then a bright major groove
// from "Meet Lunch Board" on; it ducks under the voice. Effects land on the same event times the
// animation uses.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(readFileSync(join(here, '..', 'timeline60.json'), 'utf8'));
const SR = 44100, T = TL.total, N = Math.round(SR * T);
const C = TL.cues, EV = TL.ev;

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const noise = () => rnd() * 2 - 1;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// buses
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
const verb = [new Float32Array(N), new Float32Array(N)];
function put(bus, t0, sig, gain = 1, pan = 0, send = 0) {
  const i0 = Math.round(t0 * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < sig.length; i++) {
    const j = i0 + i; if (j < 0 || j >= N) continue;
    bus[0][j] += sig[i] * gl; bus[1][j] += sig[i] * gr;
    if (send) { verb[0][j] += sig[i] * gl * send; verb[1][j] += sig[i] * gr * send; }
  }
}
const env = (n, a, r) => (i) => Math.min(1, i / (a * SR)) * Math.min(1, (n - i) / (r * SR));

// ---------- instruments ----------
function pluck(f, dur, bright = 0.5, decay = 0.996) {
  const n = Math.round(dur * SR), P = Math.max(2, Math.round(SR / f)), buf = new Float32Array(P), out = new Float32Array(n);
  let lp = 0; for (let i = 0; i < P; i++) { lp += (noise() - lp) * bright; buf[i] = lp; }
  let idx = 0; const e = env(n, 0.002, 0.08);
  for (let i = 0; i < n; i++) { const nx = (idx + 1) % P; const y = buf[idx]; buf[idx] = decay * 0.5 * (buf[idx] + buf[nx]); idx = nx; out[i] = y * e(i); }
  return out;
}
function bell(f, dur, parts = [[1, 1, 1.6], [2.0, 0.3, 2.6], [3.01, 0.14, 4], [4.2, 0.07, 6]]) {
  const n = Math.round(dur * SR), out = new Float32Array(n);
  for (const [r, a, d] of parts) for (let i = 0; i < n; i++) { const t = i / SR; out[i] += a * Math.sin(2 * Math.PI * f * r * t) * Math.exp(-t * d / dur * 1.5); }
  const e = env(n, 0.003, 0.05); for (let i = 0; i < n; i++) out[i] *= e(i);
  return out;
}
const marimba = (f, dur = 0.7) => bell(f, dur, [[1, 1, 5], [3.9, 0.22, 14], [9.2, 0.06, 24]]);
function pad(midis, dur, att = 0.9, rel = 1.2) {
  const n = Math.round(dur * SR), out = new Float32Array(n), e = env(n, att, rel);
  for (const m of midis) { const f = hz(m); for (let i = 0; i < n; i++) { const t = i / SR; out[i] += (Math.sin(2 * Math.PI * f * t) + 0.6 * Math.sin(2 * Math.PI * f * 1.004 * t + 1) + 0.18 * Math.sin(4 * Math.PI * f * t)) * e(i); } }
  return out;
}
function bass(f, dur) {
  const n = Math.round(dur * SR), out = new Float32Array(n), e = env(n, 0.01, 0.15);
  for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * e(i) * (0.75 + 0.25 * Math.exp(-t * 3)); }
  return out;
}
function kick() { const n = Math.round(0.4 * SR), out = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (48 + 80 * Math.exp(-t * 28)) / SR; out[i] = Math.sin(ph) * Math.exp(-t * 7.5); } return out; }
function clap() { const n = Math.round(0.25 * SR), out = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const t = i / SR; const x = noise(); hp = 0.85 * (hp + x - prev); prev = x; const burst = [0, 0.011, 0.022].reduce((a, d) => a + (t >= d ? Math.exp(-(t - d) * (d < 0.02 ? 120 : 22)) : 0), 0); out[i] = hp * burst * 0.5; } return out; }
function shaker(len = 0.06) { const n = Math.round(len * SR), out = new Float32Array(n); let prev = 0; for (let i = 0; i < n; i++) { const x = noise(); out[i] = (x - prev) * Math.sin(Math.PI * i / n) * 0.5; prev = x; } return out; }
function tick(f = 1700) { const n = Math.round(0.07 * SR), out = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 60) + 0.35 * Math.sin(2 * Math.PI * f * 1.52 * t) * Math.exp(-t * 90); } return out; }
function riser(dur) { const n = Math.round(dur * SR), out = new Float32Array(n); let lp = 0; for (let i = 0; i < n; i++) { const x = i / n; lp += (noise() - lp) * (0.02 + 0.5 * x * x); out[i] = lp * x * x * 0.9; } return out; }
function whoosh(dur = 0.5) { const n = Math.round(dur * SR), out = new Float32Array(n); let lp = 0, lp2 = 0; for (let i = 0; i < n; i++) { const x = i / n, c = 0.03 + 0.35 * Math.sin(Math.PI * x); lp += (noise() - lp) * c; lp2 += (lp - lp2) * c; out[i] = (lp - lp2) * Math.pow(Math.sin(Math.PI * x), 1.5) * 2.2; } return out; }
function pop() { const n = Math.round(0.12 * SR), out = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (340 + 900 * Math.min(1, t / 0.045)) / SR; out[i] = Math.sin(ph) * Math.exp(-t * 34); } return out; }
function click() { const n = Math.round(0.03 * SR), out = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; out[i] = (Math.sin(2 * Math.PI * 3200 * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 220); } return out; }
const chord = (ms, t0, stepT, f, gain, pan = 0, send = 0.3) => ms.forEach((m, k) => put(sfx, t0 + k * stepT, f(hz(m)), gain, pan, send));

// ---------- the music ----------
const SWITCH = EV.panelIn[1];                      // the title card lands: the music turns bright
const BARS_BEFORE = Math.max(4, Math.round(SWITCH / 2.5));
const BAR = SWITCH / BARS_BEFORE, BEAT = BAR / 4;
console.log(`tempo ${(240 / BAR).toFixed(1)} bpm, switch at ${SWITCH.toFixed(2)} s (bar ${BARS_BEFORE})`);

const MINOR = [ // Am F C G: bass, arpeggio
  [45, [57, 60, 64, 69]], [41, [53, 57, 60, 65]], [48, [55, 60, 64, 67]], [43, [55, 59, 62, 67]]];
const MAJOR = [ // C G Am F
  [36, [60, 64, 67, 72]], [43, [59, 62, 67, 71]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]]];
const MELODY = [ // beat-in-bar, midi: a simple tune over C G Am F
  [[0, 76], [1.5, 79], [2, 84], [3, 79]], [[0, 74], [1.5, 79], [2, 83], [3, 81]],
  [[0, 72], [1.5, 76], [2, 81], [3, 76]], [[0, 77], [1.5, 76], [2, 74], [3, 72]]];
const ARP = [0, 1, 2, 3, 2, 1, 2, 1];

for (let b = 0; b * BAR < T; b++) {
  const t0 = b * BAR;
  if (b < BARS_BEFORE) {
    const [bs, ar] = MINOR[b % 4];
    put(music, t0, pad(ar.map((m) => m - 12), BAR + 0.6, 0.6, 0.8), 0.022, 0, 0.5);
    for (let q = 0; q < 4; q++) put(music, t0 + q * BEAT, tick(q % 2 ? 1250 : 1650), 0.09, q % 2 ? 0.25 : -0.25, 0.05);
    if (b === 0) continue;                         // first bar: just the clock and the pad
    put(music, t0, bass(hz(bs), BAR * 0.95), 0.2);
    const quiet = b >= BARS_BEFORE - 4 ? 0.7 : 1;  // the "gap" thins out before the turn
    ARP.forEach((k, e) => put(music, t0 + e * BEAT / 2, pluck(hz(ar[k]), 1.6, 0.35, 0.995), 0.2 * quiet, (e % 2 ? 0.3 : -0.3), 0.35));
    if (b >= 8) put(music, t0, kick(), 0.22);      // a slow heartbeat once it drags on
    if (b === BARS_BEFORE - 1) put(music, t0, riser(BAR), 0.22, 0, 0.2);
  } else {
    const k = (b - BARS_BEFORE) % 4, last = (b + 1) * BAR > T - 0.4 || t0 > EV.endIn + 1.0;
    const [bs, ar] = MAJOR[k];
    if (last) {                                    // the ending: one strum, let it ring
      [48, 55, 60, 64, 67, 72].forEach((m, i) => put(music, t0 + i * 0.035, pluck(hz(m), 3.5, 0.5, 0.998), 0.16, -0.4 + i * 0.16, 0.5));
      put(music, t0, bass(hz(36), 2.6), 0.2);
      put(music, t0, pad([60, 64, 67, 72], 3.0, 0.2, 1.5), 0.02, 0, 0.6);
      break;
    }
    put(music, t0, pad(ar.map((m) => m - 12), BAR + 0.6, 0.4, 0.8), 0.02, 0, 0.5);
    put(music, t0, bass(hz(bs), BAR * 0.45), 0.22); put(music, t0 + BAR * 0.5, bass(hz(bs), BAR * 0.45), 0.2);
    ARP.forEach((ai, e) => put(music, t0 + e * BEAT / 2, pluck(hz(ar[ai] + (e > 3 ? 12 : 0) * 0), 1.4, 0.6, 0.994), 0.17, (e % 2 ? 0.35 : -0.35), 0.3));
    MELODY[k].forEach(([bt, m]) => put(music, t0 + bt * BEAT, marimba(hz(m), 0.9), 0.11, 0.1, 0.35));
    put(music, t0, kick(), 0.38); put(music, t0 + 1.5 * BEAT, kick(), 0.22); put(music, t0 + 2 * BEAT, kick(), 0.36);
    put(music, t0 + BEAT, clap(), 0.3, 0.1, 0.15); put(music, t0 + 3 * BEAT, clap(), 0.3, 0.1, 0.15);
    for (let e = 0; e < 8; e++) put(music, t0 + e * BEAT / 2, shaker(), e % 2 ? 0.14 : 0.08, 0.4);
    if (b === BARS_BEFORE) chord([72, 76, 79, 84], t0, 0.06, (f) => bell(f, 2.4), 0.07, 0, 0.6);
  }
}

// ---------- downloaded sound effects (optional) ----------
// Drop files into promo/audio/sfx/ named by kind: whoosh-1.mp3, whoosh-2.wav, impact.mp3, pop.mp3,
// click.mp3, chime.mp3, ding.mp3. Any kind with files replaces the synthesised sound; several files
// of one kind take turns. Whooshes and impacts are lined up on their loudest moment.
const LIB = {}, turn = {};
if (existsSync(join(here, 'sfx'))) for (const f of readdirSync(join(here, 'sfx')).sort()) {
  const m = f.match(/^(whoosh|impact|pop|click|chime|ding)\b.*\.(mp3|wav|ogg|m4a|flac|aiff?)$/i); if (!m) continue;
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', join(here, 'sfx', f), '-af', 'silenceremove=start_periods=1:start_threshold=-50dB', '-t', '3', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const a = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  let pk = 0, pi = 0, envv = 0; for (let i = 0; i < a.length; i++) { envv = Math.max(Math.abs(a[i]), envv * 0.9995); if (envv > pk) { pk = envv; pi = i; } }
  for (let i = 0; i < a.length; i++) a[i] = a[i] / (pk || 1) * Math.min(1, (a.length - i) / (0.15 * SR));
  (LIB[m[1].toLowerCase()] ||= []).push({ a, peak: pi / SR, file: f });
}
console.log('sound files:', Object.keys(LIB).length ? Object.entries(LIB).map(([k, l]) => `${k} x${l.length}`).join(', ') : 'none, all synthesised');
// play kind at t; peakAt: when the loudest moment should land (whooshes: mid-transition)
function fx(kind, t, synth, gain, pan = 0, { fileGain = gain, peakAt = null, send = 0 } = {}) {
  const l = LIB[kind];
  if (!l) return put(sfx, t, synth(), gain, pan, send);
  const s = l[(turn[kind] = (turn[kind] ?? -1) + 1) % l.length];
  put(sfx, peakAt == null ? t : peakAt - s.peak, s.a, fileGain, pan, send);
}
const swoosh = (t, dur, gain, pan, big = false) => fx('whoosh', t, () => whoosh(dur), gain, pan, { fileGain: big ? 0.32 : 0.2, peakAt: t + dur * 0.5 });

// ---------- sound effects on the shared events ----------
EV.dishPop.forEach((t, i) => fx('pop', t, pop, 0.22, -0.6 + i * 0.17, { fileGain: 0.2 }));
put(sfx, EV.organiser, marimba(hz(79), 0.8), 0.18, 0.1, 0.3);
EV.ask.forEach((a, i) => { fx('pop', a.pop, pop, 0.18, -0.4 + i * 0.25, { fileGain: 0.18 }); put(sfx, a.check, marimba(hz(84), 0.5), 0.14, 0, 0.2); });
// the phone changing hands: a soft swish each time, a light tap as it lands (quieter for the quick ones)
EV.pass.forEach((h) => { const pan = Math.max(-0.6, Math.min(0.6, (h.to - h.from) * 0.12));
  put(sfx, h.t0, whoosh(h.fast ? 0.22 : 0.42), h.fast ? 0.05 : 0.1, pan, 0.1);
  put(sfx, h.t1 - 0.01, click(), h.fast ? 0.06 : 0.12, pan); });
swoosh(EV.byhandIn, 0.55, 0.22, 0);
EV.orders.forEach((t, i) => LIB.ding ? fx('ding', t, null, 0, -0.3 + i * 0.15, { fileGain: 0.18 }) : chord([88, 93], t, 0.07, (f) => bell(f, 0.6), 0.07, -0.3 + i * 0.15, 0.2));
swoosh(EV.clockIn, 0.5, 0.2, 0.2);
for (let q = 0; q <= 11; q++) { // fast clock ticks as the hands run from 12:00 to 2:45
  const x = q / 11, e = x < 0.5 ? Math.asin(2 * x) / Math.PI : 1 - Math.asin(2 - 2 * x) / Math.PI;
  put(sfx, EV.spin[0] + e * (EV.spin[1] - EV.spin[0]), tick(q % 2 ? 1250 : 1650), 0.16, 0);
}
put(sfx, EV.hours, bass(hz(33), 1.2), 0.25);
swoosh(EV.diagramIn, 0.45, 0.16, -0.2);
EV.box.forEach((t, i) => fx('pop', t, pop, 0.15, -0.5 + i * 0.33, { fileGain: 0.15 }));
put(sfx, EV.bottleneck, bass(hz(40), 0.8), 0.18);
swoosh(EV.panelIn[0], 0.7, 0.26, 0, true);
if (LIB.impact) fx('impact', EV.titleChime, null, 0, 0, { fileGain: 0.3, peakAt: EV.titleChime });
swoosh(EV.panelOut[0], 0.55, 0.2, 0.3);
swoosh(EV.toOrder, 0.4, 0.13, 0.3);
swoosh(EV.toBot, 0.4, 0.13, 0.3);
fx('click', EV.pickClick, click, 0.25, 0.3, { fileGain: 0.3 });
LIB.chime ? fx('chime', EV.placed, null, 0, 0, { fileGain: 0.3 }) : chord([84, 88, 91, 96], EV.placed, 0.07, (f) => bell(f, 1.8), 0.08, 0, 0.5);
swoosh(EV.resultIn, 0.6, 0.2, -0.2, true);
put(sfx, EV.strike, bass(hz(38), 0.6), 0.16);
EV.after.forEach((t, i) => fx('pop', t, pop, 0.15, -0.3 + i * 0.3, { fileGain: 0.15 }));
LIB.chime ? fx('chime', EV.fiveMin, null, 0, 0, { fileGain: 0.3 }) : chord([79, 84, 88, 91], EV.fiveMin, 0.06, (f) => bell(f, 1.6), 0.08, 0, 0.5);
swoosh(EV.soonIn, 0.55, 0.2, 0.3);
EV.menuRows.forEach((t, i) => fx('pop', t, pop, 0.14, 0.2 + i * 0.1, { fileGain: 0.14 }));
put(sfx, EV.localTag, marimba(hz(88), 0.7), 0.16, 0.3, 0.3);
swoosh(EV.endIn, 0.6, 0.2, 0, true);

// ---------- reverb on the send bus (Schroeder) ----------
function reverb(x, off) {
  const y = new Float32Array(N);
  for (const [d0, fb] of [[1557, 0.8], [1617, 0.79], [1491, 0.81], [1422, 0.78]]) {
    const d = d0 + off, buf = new Float32Array(d); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const o = buf[idx]; lp = o * 0.75 + lp * 0.25; buf[idx] = x[i] + lp * fb; idx = (idx + 1) % d; y[i] += o * 0.25; }
  }
  for (const d0 of [225, 556]) { const d = d0 + off, buf = new Float32Array(d); let idx = 0; for (let i = 0; i < N; i++) { const b = buf[idx]; const v = y[i] + b * 0.5; buf[idx] = v; y[i] = b - v * 0.5; idx = (idx + 1) % d; } }
  return y;
}
const wet = [reverb(verb[0], 0), reverb(verb[1], 23)];

// ---------- voice ----------
const vo = new Float32Array(N);
for (const [id, c] of Object.entries(TL.cues)) {
  const b = readFileSync(join(here, 'vo', `${id}.wav`)); let o = 12;
  while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const len = b.readUInt32LE(o + 4) / 2, i0 = Math.round(c.s * SR);
  for (let i = 0; i < len; i++) if (i0 + i < N) vo[i0 + i] += b.readInt16LE(o + 8 + i * 2) / 32768;
}
// ducking: music dips while anyone speaks
const duck = new Float32Array(N); let g = 1;
const speaking = (t) => Object.values(TL.cues).some((c) => t > c.s - 0.15 && t < c.e + 0.2);
for (let i = 0; i < N; i++) { const target = speaking(i / SR) ? 0.16 : 1; g += (target - g) * (target < g ? 1 / (0.08 * SR) : 1 / (0.45 * SR)); duck[i] = g; }

// ---------- mix ----------
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
const fadeIn = 0.4 * SR, fadeOut = 1.4 * SR;
for (let i = 0; i < N; i++) {
  const master = Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  for (let ch = 0; ch < 2; ch++) {
    let v = (music[ch][i] * 0.9 + wet[ch][i] * 0.45) * duck[i] * 0.85 + sfx[ch][i] * 0.9 + vo[i] * 0.95;
    v = Math.tanh(v * master * 1.1) / 1.1;
    out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + (i * 2 + ch) * 2);
  }
}
writeFileSync(join(here, 'mix.wav'), out);
// balance report: voice vs music while speaking, music alone between lines
{ let vS = 0, mS = 0, nS = 0, mQ = 0, nQ = 0, sx = 0;
  for (let i = 0; i < N; i += 4) { const m = ((music[0][i] * 0.9 + wet[0][i] * 0.45) * duck[i] * 0.85); const sp = speaking(i / SR);
    if (sp) { vS += vo[i] ** 2; mS += m * m; nS++; } else { mQ += m * m; nQ++; } sx += sfx[0][i] ** 2; }
  const db = (x) => (10 * Math.log10(x)).toFixed(1);
  console.log(`while speaking: voice ${db(vS / nS)} dB, music ${db(mS / nS)} dB | between lines: music ${db(mQ / nQ)} dB | effects ${db(sx / (N / 4))} dB`); }
console.log('wrote promo/audio/mix.wav');
