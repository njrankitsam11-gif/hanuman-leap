/**
 * Web Audio synthesis — no audio files. The context is created inside the first user
 * gesture (`unlockAudio`) because browsers refuse to start it otherwise; every call
 * before that is a silent no-op, as is everything on the server.
 */

export type SfxName = "flap" | "pass" | "collect" | "hit" | "shrink" | "chapter" | "win" | "fire";
export type AmbienceName = "fire" | null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let ambience: { name: AmbienceName; stop: () => void } = { name: null, stop: () => {} };
let muted = false;
let lastFlap = 0;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02);
}

export const isMuted = () => muted;

/** One second of white noise, shared by every noisy sound. */
function noiseBuffer(ac: AudioContext) {
  if (noise) return noise;
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function env(ac: AudioContext, peak: number, attack: number, decay: number, t0: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  return g;
}

function tone(
  ac: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  f0: number,
  f1: number,
  t0: number,
  dur: number,
  peak: number,
) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = env(ac, peak, 0.008, dur, t0);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(
  ac: AudioContext,
  out: AudioNode,
  t0: number,
  dur: number,
  peak: number,
  filter: { type: BiquadFilterType; f0: number; f1: number; q?: number },
) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const bq = ac.createBiquadFilter();
  bq.type = filter.type;
  bq.Q.value = filter.q ?? 1;
  bq.frequency.setValueAtTime(filter.f0, t0);
  bq.frequency.exponentialRampToValueAtTime(filter.f1, t0 + dur);
  const g = env(ac, peak, 0.005, dur, t0);
  src.connect(bq).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** Simple FM bell. */
function bell(ac: AudioContext, out: AudioNode, f: number, t0: number, dur: number, peak: number) {
  const car = ac.createOscillator();
  const mod = ac.createOscillator();
  const modGain = ac.createGain();
  car.frequency.value = f;
  mod.frequency.value = f * 1.4;
  modGain.gain.setValueAtTime(f * 1.2, t0);
  modGain.gain.exponentialRampToValueAtTime(1, t0 + dur);
  mod.connect(modGain).connect(car.frequency);
  const g = env(ac, peak, 0.005, dur, t0);
  car.connect(g).connect(out);
  mod.start(t0);
  car.start(t0);
  mod.stop(t0 + dur + 0.1);
  car.stop(t0 + dur + 0.1);
}

export function playSfx(name: SfxName) {
  if (!ctx || !master || muted || ctx.state !== "running") return;
  const ac = ctx;
  const out = master;
  const t = ac.currentTime;
  switch (name) {
    case "flap": {
      // rate-limit so held keys / double taps don't stack
      if (t - lastFlap < 0.05) return;
      lastFlap = t;
      noiseBurst(ac, out, t, 0.12, 0.22, { type: "bandpass", f0: 900, f1: 300, q: 0.8 });
      tone(ac, out, "sine", 520, 320, t, 0.1, 0.06);
      return;
    }
    case "pass":
      tone(ac, out, "triangle", 659, 659, t, 0.08, 0.12);
      tone(ac, out, "triangle", 880, 880, t + 0.08, 0.1, 0.12);
      return;
    case "collect":
      for (const [i, f] of [1200, 1600, 2000].entries()) {
        tone(ac, out, "sine", f, f, t + i * 0.07, 0.12, 0.1);
      }
      return;
    case "hit":
      tone(ac, out, "sine", 90, 40, t, 0.25, 0.4);
      noiseBurst(ac, out, t, 0.2, 0.25, { type: "lowpass", f0: 1200, f1: 200 });
      return;
    case "shrink":
      tone(ac, out, "sine", 800, 200, t, 0.25, 0.1);
      return;
    case "chapter":
      bell(ac, out, 880, t, 1.5, 0.25);
      bell(ac, out, 1320, t + 0.25, 1.2, 0.12);
      return;
    case "win": {
      const delay = ac.createDelay(0.5);
      delay.delayTime.value = 0.28;
      const fb = ac.createGain();
      fb.gain.value = 0.35;
      delay.connect(fb).connect(delay);
      delay.connect(out);
      for (const [i, f] of [523, 659, 784, 1047, 1318].entries()) {
        tone(ac, delay, "triangle", f, f, t + i * 0.13, 0.5, 0.14);
        tone(ac, out, "triangle", f, f, t + i * 0.13, 0.5, 0.14);
      }
      bell(ac, out, 1047, t + 0.7, 2.2, 0.2);
      return;
    }
    case "fire":
      noiseBurst(ac, out, t, 0.5, 0.15, { type: "lowpass", f0: 800, f1: 300 });
      return;
  }
}

/** Looped background texture; only Lanka Dahan uses one (brown-noise fire). */
export function setAmbience(name: AmbienceName) {
  if (ambience.name === name) return;
  ambience.stop();
  ambience = { name, stop: () => {} };
  if (!ctx || !master || name === null) return;
  const ac = ctx;
  const src = ac.createBufferSource();
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // leaky integrator: white → brown
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  src.buffer = buf;
  src.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 1.5);
  src.connect(lp).connect(g).connect(master);
  src.start();
  ambience.stop = () => {
    g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.3);
    src.stop(ac.currentTime + 1.2);
  };
}
