/**
 * Every vertical quantity is a fraction of the logical height `H` so the game feels
 * identical in landscape (H = 560) and portrait (H = 768). Sprite and column sizes are
 * absolute logical px — they should read the same on any screen, not zoom with it.
 *
 * Fractions below are derived from the original 900×560 tuning (value / 560).
 */

/** Canonical logical heights per orientation. */
export const LANDSCAPE_H = 560;
export const PORTRAIT_H = 768;
/** Logical aspect-ratio clamps: W = H × clamp(containerAspect). */
export const LANDSCAPE_ASPECT: readonly [number, number] = [1.35, 2.1];
export const PORTRAIT_ASPECT: readonly [number, number] = [0.45, 0.8];
/** Canonical design sizes (what the clamps produce at 16:10 and 9:16). */
export const CANON_LANDSCAPE = { w: 900, h: LANDSCAPE_H } as const;
export const CANON_PORTRAIT = { w: 432, h: PORTRAIT_H } as const;

/** Physics, ·H per s² and ·H per s (1500/560, −430/560). */
export const GRAVITY_H = 2.679;
export const FLAP_H = -0.768;

/** Hero placement (fraction of W) and hitbox (AABB half-size, absolute). */
export const HERO_X_FRAC = 0.19;
export const HERO_R = 28;
/** Source rect inside hanuman.webp (already cropped to the alpha bbox of the original 816² frame). */
export const HERO_SRC = { x: 0, y: 0, w: 761, h: 460 } as const;
/** Sprite draw rect, relative to the hero centre (same aspect as HERO_SRC). */
export const HERO_DRAW = { w: 96, h: 58, ox: -48, oy: -29 } as const;

/** Column width (absolute) and the sea strip height (·H, 50/560). */
export const OB_W = 84;
export const SEA_H_FRAC = 0.089;

/** Spawn geometry: x offset past the right edge (absolute), vertical margins (·H). */
export const SPAWN_X_OFFSET = 60;
export const SPAWN_MARGIN_TOP_FRAC = 0.143; // 80/560
export const SPAWN_MARGIN_SPAN_FRAC = 0.304; // 170/560
export const MIN_GAP_FRAC = 0.268; // 150/560
/** Gap narrows by this much (·H) per leap cleared (was 1px at H = 560). */
export const GAP_SHRINK_PER_LEAP_FRAC = 1 / 560;
export const DESPAWN_X = -140;

/** Vertical sway of rakshasa / lankini gaps (·H: 85/560, 110/560). */
export const SWAY_RAKSHASA_FRAC = 0.152;
export const SWAY_LANKINI_FRAC = 0.196;
export const SWAY_RATE = 2.2;

/** Portrait columns arrive at a shorter horizontal distance; slow them for a fair reaction time. */
export const PORTRAIT_SPEED_MUL = 0.72;

/** Fixed simulation step and the cap on wall-clock delta per frame. */
export const STEP = 1 / 120;
export const MAX_SUBSTEPS = 8;
export const MAX_DT = 0.05;

/** "Sahaj" (easy) mode: gaps are wider and columns arrive slower. */
export const EASY_GAP_MUL = 1.2;
export const EASY_SPEED_MUL = 0.88;

/** Ignore input for this long after a hit so a panic tap doesn't skip the game-over screen. */
export const DEATH_COOLDOWN_MS = 600;

/** Backing-store cap; 3× buys little on a phone and costs a lot of fill rate. */
export const MAX_DPR = 2;
