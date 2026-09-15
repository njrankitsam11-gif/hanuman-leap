import {
  DESPAWN_X,
  FLAP,
  GRAVITY,
  HERO_R,
  HERO_X,
  MIN_GAP,
  OB_W,
  SEA_H,
  SPAWN_MARGIN_SPAN,
  SPAWN_MARGIN_TOP,
  SPAWN_X_OFFSET,
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

export function spawnObstacle(world: World, vp: Viewport, stage: Stage): Obstacle {
  const gapH = Math.max(MIN_GAP, stage.gap - world.leaps);
  const gapY = SPAWN_MARGIN_TOP + world.rng() * (vp.h - SPAWN_MARGIN_SPAN - gapH);
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
    o.kind === 4 ? 110 : 85,
    o.baseGapY - 20,
    vp.h - SEA_H - o.gapH - o.baseGapY - 20,
  );
  o.gapY = o.baseGapY + Math.sin(world.t * 2.2 + o.phase) * Math.max(0, amp);
}

/** AABB hero vs ceiling, sea, and every column outside its gap. */
export function collide(world: World, vp: Viewport): boolean {
  const { y } = world;
  if (y - HERO_R < 0 || y + HERO_R > vp.h - SEA_H) return true;
  return world.obstacles.some(
    (o) =>
      HERO_X + HERO_R > o.x &&
      HERO_X - HERO_R < o.x + OB_W &&
      (y - HERO_R < o.gapY || y + HERO_R > o.gapY + o.gapH),
  );
}

export function step(world: World, input: Input, dt: number, vp: Viewport): GameEvent[] {
  const events: GameEvent[] = [];
  if (!world.running) return events;

  const stage = stageAt(world.level);

  if (input.flap) world.vy = FLAP;

  world.t += dt;
  world.scroll += stage.speed * dt;
  world.vy += GRAVITY * dt;
  world.y += world.vy * dt;

  world.spawnTimer += dt;
  if (world.spawnTimer >= stage.spawn) {
    world.spawnTimer = 0;
    world.obstacles.push(spawnObstacle(world, vp, stage));
  }

  for (const o of world.obstacles) {
    o.x -= stage.speed * dt;
    oscillate(o, world, vp);
    if (!o.passed && o.x + OB_W < HERO_X) {
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
