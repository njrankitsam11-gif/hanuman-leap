import type { Chapter, ChapterId } from "./chapters/types";
import { targetPasses } from "./chapters";
import type { Viewport, World } from "./types";

/** Chapter-wide hooks; obstacle-level behaviour lives in obstacles/registry.ts. */
export interface ChapterMechanic {
  onEnter?: (world: World, vp: Viewport, ch: Chapter) => void;
  onUpdate?: (world: World, vp: Viewport, ch: Chapter, dt: number) => void;
}

export const DAHAN_RAMP = 0.25;

const dahan: ChapterMechanic = {
  onEnter: (world) => {
    world.tailFire = true;
  },
  onUpdate: (world, _vp, ch) => {
    world.speedRamp = 1 + DAHAN_RAMP * Math.min(1, world.passes / targetPasses(ch));
  },
};

const homeward: ChapterMechanic = {
  onEnter: (world) => {
    world.dir = -1;
  },
};

/** Endless: scroll speed climbs to ×(1 + ENDLESS_RAMP) over ENDLESS_RAMP_PASSES passes. */
export const ENDLESS_RAMP = 0.6;
export const ENDLESS_RAMP_PASSES = 60;

const endless: ChapterMechanic = {
  onUpdate: (world) => {
    world.speedRamp = 1 + ENDLESS_RAMP * Math.min(1, world.passes / ENDLESS_RAMP_PASSES);
  },
};

export const MECHANICS: Partial<Record<ChapterId, ChapterMechanic>> = {
  dahan,
  return: homeward,
  endless,
};

/** Baseline every chapter starts from before its own hook runs. */
export function resetChapterEffects(world: World) {
  world.tailFire = false;
  world.dir = 1;
  world.speedRamp = 1;
  world.heroScale = 1;
  world.gravityMul = 1;
}
