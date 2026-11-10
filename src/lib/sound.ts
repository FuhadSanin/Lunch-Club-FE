// Sounds for the two big moments: picks locking (a padlock snapping shut) and the order going out (a
// till's "ka-ching" with coins dropping into the drawer). They are built with the Web Audio API from
// the same parts a foley artist layers: a click is a burst of filtered noise, metal is a few
// inharmonic partials ringing down, weight is a short falling sine, a bell is frequency modulation.
// Nothing to download, so they play the instant they're asked for.
//
// Everything runs through one bus: a small room so the sounds don't sit dry in your ear, then a
// compressor and a soft limiter that make them as loud as a phone's notification without clipping.
//
// Browsers only play audio after the person has interacted with the page; both moments follow a
// click. Off when the person turns sounds off in Settings (`lunchboard-sound` = "off").

export type SoundKind = 'lock' | 'money' | 'saved' | 'doorbell' | 'cheer' | 'start' | 'served';

type Ac = BaseAudioContext;
type Bus = { dry: AudioNode; room: AudioNode };
type Place = { gain: number; wet?: number; pan?: number };

const LOUDNESS = 1.0; // into the limiter: loud and full, with only the sharpest peaks rounded off

// ---------- settings ----------

export const soundOn = () => {
  try {
    return window.localStorage.getItem('lunchboard-sound') !== 'off';
  } catch {
    return true;
  }
};

export const setSoundOn = (on: boolean) => {
  try {
    window.localStorage.setItem('lunchboard-sound', on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
};

// ---------- the engine ----------

let ctx: AudioContext | null = null;
const audio = () => {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: 'interactive' });
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

// Wake the audio engine on the first press anywhere, so the first sound isn't lost while it starts.
if (typeof window !== 'undefined')
  window.addEventListener('pointerdown', () => soundOn() && audio(), { once: true, capture: true });

// The same "random" on every play, so each sound is always exactly the same sound.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const noises = new WeakMap<Ac, AudioBuffer>();
function noiseOf(ac: Ac) {
  let buffer = noises.get(ac);
  if (!buffer) {
    buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seeded(7);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
    noises.set(ac, buffer);
  }
  return buffer;
}

// A small bright room: half a second of decaying noise, a little different in each ear.
function roomOf(ac: Ac) {
  const length = Math.floor(ac.sampleRate * 0.5);
  const ir = ac.createBuffer(2, length, ac.sampleRate);
  const random = seeded(11);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / ac.sampleRate;
      data[i] = (random() * 2 - 1) * Math.exp(-t * 10) * Math.min(1, t / 0.003);
    }
  }
  return ir;
}

// Rounds peaks off smoothly instead of clipping them.
function limiterCurve() {
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(1.5 * x) / Math.tanh(1.5);
  }
  return curve;
}

const buses = new WeakMap<Ac, Bus>();
function busOf(ac: Ac): Bus {
  let bus = buses.get(ac);
  if (bus) return bus;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.18;
  const drive = ac.createGain();
  drive.gain.value = LOUDNESS;
  const limiter = ac.createWaveShaper();
  limiter.curve = limiterCurve();
  limiter.oversample = '4x';
  const master = ac.createGain();
  master.gain.value = 0.84; // the ceiling: peaks land near -1.5 dBFS, with room for the peaks between samples
  comp.connect(drive).connect(limiter).connect(master).connect(ac.destination);

  const dry = ac.createGain();
  dry.connect(comp);
  const room = ac.createConvolver();
  room.buffer = roomOf(ac);
  const roomLevel = ac.createGain();
  roomLevel.gain.value = 0.55;
  room.connect(roomLevel).connect(comp);
  bus = { dry, room };
  buses.set(ac, bus);
  return bus;
}

// The sound being scheduled right now, with its own level into the shared bus. Scheduling is
// synchronous, so every part of one sound lands on it.
let voice: Bus | null = null;

function voiceOf(ac: Ac, level: number): Bus {
  const bus = busOf(ac);
  const dry = ac.createGain();
  dry.gain.value = level;
  dry.connect(bus.dry);
  const room = ac.createGain();
  room.gain.value = level;
  room.connect(bus.room);
  return { dry, room };
}

function send(ac: Ac, node: AudioNode, { wet = 0, pan = 0 }: Place) {
  const bus = voice ?? busOf(ac);
  let last = node;
  if (pan) {
    const panner = ac.createStereoPanner();
    panner.pan.value = pan;
    last = node.connect(panner);
  }
  last.connect(bus.dry);
  if (wet) {
    const level = ac.createGain();
    level.gain.value = wet;
    last.connect(level).connect(bus.room);
  }
}

// ---------- the parts ----------

// A contact: a burst of noise through a filter. Short and high for a tick, longer and lower for a clunk.
function burst(ac: Ac, at: number, o: Place & { freq: number; dur: number; q?: number; type?: BiquadFilterType }) {
  const src = ac.createBufferSource();
  src.buffer = noiseOf(ac);
  const filter = ac.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.value = o.freq;
  filter.Q.value = o.q ?? 1;
  const env = ac.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(o.gain, at + 0.0012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  src.connect(filter).connect(env);
  send(ac, env, o);
  src.start(at, (at * 0.37) % 0.5, o.dur + 0.05);
}

// Metal: one partial of struck steel or brass, ringing down.
function ring(ac: Ac, at: number, o: Place & { freq: number; decay: number }) {
  const osc = ac.createOscillator();
  osc.frequency.value = o.freq;
  const env = ac.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(o.gain, at + 0.0008);
  env.gain.exponentialRampToValueAtTime(0.0001, at + o.decay);
  osc.connect(env);
  send(ac, env, o);
  osc.start(at);
  osc.stop(at + o.decay + 0.05);
}

// Weight: a low sine falling in pitch, the body of a knock.
function thump(ac: Ac, at: number, o: Place & { from: number; to: number; dur: number }) {
  const osc = ac.createOscillator();
  osc.frequency.setValueAtTime(o.from, at);
  osc.frequency.exponentialRampToValueAtTime(o.to, at + o.dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(o.gain, at + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  osc.connect(env);
  send(ac, env, o);
  osc.start(at);
  osc.stop(at + o.dur + 0.05);
}

// A bell, by frequency modulation at an inharmonic ratio (Chowning's bell): the strike is bright and
// clangy, and as the modulation dies away it settles into a clear ring.
function bell(ac: Ac, at: number, o: Place & { freq: number; decay: number; ratio: number; index: number }) {
  const carrier = ac.createOscillator();
  carrier.frequency.value = o.freq;
  const modulator = ac.createOscillator();
  const mf = o.freq * o.ratio;
  modulator.frequency.value = mf;
  const depth = ac.createGain();
  depth.gain.setValueAtTime(o.index * mf, at);
  depth.gain.exponentialRampToValueAtTime(o.index * mf * 0.015, at + o.decay * 0.45);
  modulator.connect(depth).connect(carrier.frequency);
  const env = ac.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(o.gain, at + 0.0015);
  env.gain.exponentialRampToValueAtTime(o.gain * 0.35, at + 0.12);
  env.gain.exponentialRampToValueAtTime(0.0001, at + o.decay);
  carrier.connect(env);
  send(ac, env, o);
  for (const osc of [carrier, modulator]) {
    osc.start(at);
    osc.stop(at + o.decay + 0.05);
  }
}

// ---------- the sounds ----------

// A padlock: the shackle's tip touches the body ("t"), then snaps home ("CLACK") with a short steel
// ring and the weight of the lock under it, and the spring settles.
function lock(ac: Ac, t: number) {
  burst(ac, t, { type: 'highpass', freq: 5200, dur: 0.008, gain: 0.9 });
  ring(ac, t, { freq: 6150, decay: 0.03, gain: 0.07 });

  const snap = t + 0.045;
  burst(ac, snap, { freq: 2900, q: 0.7, dur: 0.03, gain: 2.6, wet: 0.15 });
  burst(ac, snap, { freq: 1050, q: 1, dur: 0.05, gain: 1.6, wet: 0.1 }); // the body's "chunk"
  burst(ac, snap, { type: 'highpass', freq: 7000, dur: 0.006, gain: 1.1 });
  ring(ac, snap, { freq: 2180, decay: 0.24, gain: 0.42, wet: 0.25 });
  ring(ac, snap, { freq: 3540, decay: 0.16, gain: 0.3, wet: 0.25 });
  ring(ac, snap, { freq: 5310, decay: 0.09, gain: 0.18, wet: 0.25 });
  ring(ac, snap, { freq: 7390, decay: 0.05, gain: 0.09 });
  thump(ac, snap, { from: 260, to: 70, dur: 0.12, gain: 1.2 });

  burst(ac, snap + 0.055, { freq: 4300, q: 2.5, dur: 0.014, gain: 0.45 });
}

// A till's "ka-ching": the key goes down and the drawer's catch lets go (ka), the drawer runs out on
// its rollers, the bell rings (ching), and a handful of coins drop into the drawer and settle.
function money(ac: Ac, t: number) {
  const random = seeded(42);

  // Ka.
  burst(ac, t, { freq: 3600, q: 1.1, dur: 0.03, gain: 1.6 });
  thump(ac, t, { from: 200, to: 80, dur: 0.06, gain: 0.5 });
  burst(ac, t + 0.065, { freq: 2100, q: 0.8, dur: 0.05, gain: 2.2, wet: 0.15 });
  thump(ac, t + 0.065, { from: 140, to: 55, dur: 0.13, gain: 0.95 });

  // The drawer rolling out.
  const roll = ac.createBufferSource();
  roll.buffer = noiseOf(ac);
  const rollFilter = ac.createBiquadFilter();
  rollFilter.type = 'bandpass';
  rollFilter.Q.value = 1.6;
  rollFilter.frequency.setValueAtTime(700, t + 0.075);
  rollFilter.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
  const rollEnv = ac.createGain();
  rollEnv.gain.setValueAtTime(0, t + 0.075);
  rollEnv.gain.linearRampToValueAtTime(0.5, t + 0.1);
  rollEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  roll.connect(rollFilter).connect(rollEnv);
  send(ac, rollEnv, { gain: 1, wet: 0.2 });
  roll.start(t + 0.075, 0.3, 0.3);

  // Ching: the bell and its twin a hair apart, so the ring shimmers, with the hammer's tick on top.
  const ching = t + 0.08;
  bell(ac, ching, { freq: 2349, ratio: 2.76, index: 2.2, decay: 1.8, gain: 0.5, wet: 0.35, pan: -0.1 });
  bell(ac, ching + 0.004, { freq: 2358, ratio: 2.76, index: 1.8, decay: 1.6, gain: 0.36, wet: 0.35, pan: 0.1 });
  ring(ac, ching, { freq: 2349 * 2.32, decay: 0.8, gain: 0.14, wet: 0.3 });
  ring(ac, ching, { freq: 2349 * 4.25, decay: 0.4, gain: 0.07, wet: 0.3 });
  burst(ac, ching, { type: 'highpass', freq: 5000, dur: 0.012, gain: 0.9 });

  // Coins dropping in, closer together and quieter as they settle.
  const gaps = [0, 0.055, 0.04, 0.07, 0.03, 0.045, 0.025, 0.06, 0.02, 0.035, 0.05];
  let at = ching + 0.15;
  gaps.forEach((gap, i) => {
    at += gap;
    const freq = 3600 + random() * 2600;
    const level = 0.26 * (1 - (i / gaps.length) * 0.7);
    const pan = (random() - 0.5) * 0.9;
    burst(ac, at, { type: 'highpass', freq: 6000, dur: 0.006, gain: level * 3, pan });
    ring(ac, at, { freq, decay: 0.09 + random() * 0.12, gain: level, wet: 0.4, pan });
    ring(ac, at, { freq: freq * 1.53, decay: 0.06 + random() * 0.06, gain: level * 0.55, wet: 0.4, pan });
    ring(ac, at, { freq: freq * 2.41, decay: 0.045, gain: level * 0.3, wet: 0.4, pan });
  });
}

// A pick saved: a soft pop as it lands on the board, then two bright notes rising (E6 to B6), short
// and light so it never competes with the till.
function saved(ac: Ac, t: number) {
  burst(ac, t, { freq: 1800, q: 0.9, dur: 0.035, gain: 0.9 });
  thump(ac, t, { from: 420, to: 160, dur: 0.07, gain: 0.55 });
  bell(ac, t + 0.03, { freq: 1318.5, ratio: 2.76, index: 1.2, decay: 0.55, gain: 0.42, wet: 0.3, pan: -0.08 });
  bell(ac, t + 0.12, { freq: 1975.5, ratio: 2.76, index: 1.2, decay: 0.85, gain: 0.46, wet: 0.35, pan: 0.08 });
}

// A soft mallet note, like a marimba bar: a warm fundamental, its bright fourth harmonic dying fast,
// and the tick of the mallet.
function marimba(ac: Ac, at: number, freq: number, gain: number, pan = 0) {
  burst(ac, at, { freq: Math.min(freq * 6, 8000), q: 1.5, dur: 0.012, gain: gain * 0.9, pan });
  ring(ac, at, { freq, decay: 1.1, gain, wet: 0.35, pan });
  ring(ac, at, { freq: freq * 4, decay: 0.18, gain: gain * 0.35, wet: 0.25, pan });
  ring(ac, at, { freq: freq * 10, decay: 0.05, gain: gain * 0.12, pan });
}

// A lunch has started: a warm rising marimba call (G5, C6, then E6 over a soft C chord) to bring
// everyone in.
function start(ac: Ac, t: number) {
  marimba(ac, t, 784, 0.42, -0.15);
  marimba(ac, t + 0.12, 1046.5, 0.42, 0.05);
  marimba(ac, t + 0.24, 1318.5, 0.46, 0.15);
  for (const freq of [261.6, 329.6, 392]) bell(ac, t + 0.24, { freq, ratio: 2, index: 0.4, decay: 1.6, gain: 0.08, wet: 0.5 });
}

// Everyone has their lunch: two glasses touching (a bright inharmonic clink, twice), then a low,
// soft chime under them.
function served(ac: Ac, t: number) {
  for (const [at, base, pan] of [[t, 2380, -0.2], [t + 0.16, 2710, 0.2]] as const) {
    burst(ac, at, { type: 'highpass', freq: 6000, dur: 0.005, gain: 0.6, pan });
    ring(ac, at, { freq: base, decay: 0.7, gain: 0.26, wet: 0.45, pan });
    ring(ac, at, { freq: base * 2.32, decay: 0.4, gain: 0.12, wet: 0.45, pan });
    ring(ac, at, { freq: base * 4.25, decay: 0.2, gain: 0.05, wet: 0.4, pan });
  }
  bell(ac, t + 0.3, { freq: 523.3, ratio: 2, index: 0.8, decay: 1.4, gain: 0.3, wet: 0.45 });
  bell(ac, t + 0.3, { freq: 784, ratio: 2, index: 0.6, decay: 1.2, gain: 0.18, wet: 0.45 });
}

// The food is here: a doorbell's ding-dong (E5 then C5), each strike a warm bell with a long ring.
function doorbell(ac: Ac, t: number) {
  for (const [at, freq, pan] of [[t, 659.3, -0.12], [t + 0.42, 523.3, 0.12]] as const) {
    burst(ac, at, { type: 'highpass', freq: 3500, dur: 0.01, gain: 0.5, pan });
    bell(ac, at, { freq, ratio: 2, index: 1.4, decay: 1.6, gain: 0.55, wet: 0.4, pan });
    ring(ac, at, { freq: freq * 3, decay: 0.5, gain: 0.08, wet: 0.3, pan });
  }
}

// The lunch is done: a quick rising fanfare (C5 E5 G5 C6 E6) that lands on a ringing chord, with a few
// sparkles on top.
function cheer(ac: Ac, t: number) {
  const random = seeded(9);
  [523.3, 659.3, 784, 1046.5, 1318.5].forEach((freq, i) => {
    const at = t + i * 0.075;
    const last = i === 4;
    bell(ac, at, { freq, ratio: 2, index: 1, decay: last ? 1.5 : 0.5, gain: last ? 0.42 : 0.3, wet: 0.35, pan: (i - 2) * 0.12 });
  });
  for (const freq of [523.3, 784, 1046.5]) bell(ac, t + 0.3, { freq, ratio: 2, index: 0.6, decay: 1.4, gain: 0.16, wet: 0.4 });
  for (let i = 0; i < 7; i++) {
    const at = t + 0.32 + i * 0.07 + random() * 0.04;
    ring(ac, at, { freq: 3000 + random() * 3500, decay: 0.12, gain: 0.07, wet: 0.5, pan: (random() - 0.5) * 1.4 });
  }
}

// Schedules a sound on any audio context at `at` seconds: the page's own, or an offline one to
// render it to a file.
// A click is over in a blink, so the lock goes in hotter than the till to sound as loud. A saved pick
// happens often, so it sits a step under the till.
const LEVEL: Record<SoundKind, number> = { lock: 1.8, money: 1, saved: 0.6, doorbell: 0.9, cheer: 0.9, start: 1, served: 1 };

export function scheduleSound(ac: Ac, kind: SoundKind, at: number) {
  voice = voiceOf(ac, LEVEL[kind]);
  try {
    if (kind === 'lock') lock(ac, at);
    else if (kind === 'saved') saved(ac, at);
    else if (kind === 'doorbell') doorbell(ac, at);
    else if (kind === 'cheer') cheer(ac, at);
    else if (kind === 'start') start(ac, at);
    else if (kind === 'served') served(ac, at);
    else money(ac, at);
  } finally {
    voice = null;
  }
}

// `delay` in seconds lines the sound up with an animation. `force` plays it even with sounds off
// (the preview buttons in Settings).
export function playSound(kind: SoundKind, delay = 0, force = false) {
  if (!force && !soundOn()) return;
  const ac = audio();
  if (!ac) return;
  scheduleSound(ac, kind, ac.currentTime + 0.02 + delay);
}
