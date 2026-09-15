/** Phase 1 stub. Phase 4 replaces the bodies with Web Audio synthesis. */

export type SfxName = "flap" | "pass" | "collect" | "hit" | "shrink" | "chapter" | "win" | "fire";

let muted = false;

/** Create/resume the AudioContext from inside a user gesture. */
export function unlockAudio() {}

export function playSfx(_name: SfxName) {
  if (muted) return;
}

export function setMuted(m: boolean) {
  muted = m;
}

export const isMuted = () => muted;
