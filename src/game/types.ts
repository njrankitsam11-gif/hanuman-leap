export type Kind = 0 | 1 | 2 | 3 | 4;

export type Obstacle = {
  x: number;
  gapY: number;
  gapH: number;
  kind: Kind;
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

export type World = {
  y: number;
  vy: number;
  t: number;
  scroll: number;
  spawnTimer: number;
  obstacles: Obstacle[];
  leaps: number;
  score: number;
  level: number;
  running: boolean;
  /** Injectable for deterministic tests; Math.random in production. */
  rng: () => number;
};

/** Edge-triggered input: `flap` is true only on the substep a flap was requested. */
export type Input = { flap: boolean };

export type GameEvent =
  { type: "pass"; leaps: number; score: number; level: number } | { type: "hit"; score: number };

export type Assets = {
  hero: HTMLImageElement;
  bg: HTMLImageElement;
};
