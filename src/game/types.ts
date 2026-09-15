import type { ObstacleKindId } from "./chapters/types";

export type Obstacle = {
  x: number;
  gapY: number;
  gapH: number;
  kind: ObstacleKindId;
  passed: boolean;
  baseGapY: number;
  phase: number;
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
  /** Injectable for deterministic tests; Math.random in production. */
  rng: () => number;
};

/** Edge-triggered input: `flap` is true only on the substep a flap was requested. */
export type Input = { flap: boolean };

export type GameEvent =
  | { type: "pass"; passes: number; punya: number; kind: ObstacleKindId }
  | { type: "hit"; punya: number }
  | { type: "finale"; chapter: number }
  | { type: "chapterClear"; chapter: number; punya: number }
  | { type: "won"; punya: number; deaths: number };

export type Assets = {
  hero: HTMLImageElement;
  bg: HTMLImageElement;
};
