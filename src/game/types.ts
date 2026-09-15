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

/** Logical drawing space. Phase 0 is fixed; Phase 1 derives it from the container. */
export type Viewport = {
  w: number;
  h: number;
  dpr: number;
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

/** Edge-triggered input: `flap` is true only on the frame a flap was requested. */
export type Input = { flap: boolean };

export type GameEvent =
  { type: "pass"; leaps: number; score: number; level: number } | { type: "hit"; score: number };

export type Assets = {
  hero: HTMLImageElement;
  bg: HTMLImageElement;
};
