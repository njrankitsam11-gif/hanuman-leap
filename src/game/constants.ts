/** Logical canvas size (landscape). Phase 1 makes this viewport-driven. */
export const W = 900;
export const H = 560;

/** Physics — px/s² and px/s in logical space. */
export const GRAVITY = 1500;
export const FLAP = -430;

/** Hero placement and hitbox (AABB half-size). */
export const HERO_X = 170;
export const HERO_R = 28;
/** Sprite draw rect, relative to the hero centre. */
export const HERO_DRAW = { w: 92, h: 80, ox: -46, oy: -40 } as const;

/** Obstacle column width and the sea strip along the bottom edge. */
export const OB_W = 84;
export const SEA_H = 50;

/** Spawn/despawn geometry. */
export const SPAWN_X_OFFSET = 60;
export const SPAWN_MARGIN_TOP = 80;
export const SPAWN_MARGIN_SPAN = 170;
export const MIN_GAP = 150;
export const DESPAWN_X = -140;

/** Clamp on frame delta so a backgrounded tab doesn't teleport the hero. */
export const MAX_DT = 0.05;
