import { CHAPTERS, chapterAt, finaleDuration, targetPasses, type Chapter } from "./chapters";
import type { ObstacleKindId } from "./chapters/types";
import {
  DESPAWN_X,
  EASY_SPEED_MUL,
  FLAP_H,
  GAP_SHRINK_PER_LEAP_FRAC,
  GRAVITY_H,
  HERO_R,
  OB_W,
  SPAWN_MARGIN_SPAN_FRAC,
  SPAWN_MARGIN_TOP_FRAC,
  SPAWN_X_OFFSET,
} from "./constants";
import { KINDS } from "./kinds";
import { MECHANICS, resetChapterEffects } from "./mechanics";
import {
  BEHAVIOURS,
  COLLECT_PUNYA,
  columnCollide,
  gapMul,
  heroHitbox,
  SMASH_PUNYA,
} from "./obstacles/registry";
import type { GameEvent, Input, Obstacle, Viewport, World } from "./types";

/**
 * Pure game engine. Nothing in here touches the DOM or React — the component
 * feeds it `dt` and `Input`, and reacts to the events it returns. Per-kind and
 * per-chapter behaviour is looked up in registries so this file never special-cases.
 */

/** Punya rules. */
export const PASS_PUNYA = 10;
export const CLEAR_BONUS = 50;
export const WIN_BONUS = 500;
/** Extra for finishing the whole run without a single death. */
export const FLAWLESS_BONUS = 500;

export const LAST_CHAPTER = CHAPTERS.length - 1;

/** Seconds into the finale at which the scroll has fully stopped. */
export const FINALE_SLOW_S = 1.2;

export function createWorld(vp: Viewport, rng: () => number = Math.random): World {
  return {
    y: vp.h / 2,
    vy: 0,
    t: 0,
    scroll: 0,
    spawnTimer: 0,
    obstacles: [],
    running: false,
    phase: "frozen",
    finaleT: 0,
    chapter: 0,
    passes: 0,
    leaps: 0,
    smashes: 0,
    punya: 0,
    punyaAtChapterStart: 0,
    bossSpawned: false,
    bossPassed: false,
    deaths: 0,
    heroScale: 1,
    gravityMul: 1,
    tailFire: false,
    dir: 1,
    speedRamp: 1,
    easy: false,
    rng,
  };
}

/** Put the world at the start of a chapter. Keeps punya/leaps/deaths; the hero re-centres. */
export function startChapter(world: World, index: number, vp: Viewport) {
  world.chapter = index;
  world.passes = 0;
  world.smashes = 0;
  world.obstacles = [];
  world.spawnTimer = 0;
  world.punyaAtChapterStart = world.punya;
  world.bossSpawned = false;
  world.bossPassed = false;
  world.phase = "run";
  world.finaleT = 0;
  world.running = false;
  world.y = vp.h / 2;
  world.vy = 0;
  resetChapterEffects(world);
  const ch = chapterAt(index);
  MECHANICS[ch.id]?.onEnter?.(world, vp, ch);
}

/** Undo the current chapter's progress for a retry. */
export function retryChapter(world: World, vp: Viewport) {
  world.punya = world.punyaAtChapterStart;
  startChapter(world, world.chapter, vp);
}

export const chapterSpeed = (ch: Chapter, vp: Viewport, world?: World) =>
  ch.difficulty.speed *
  vp.h *
  vp.speedMul *
  (world?.speedRamp ?? 1) *
  (world?.easy ? EASY_SPEED_MUL : 1);

function pickFromRoster(world: World, ch: Chapter): ObstacleKindId {
  let total = 0;
  for (const [, w] of ch.roster) total += w;
  let r = world.rng() * total;
  for (const [kind, w] of ch.roster) {
    r -= w;
    if (r < 0) return kind;
  }
  return ch.roster[0]?.[0] ?? "cloud";
}

/** What to spawn next, or null when the chapter has produced everything it needs. */
export function nextSpawnKind(world: World, ch: Chapter): ObstacleKindId | null {
  const pending = world.obstacles.filter((o) => !o.passed).length;
  const roster = world.passes + pending < targetPasses(ch);
  if (roster) return pickFromRoster(world, ch);
  if (ch.goal.kind === "boss" && !world.bossSpawned && pending === 0) return "lankini";
  return null;
}

export function spawnObstacle(
  world: World,
  vp: Viewport,
  ch: Chapter,
  kind: ObstacleKindId,
): Obstacle {
  const shrink = world.passes * GAP_SHRINK_PER_LEAP_FRAC;
  const gapH = Math.max(ch.difficulty.gapMin, ch.difficulty.gap - shrink) * vp.h * gapMul(world);
  const top = SPAWN_MARGIN_TOP_FRAC * vp.h;
  const span = SPAWN_MARGIN_SPAN_FRAC * vp.h;
  const gapY = top + world.rng() * (vp.h - span - gapH);
  const o: Obstacle = {
    x: vp.w + SPAWN_X_OFFSET,
    w: OB_W,
    gapY,
    gapH,
    kind,
    passed: false,
    baseGapY: gapY,
    baseGapH: gapH,
    phase: world.rng() * Math.PI * 2,
  };
  BEHAVIOURS[kind]?.init?.(o, world, vp, ch);
  return o;
}

/** Ceiling and sea are always lethal. */
export function hitsWalls(world: World, vp: Viewport): boolean {
  const r = HERO_R * world.heroScale;
  return world.y - r < 0 || world.y + r > vp.h - vp.seaH;
}

/** Combined check, mostly for tests: walls plus every column's own rule. */
export function collide(world: World, vp: Viewport): boolean {
  if (hitsWalls(world, vp)) return true;
  const hero = heroHitbox(world, vp);
  return world.obstacles.some(
    (o) => (BEHAVIOURS[o.kind]?.collide ?? columnCollide)(o, hero, vp) === "hit",
  );
}

export const passPunya = (o: Obstacle, world: World, ch: Chapter) =>
  Math.round(PASS_PUNYA * ch.scoreMul) +
  (KINDS[o.kind].bonus ?? 0) +
  (BEHAVIOURS[o.kind]?.passBonus?.(o, world) ?? 0);

export function goalReached(world: World, ch: Chapter): boolean {
  return ch.goal.kind === "boss" ? world.bossPassed : world.passes >= targetPasses(ch);
}

/** Every column is fully behind the hero, so the closing glide can't clip one. */
const clearBehind = (world: World, vp: Viewport) =>
  world.obstacles.every((o) => o.passed && o.x + o.w < vp.heroX - HERO_R);

function stepFinale(world: World, dt: number, vp: Viewport, ch: Chapter, speed: number) {
  const events: GameEvent[] = [];
  world.finaleT += dt;
  // the world eases to a halt so the scene can hold
  const k = 1 - Math.min(1, world.finaleT / FINALE_SLOW_S);
  world.scroll += speed * k * dt;
  world.vy = 0;
  world.y += (vp.h * 0.45 - world.y) * Math.min(1, 4 * dt);
  for (const o of world.obstacles) o.x -= speed * k * dt;
  world.obstacles = world.obstacles.filter((o) => o.x > DESPAWN_X);

  if (world.finaleT >= finaleDuration(ch)) {
    world.running = false;
    world.phase = "frozen";
    if (world.chapter === LAST_CHAPTER) {
      world.punya += WIN_BONUS + (world.deaths === 0 ? FLAWLESS_BONUS : 0);
      events.push({ type: "won", punya: world.punya, deaths: world.deaths });
    } else {
      world.punya += CLEAR_BONUS * (world.chapter + 1);
      events.push({ type: "chapterClear", chapter: world.chapter, punya: world.punya });
    }
  }
  return events;
}

export function step(world: World, input: Input, dt: number, vp: Viewport): GameEvent[] {
  if (!world.running) return [];

  const ch = chapterAt(world.chapter);
  MECHANICS[ch.id]?.onUpdate?.(world, vp, ch, dt);
  const speed = chapterSpeed(ch, vp, world);
  world.t += dt;

  // The finale advances scroll itself, with its own easing.
  if (world.phase === "finale") return stepFinale(world, dt, vp, ch, speed);
  world.scroll += speed * dt;

  const events: GameEvent[] = [];
  if (input.flap) world.vy = FLAP_H * vp.h;

  // Obstacles move and act on the hero before the hero integrates.
  world.heroScale = 1;
  world.gravityMul = 1;
  for (const o of world.obstacles) {
    o.x -= speed * dt;
    const b = BEHAVIOURS[o.kind];
    b?.update?.(o, world, vp, dt);
    b?.affectHero?.(o, world, vp);
  }

  world.vy += GRAVITY_H * vp.h * world.gravityMul * dt;
  world.y += world.vy * dt;

  world.spawnTimer += dt;
  if (world.spawnTimer >= ch.difficulty.spawn) {
    const kind = nextSpawnKind(world, ch);
    if (kind) {
      world.spawnTimer = 0;
      if (KINDS[kind].boss) world.bossSpawned = true;
      world.obstacles.push(spawnObstacle(world, vp, ch, kind));
    }
  }

  for (const o of world.obstacles) {
    if (!o.passed && o.x + o.w < vp.heroX) {
      o.passed = true;
      world.passes += 1;
      world.leaps += 1;
      world.punya += passPunya(o, world, ch);
      if (KINDS[o.kind].boss) world.bossPassed = true;
      events.push({ type: "pass", passes: world.passes, punya: world.punya, kind: o.kind });
    }
  }
  world.obstacles = world.obstacles.filter((o) => o.x > DESPAWN_X);

  // Collisions: walls, then each column's own rule.
  let hit: ObstacleKindId | "wall" | null = hitsWalls(world, vp) ? "wall" : null;
  if (!hit) {
    const hero = heroHitbox(world, vp);
    for (const o of world.obstacles) {
      const result = (BEHAVIOURS[o.kind]?.collide ?? columnCollide)(o, hero, vp);
      if (result === "hit") {
        hit = o.kind;
        break;
      }
      if (result === "collect") {
        world.punya += COLLECT_PUNYA;
        events.push({ type: "collect", punya: world.punya });
      } else if (result === "smash") {
        world.punya += SMASH_PUNYA;
        world.smashes += 1;
        events.push({ type: "smash", punya: world.punya, x: o.x + o.w / 2, y: hero.y });
      }
    }
  }
  if (hit) {
    world.running = false;
    world.deaths += 1;
    events.push({ type: "hit", punya: world.punya, by: hit });
    return events;
  }

  if (goalReached(world, ch) && clearBehind(world, vp)) {
    world.phase = "finale";
    world.finaleT = 0;
    events.push({ type: "finale", chapter: world.chapter });
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
    o.baseGapH *= k;
    if (o.targetPeakY !== undefined) o.targetPeakY *= k;
  }
}
