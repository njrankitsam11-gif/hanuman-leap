import type { ObstacleKindId } from "./chapters/types";

export type Obstacle = {
  x: number;
  /** Column width; bosses are wider. */
  w: number;
  gapY: number;
  gapH: number;
  kind: ObstacleKindId;
  passed: boolean;
  baseGapY: number;
  baseGapH: number;
  phase: number;
  // --- per-kind mechanic state (see obstacles/registry.ts) ---
  /** Mainaka: bonus already collected. */
  touched?: boolean;
  /** Mainaka: seconds since it began rising. */
  riseT?: number;
  /** Mainaka: y of the peak once fully risen. */
  targetPeakY?: number;
  /** Simhika: hero is currently inside her shadow band. */
  shadowing?: boolean;
};

/**
 * Logical drawing space plus the CSS box it is shown in. `w`/`h` are what the
 * engine and renderer think in; `cssW`/`cssH` are what the canvas element measures.
 */
export type Viewport = {
  w: number;
  h: number;
  cssW: number;
  cssH: number;
  dpr: number;
  portrait: boolean;
  /** Hero's fixed x (·W). */
  heroX: number;
  /** Sea strip height along the bottom edge. */
  seaH: number;
  /** Horizontal speed multiplier (1 in landscape, < 1 in portrait). */
  speedMul: number;
};

/** "run" is normal play; "finale" is the closing glide/scene; "frozen" is between chapters. */
export type WorldPhase = "run" | "finale" | "frozen";

export type World = {
  y: number;
  vy: number;
  t: number;
  scroll: number;
  spawnTimer: number;
  obstacles: Obstacle[];
  running: boolean;
  phase: WorldPhase;
  finaleT: number;
  /** Chapter index into CHAPTERS. */
  chapter: number;
  /** Passes in the current chapter. */
  passes: number;
  /** Passes across the whole run. */
  leaps: number;
  punya: number;
  /** Punya to revert to when the chapter is retried. */
  punyaAtChapterStart: number;
  bossSpawned: boolean;
  bossPassed: boolean;
  deaths: number;
  /** Hitbox multiplier this step (Surasa shrinks it). Reset to 1 every step. */
  heroScale: number;
  /** Gravity multiplier this step (Simhika's shadow pulls). Reset to 1 every step. */
  gravityMul: number;
  /** Lanka Dahan: the tail burns. */
  tailFire: boolean;
  /** 1 flying toward Lanka, −1 flying home (renderer mirrors the world). */
  dir: 1 | -1;
  /** Chapter-driven speed ramp (Dahan accelerates). */
  speedRamp: number;
  /** Injectable for deterministic tests; Math.random in production. */
  rng: () => number;
};

/** Edge-triggered input: `flap` is true only on the substep a flap was requested. */
export type Input = { flap: boolean };

export type GameEvent =
  | { type: "pass"; passes: number; punya: number; kind: ObstacleKindId }
  | { type: "collect"; punya: number }
  | { type: "hit"; punya: number }
  | { type: "finale"; chapter: number }
  | { type: "chapterClear"; chapter: number; punya: number }
  | { type: "won"; punya: number; deaths: number };

export type Assets = {
  hero: HTMLImageElement;
  bg: HTMLImageElement;
};
