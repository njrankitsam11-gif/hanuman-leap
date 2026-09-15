import { CHAPTERS, chapterAt, finaleDuration, targetPasses, type Chapter } from "./chapters";
import type { ObstacleKindId } from "./chapters/types";
import {
  DESPAWN_X,
  FLAP_H,
  GAP_SHRINK_PER_LEAP_FRAC,
  GRAVITY_H,
  HERO_R,
  OB_W,
  SPAWN_MARGIN_SPAN_FRAC,
  SPAWN_MARGIN_TOP_FRAC,
  SPAWN_X_OFFSET,
  SWAY_RATE,
} from "./constants";
import { KINDS } from "./kinds";
import type { GameEvent, Input, Obstacle, Viewport, World } from "./types";

/**
 * Pure game engine. Nothing in here touches the DOM or React — the component
 * feeds it `dt` and `Input`, and reacts to the events it returns.
 */

/** Punya rules. */
export const PASS_PUNYA = 10;
export const CLEAR_BONUS = 50;
export const WIN_BONUS = 500;
/** Extra for finishing the whole run without a single death. */
export const FLAWLESS_BONUS = 500;

export const LAST_CHAPTER = CHAPTERS.length - 1;

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
    punya: 0,
    punyaAtChapterStart: 0,
    bossSpawned: false,
    bossPassed: false,
    deaths: 0,
    rng,
  };
}

/** Put the world at the start of a chapter. Keeps punya/leaps/deaths; the hero re-centres. */
export function startChapter(world: World, index: number, vp: Viewport) {
  world.chapter = index;
  world.passes = 0;
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
}

/** Undo the current chapter's progress for a retry. */
export function retryChapter(world: World, vp: Viewport) {
  world.punya = world.punyaAtChapterStart;
  startChapter(world, world.chapter, vp);
}

export const chapterSpeed = (ch: Chapter, vp: Viewport) => ch.difficulty.speed * vp.h * vp.speedMul;

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
  const gapH = Math.max(ch.difficulty.gapMin, ch.difficulty.gap - shrink) * vp.h;
  const top = SPAWN_MARGIN_TOP_FRAC * vp.h;
  const span = SPAWN_MARGIN_SPAN_FRAC * vp.h;
  const gapY = top + world.rng() * (vp.h - span - gapH);
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

/** Kinds with a sway amplitude move their gap up and down. */
function oscillate(o: Obstacle, world: World, vp: Viewport) {
  const sway = KINDS[o.kind].sway;
  if (!sway) return;
  const amp = Math.min(sway * vp.h, o.baseGapY - 20, vp.h - vp.seaH - o.gapH - o.baseGapY - 20);
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

export const passPunya = (kind: ObstacleKindId, ch: Chapter) =>
  Math.round(PASS_PUNYA * ch.scoreMul) + (KINDS[kind].bonus ?? 0);

export function goalReached(world: World, ch: Chapter): boolean {
  return ch.goal.kind === "boss" ? world.bossPassed : world.passes >= targetPasses(ch);
}

/** Every column is fully behind the hero, so the closing glide can't clip one. */
const clearBehind = (world: World, vp: Viewport) =>
  world.obstacles.every((o) => o.passed && o.x + OB_W < vp.heroX - HERO_R);

function stepFinale(world: World, dt: number, vp: Viewport, ch: Chapter, speed: number) {
  const events: GameEvent[] = [];
  world.finaleT += dt;
  world.vy = 0;
  world.y += (vp.h * 0.5 - world.y) * Math.min(1, 4 * dt);
  for (const o of world.obstacles) o.x -= speed * dt;
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
  const speed = chapterSpeed(ch, vp);
  world.t += dt;
  world.scroll += speed * dt;

  if (world.phase === "finale") return stepFinale(world, dt, vp, ch, speed);

  const events: GameEvent[] = [];
  if (input.flap) world.vy = FLAP_H * vp.h;
  world.vy += GRAVITY_H * vp.h * dt;
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
    o.x -= speed * dt;
    oscillate(o, world, vp);
    if (!o.passed && o.x + OB_W < vp.heroX) {
      o.passed = true;
      world.passes += 1;
      world.leaps += 1;
      world.punya += passPunya(o.kind, ch);
      if (KINDS[o.kind].boss) world.bossPassed = true;
      events.push({ type: "pass", passes: world.passes, punya: world.punya, kind: o.kind });
    }
  }
  world.obstacles = world.obstacles.filter((o) => o.x > DESPAWN_X);

  if (collide(world, vp)) {
    world.running = false;
    world.deaths += 1;
    events.push({ type: "hit", punya: world.punya });
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
  }
}
