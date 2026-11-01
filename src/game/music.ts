/**
 * Background music, synthesized like the rest of the audio: a plucked tanpura drone
 * (Pa–Sa–Sa–low Sa) under a soft bansuri-like phrase in a pentatonic raga per chapter.
 * The tune tables and phrase generator are pure (tested); the Web Audio part rides on
 * `audio.ts`'s master bus, so the Sound switch silences music too.
 */
import { audioGraph, isMuted } from "./audio";
import type { ChapterId } from "./chapters/types";
import { hashSeed, mulberry32 } from "./rng";

export type Tune = {
  /** Sa, in Hz. */
  root: number;
  /** Semitone offsets from Sa (pentatonic ragas). */
  scale: readonly number[];
  /** Eighth notes per minute. */
  tempo: number;
};

const BHUPALI = [0, 2, 4, 7, 9]; // bright, morning
const DURGA = [0, 2, 5, 7, 9]; // open, striding
const MALKAUNS = [0, 3, 5, 8, 10]; // deep, night
const SHIVRANJANI = [0, 2, 3, 7, 9]; // longing, devotional

export const TUNES: Record<ChapterId, Tune> = {
  prelude: { root: 146.83, scale: BHUPALI, tempo: 150 },
  mainaka: { root: 146.83, scale: BHUPALI, tempo: 160 },
  surasa: { root: 138.59, scale: DURGA, tempo: 170 },
  simhika: { root: 130.81, scale: MALKAUNS, tempo: 170 },
  lankini: { root: 130.81, scale: MALKAUNS, tempo: 180 },
  vibhishana: { root: 138.59, scale: SHIVRANJANI, tempo: 150 },
  vatika: { root: 138.59, scale: SHIVRANJANI, tempo: 140 },
  vidhvans: { root: 146.83, scale: DURGA, tempo: 200 },
  dahan: { root: 130.81, scale: MALKAUNS, tempo: 210 },
  return: { root: 146.83, scale: BHUPALI, tempo: 190 },
  endless: { root: 146.83, scale: BHUPALI, tempo: 170 },
};

export type Note = { step: number; semis: number; len: number };

/** Steps in one loop: a 32-step phrase, then 32 steps of drone alone so it never nags. */
export const LOOP_STEPS = 64;
const PHRASE_STEPS = 32;

/**
 * One deterministic phrase per chapter: a stepwise walk over the scale (two octaves around
 * the middle Sa), the second half echoing the first with a varied tail, landing on Sa.
 */
export function phrase(id: ChapterId): Note[] {
  const { scale } = TUNES[id];
  const rnd = mulberry32(hashSeed(`hanuman-leap:music:${id}`));
  const n = scale.length;
  const toSemis = (deg: number) => {
    const oct = Math.floor(deg / n);
    return scale[((deg % n) + n) % n]! + 12 * oct;
  };
  const half: { step: number; deg: number; len: number }[] = [];
  let deg = n; // middle Sa
  let step = 0;
  while (step < PHRASE_STEPS / 2 - 2) {
    const len = rnd() < 0.3 ? 2 : rnd() < 0.15 ? 3 : 1;
    if (rnd() < 0.72) half.push({ step, deg, len });
    step += len;
    const move = Math.floor(rnd() * 5) - 2; // -2..2 scale steps
    deg = Math.max(n - 2, Math.min(2 * n + 2, deg + (move === 0 ? 1 : move)));
  }
  const tail = (from: number, end: number) => [
    { step: from, deg: end + 1, len: 1 },
    { step: from + 1, deg: end, len: 1 },
  ];
  const first = [...half, ...tail(PHRASE_STEPS / 2 - 2, n + 2)];
  const second = [
    ...half.slice(0, Math.max(1, half.length - 2)).map((x) => ({ ...x, step: x.step + 16 })),
    { step: PHRASE_STEPS - 3, deg: n + 1, len: 1 },
    { step: PHRASE_STEPS - 2, deg: n, len: 2 },
  ];
  return [...first, ...second].map((x) => ({
    step: x.step,
    semis: toSemis(x.deg) - 12,
    len: x.len,
  }));
}

/** Tanpura cycle, one pluck per beat (two steps): Pa, Sa', Sa', low Sa. */
export const TANPURA = [-5, 0, 0, -12] as const;

const hz = (root: number, semis: number) => root * 2 ** (semis / 12);

// --- Web Audio playback ---------------------------------------------------------------

const LOOKAHEAD = 0.25;
const TICK_MS = 60;
const MUSIC_LEVEL = 1;

let enabled = true;
let wanted: ChapterId | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let track: {
  id: ChapterId;
  bus: GainNode;
  notes: Map<number, Note>;
  step: number;
  next: number;
} | null = null;

function pluck(ac: AudioContext, out: AudioNode, f: number, t0: number) {
  // two slightly detuned saws through a closing lowpass ≈ a jivari-buzzy string
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.035, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 2;
  lp.frequency.setValueAtTime(f * 8, t0);
  lp.frequency.exponentialRampToValueAtTime(f * 2, t0 + 2);
  lp.connect(g).connect(out);
  for (const d of [-3, 3]) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = d;
    o.connect(lp);
    o.start(t0);
    o.stop(t0 + 2.7);
  }
}

function flute(ac: AudioContext, out: AudioNode, f: number, t0: number, dur: number) {
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.value = f;
  const vib = ac.createOscillator();
  const vibDepth = ac.createGain();
  vib.frequency.value = 5;
  vibDepth.gain.setValueAtTime(0, t0);
  vibDepth.gain.linearRampToValueAtTime(f * 0.006, t0 + dur * 0.6);
  vib.connect(vibDepth).connect(o.frequency);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.05);
  g.gain.setValueAtTime(0.05, t0 + Math.max(0.06, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.25);
  o.connect(g).connect(out);
  for (const x of [o, vib]) {
    x.start(t0);
    x.stop(t0 + dur + 0.3);
  }
}

function fadeOut(t: NonNullable<typeof track>, ac: AudioContext) {
  t.bus.gain.setTargetAtTime(0.0001, ac.currentTime, 0.35);
  const bus = t.bus;
  setTimeout(() => bus.disconnect(), 2500);
}

function tick() {
  const g = audioGraph();
  // muted keeps ticking (cheaply) so unmuting brings the music back on its own
  const target = enabled && !isMuted() ? wanted : null;
  if (g) schedule(g.ctx, g.master, target);
  if (!track && (!wanted || !enabled) && timer) {
    clearInterval(timer);
    timer = null;
  }
}

function schedule(ac: AudioContext, master: GainNode, target: ChapterId | null) {
  if (track && track.id !== target) {
    fadeOut(track, ac);
    track = null;
  }
  if (!target) return;
  if (!track) {
    const bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, ac.currentTime);
    bus.gain.exponentialRampToValueAtTime(MUSIC_LEVEL, ac.currentTime + 1.5);
    bus.connect(master);
    track = {
      id: target,
      bus,
      notes: new Map(phrase(target).map((n) => [n.step, n])),
      step: 0,
      next: ac.currentTime + 0.1,
    };
  }
  const { root, tempo } = TUNES[track.id];
  const stepDur = 60 / tempo;
  // after a suspended tab, skip ahead instead of firing a burst of stale notes
  if (track.next < ac.currentTime - 0.1) track.next = ac.currentTime + 0.05;
  while (track.next < ac.currentTime + LOOKAHEAD) {
    const s = track.step % LOOP_STEPS;
    if (s % 2 === 0) pluck(ac, track.bus, hz(root, TANPURA[(s / 2) % TANPURA.length]!), track.next);
    const note = s < PHRASE_STEPS ? track.notes.get(s) : undefined;
    if (note) flute(ac, track.bus, hz(root * 2, note.semis), track.next, note.len * stepDur);
    track.step++;
    track.next += stepDur;
  }
}

function ensureTimer() {
  if (timer || typeof window === "undefined") return;
  timer = setInterval(tick, TICK_MS);
  tick();
}

/** Play this chapter's music (crossfading from the last), or fade out with null. */
export function setMusic(id: ChapterId | null) {
  wanted = id;
  ensureTimer();
}

export function setMusicEnabled(on: boolean) {
  enabled = on;
  ensureTimer();
}

export const isMusicEnabled = () => enabled;
