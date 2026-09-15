import {
  DESPAWN_X,
  FLAP_H,
  GAP_SHRINK_PER_LEAP_FRAC,
  GRAVITY_H,
  HERO_R,
  MIN_GAP_FRAC,
  OB_W,
  SPAWN_MARGIN_SPAN_FRAC,
  SPAWN_MARGIN_TOP_FRAC,
  SPAWN_X_OFFSET,
  SWAY_LANKINI_FRAC,
  SWAY_RAKSHASA_FRAC,
  SWAY_RATE,
} from "./constants";
import { stageAt, stageFor, scoreForPass, type Stage } from "./stages";
import type { GameEvent, Input, Kind, Obstacle, Viewport, World } from "./types";

/**
 * Pure game engine. Nothing in here touches the DOM or React — the component
 * feeds it `dt` and `Input`, and reacts to the events it returns.
 */

export function createWorld(vp: Viewport, rng: () => number = Math.random): World {
  return {
    y: vp.h / 2,
    vy: 0,
    t: 0,
    scroll: 0,
    spawnTimer: 0,
    obstacles: [],
    leaps: 0,
    score: 0,
    level: 0,
    running: true,
    rng,
  };
}

/** Stage speed in logical px/s for this viewport. */
export const stageSpeed = (stage: Stage, vp: Viewport) => stage.speed * vp.h * vp.speedMul;

export function spawnObstacle(world: World, vp: Viewport, stage: Stage): Obstacle {
  const gapH = Math.max(
    MIN_GAP_FRAC * vp.h,
    (stage.gap - world.leaps * GAP_SHRINK_PER_LEAP_FRAC) * vp.h,
  );
  const top = SPAWN_MARGIN_TOP_FRAC * vp.h;
  const span = SPAWN_MARGIN_SPAN_FRAC * vp.h;
  const gapY = top + world.rng() * (vp.h - span - gapH);
  const kind = (stage.kinds[Math.floor(world.rng() * stage.kinds.length)] ?? 0) as Kind;
  return {
    x: vp.w + SPAWN_X_OFFSET,
    gapY,
    gapH,
    kind,
    passed: false,
    baseGapY: gapY,
    phase: world.rng() * Math.PI * 2,
  };
}

/** Rakshasa and Lankini columns sway their gap up and down. */
function oscillate(o: Obstacle, world: World, vp: Viewport) {
  if (o.kind !== 3 && o.kind !== 4) return;
  const amp = Math.min(
    (o.kind === 4 ? SWAY_LANKINI_FRAC : SWAY_RAKSHASA_FRAC) * vp.h,
    o.baseGapY - 20,
    vp.h - vp.seaH - o.gapH - o.baseGapY - 20,
  );
  o.gapY = o.baseGapY + Math.sin(world.t * SWAY_RATE + o.phase) * Math.max(0, amp);
}

/** AABB hero vs ceiling, sea, and every column outside its gap. */
export function collide(world: World, vp: Viewport): boolean {
  const { y } = world;
  const hx = vp.heroX;
  if (y - HERO_R < 0 || y + HERO_R > vp.h - vp.seaH) return true;
  return world.obstacles.some(
    (o) =>
      hx + HERO_R > o.x &&
      hx - HERO_R < o.x + OB_W &&
      (y - HERO_R < o.gapY || y + HERO_R > o.gapY + o.gapH),
  );
}

export function step(world: World, input: Input, dt: number, vp: Viewport): GameEvent[] {
  const events: GameEvent[] = [];
  if (!world.running) return events;

  const stage = stageAt(world.level);
  const speed = stageSpeed(stage, vp);

  if (input.flap) world.vy = FLAP_H * vp.h;

  world.t += dt;
  world.scroll += speed * dt;
  world.vy += GRAVITY_H * vp.h * dt;
  world.y += world.vy * dt;

  world.spawnTimer += dt;
  if (world.spawnTimer >= stage.spawn) {
    world.spawnTimer = 0;
    world.obstacles.push(spawnObstacle(world, vp, stage));
  }

  for (const o of world.obstacles) {
    o.x -= speed * dt;
    oscillate(o, world, vp);
    if (!o.passed && o.x + OB_W < vp.heroX) {
      o.passed = true;
      world.leaps += 1;
      world.score += scoreForPass(world.level, o.kind);
      world.level = stageFor(world.leaps);
      events.push({ type: "pass", leaps: world.leaps, score: world.score, level: world.level });
    }
  }
  world.obstacles = world.obstacles.filter((o) => o.x > DESPAWN_X);

  if (collide(world, vp)) {
    world.running = false;
    events.push({ type: "hit", score: world.score });
  }

  return events;
}

/**
 * Carry a live world across a viewport change. Vertical quantities are fractions of H,
 * so they scale; x positions are left alone (a column that lands off-screen simply
 * scrolls in later).
 */
export function resizeWorld(world: World, from: Viewport, to: Viewport) {
  if (from.h === to.h) return;
  const k = to.h / from.h;
  world.y *= k;
  world.vy *= k;
  for (const o of world.obstacles) {
    o.gapY *= k;
    o.gapH *= k;
    o.baseGapY *= k;
  }
}
