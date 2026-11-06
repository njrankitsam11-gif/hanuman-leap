import type { Chapter, ObstacleKindId } from "../chapters/types";
import { EASY_GAP_MUL, HERO_R, OB_W, SWAY_RATE } from "../constants";
import { KINDS } from "../kinds";
import type { Obstacle, Viewport, World } from "../types";

/** Hero hitbox: centre and AABB half-size (already scaled). */
export type Hitbox = { x: number; y: number; r: number };
export type CollideResult = "none" | "hit" | "collect" | "smash";

/**
 * Per-kind hooks the engine calls without knowing what the kind is. Everything is
 * optional; a kind with no entry is a plain lethal column.
 */
export interface ObstacleBehaviour {
  /** Adjust a freshly spawned obstacle (default column geometry is already set). */
  init?: (o: Obstacle, world: World, vp: Viewport, ch: Chapter) => void;
  /** Own motion each step (sway, rise, mouth shrink). */
  update?: (o: Obstacle, world: World, vp: Viewport, dt: number) => void;
  /** Change the hero for this step via `world.heroScale` / `world.gravityMul`. */
  affectHero?: (o: Obstacle, world: World, vp: Viewport) => void;
  /** Override the column collision. */
  collide?: (o: Obstacle, hero: Hitbox, vp: Viewport) => CollideResult;
  /** Extra punya on pass, beyond the chapter value and the kind bonus. */
  passBonus?: (o: Obstacle, world: World) => number;
}

export const COLLECT_PUNYA = 25;
export const SURASA_SHRINK_BONUS = 10;
export const SIMHIKA_SHADOW_BONUS = 15;

/** Surasa: her mouth closes to this fraction of its opening size as the hero arrives. */
export const SURASA_MOUTH_MIN = 0.7;
export const SURASA_MOUTH_MAX = 1.5;
/** Fraction of W over which the mouth closes. */
export const SURASA_APPROACH = 0.45;
export const SURASA_SWELL = 1.25;
export const SURASA_SHRINK = 0.5;

export const SIMHIKA_BAND = 60;
export const SIMHIKA_PULL = 1.6;

export const LANKINI_WIDTH_MUL = 1.6;
export const LANKINI_GAP = 0.3;

export const MAINAKA_PEAK_R = 30;
/** Vatika-vidhvans: punya for tearing down a vriksha (more than a pass is worth). */
export const SMASH_PUNYA = 30;
/** Meghnad's volley leaves a tighter opening than the chapter's gap. */
export const ASTRA_GAP_MUL = 0.85;
/** Painted doorways on a house, ·H from the column top / above the sea. */
export const HOUSE_DECOY_MARGIN = 0.06;
/** Gap multiplier for the current difficulty. */
export const gapMul = (world: World) => (world.easy ? EASY_GAP_MUL : 1);
export const MAINAKA_RISE_S = 1.0;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** Plain lethal column: hero AABB overlaps the column outside its gap. */
export function columnCollide(o: Obstacle, hero: Hitbox): CollideResult {
  const overlapX = hero.x + hero.r > o.x && hero.x - hero.r < o.x + o.w;
  if (!overlapX) return "none";
  return hero.y - hero.r < o.gapY || hero.y + hero.r > o.gapY + o.gapH ? "hit" : "none";
}

/** Kinds with a sway amplitude move their gap up and down. */
function sway(o: Obstacle, world: World, vp: Viewport, fraction: number) {
  const amp = Math.min(fraction * vp.h, o.baseGapY - 20, vp.h - vp.seaH - o.gapH - o.baseGapY - 20);
  o.gapY = o.baseGapY + Math.sin(world.t * SWAY_RATE + o.phase) * Math.max(0, amp);
}

const rakshasa: ObstacleBehaviour = {
  update: (o, world, vp) => sway(o, world, vp, KINDS.rakshasa.sway ?? 0),
};

/** Boss gate: wider, fixed gap, bigger sway. */
const lankini: ObstacleBehaviour = {
  init: (o, world, vp) => {
    o.w = OB_W * LANKINI_WIDTH_MUL;
    o.gapH = LANKINI_GAP * vp.h * gapMul(world);
    o.baseGapH = o.gapH;
    // re-centre the gap so the bigger sway stays on screen
    o.baseGapY = (vp.h - vp.seaH - o.gapH) / 2;
    o.gapY = o.baseGapY;
  },
  update: (o, world, vp) => sway(o, world, vp, KINDS.lankini.sway ?? 0),
};

/**
 * Mainaka rises out of the sea to offer rest. Never lethal: the whole thing is a
 * bottom "column" (gapY = 0), and touching the peak once earns punya.
 */
const mainaka: ObstacleBehaviour = {
  init: (o, world, vp) => {
    o.gapY = 0;
    o.baseGapY = 0;
    o.targetPeakY = vp.h * (0.45 + world.rng() * 0.2);
    o.riseT = 0;
    o.touched = false;
    o.gapH = vp.h - vp.seaH; // peak starts at sea level
  },
  update: (o, _world, vp, dt) => {
    if (o.x > vp.w) return; // not on screen yet
    o.riseT = (o.riseT ?? 0) + dt;
    const t = easeOut(clamp01((o.riseT ?? 0) / MAINAKA_RISE_S));
    const seaLevel = vp.h - vp.seaH;
    const peakY = seaLevel + ((o.targetPeakY ?? seaLevel) - seaLevel) * t;
    o.gapH = peakY; // bottom column top edge == peak
  },
  collide: (o, hero) => {
    if (o.touched) return "none";
    const px = o.x + o.w / 2;
    const py = o.gapH;
    const dx = hero.x - px;
    const dy = hero.y - py;
    const reach = hero.r + MAINAKA_PEAK_R;
    if (dx * dx + dy * dy <= reach * reach) {
      o.touched = true;
      return "collect";
    }
    return "none";
  },
};

/**
 * Surasa's mouth opens wide in the distance and closes as the hero nears. Near her
 * the hero first swells, then shrinks to a thumb (a much smaller hitbox).
 */
const surasa: ObstacleBehaviour = {
  update: (o, _world, vp) => {
    const dist = o.x - vp.heroX;
    const t = smoothstep(clamp01(1 - dist / (SURASA_APPROACH * vp.w)));
    const centre = o.baseGapY + o.baseGapH / 2;
    o.gapH = o.baseGapH * (SURASA_MOUTH_MAX + (SURASA_MOUTH_MIN - SURASA_MOUTH_MAX) * t);
    o.gapY = centre - o.gapH / 2;
  },
  affectHero: (o, world, vp) => {
    const hx = vp.heroX;
    const near = hx > o.x - 40 && hx < o.x + o.w + 40;
    const approaching = !near && hx > o.x - 0.25 * vp.w && hx < o.x;
    if (near) world.heroScale = SURASA_SHRINK;
    else if (approaching) world.heroScale = SURASA_SWELL;
  },
  passBonus: () => SURASA_SHRINK_BONUS,
};

/** Simhika grabs shadows: inside her band on the water, gravity pulls harder. */
const simhika: ObstacleBehaviour = {
  affectHero: (o, world, vp) => {
    const hx = vp.heroX;
    const inBand = hx > o.x - SIMHIKA_BAND && hx < o.x + o.w + SIMHIKA_BAND;
    o.shadowing = inBand;
    if (inBand) world.gravityMul = SIMHIKA_PULL;
  },
  passBonus: () => SIMHIKA_SHADOW_BONUS,
};

/**
 * Vibhishana's street: the open door is the real gap; one or two doorways are
 * painted on the solid wall as decoys. Only the gap marked with Tulsi and
 * Ram-naam lets you through. Gently sways like the sentries do.
 */
const house: ObstacleBehaviour = {
  init: (o, world, vp) => {
    const sea = vp.h - vp.seaH;
    const m = HOUSE_DECOY_MARGIN * vp.h;
    const decoys: number[] = [];
    // above the gap
    if (o.gapY - m > m + 20) decoys.push((m + world.rng() * (o.gapY - 2 * m - 20)) / vp.h);
    // below the gap
    const lo = o.gapY + o.gapH + m;
    if (sea - m - 20 > lo) decoys.push((lo + world.rng() * (sea - m - 20 - lo)) / vp.h);
    o.decoys = decoys;
  },
  update: (o, world, vp) => sway(o, world, vp, KINDS.house.sway ?? 0),
};

/** A vriksha: the hero tears it down instead of dying on it. */
const vriksha: ObstacleBehaviour = {
  collide: (o, hero) => {
    if (o.smashed) return "none";
    if (columnCollide(o, hero) === "hit") {
      o.smashed = true;
      return "smash";
    }
    return "none";
  },
};

/** Meghnad's volley: same column rules, narrower opening. */
const astra: ObstacleBehaviour = {
  init: (o) => {
    const centre = o.gapY + o.gapH / 2;
    o.gapH *= ASTRA_GAP_MUL;
    o.baseGapH = o.gapH;
    o.gapY = centre - o.gapH / 2;
    o.baseGapY = o.gapY;
  },
};

export const BEHAVIOURS: Partial<Record<ObstacleKindId, ObstacleBehaviour>> = {
  rakshasa,
  lankini,
  mainaka,
  surasa,
  simhika,
  house,
  vriksha,
  astra,
};

export const heroHitbox = (world: World, vp: Viewport): Hitbox => ({
  x: vp.heroX,
  y: world.y,
  r: HERO_R * world.heroScale,
});
