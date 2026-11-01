import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterAt, ENDLESS_INDEX, targetPasses } from "../chapters";
import {
  CANON_LANDSCAPE,
  CANON_PORTRAIT,
  EASY_GAP_MUL,
  EASY_SPEED_MUL,
  FLAP_H,
  GRAVITY_H,
  HERO_R,
  OB_W,
} from "../constants";
import {
  chapterSpeed,
  CLEAR_BONUS,
  collide,
  createWorld,
  LAST_CHAPTER,
  nextSpawnKind,
  PASS_PUNYA,
  resizeWorld,
  retryChapter,
  spawnObstacle,
  startChapter,
  step,
} from "../engine";
import { ENDLESS_RAMP } from "../mechanics";
import { mulberry32 } from "../rng";
import type { GameEvent, World } from "../types";
import { computeViewport } from "../viewport";

const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);
const noFlap = { flap: false };
const flap = { flap: true };
const DT = 1 / 120;

/** Deterministic rng that always returns the same value. */
const fixed = (v: number) => () => v;

/** A world already running in `chapter`. */
function runningWorld(chapter = 0, rng = fixed(0.5)): World {
  const w = createWorld(vp, rng);
  startChapter(w, chapter, vp);
  w.running = true;
  return w;
}

/** Step while pinning the hero mid-screen so nothing kills it. */
function stepSafe(w: World, n: number, v = vp): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    events.push(...step(w, noFlap, DT, v));
    w.vy = 0;
    w.y = v.h / 2;
  }
  return events;
}

/** Put a column just behind the hero's leading edge, gap centred, so the next step passes it. */
function columnAboutToPass(w: World, kind = "cloud" as const) {
  const o = spawnObstacle(w, vp, chapterAt(w.chapter), kind);
  o.x = vp.heroX - OB_W + 1;
  o.gapY = w.y - o.gapH / 2;
  w.obstacles.push(o);
  return o;
}

describe("createWorld / startChapter", () => {
  it("starts idle and frozen; startChapter arms a run at the chapter's start", () => {
    const w = createWorld(vp);
    expect(w.running).toBe(false);
    expect(w.phase).toBe("frozen");
    startChapter(w, 2, vp);
    expect(w.chapter).toBe(2);
    expect(w.phase).toBe("run");
    expect(w.running).toBe(false); // the component flips this on the first tap
    expect(w.y).toBe(vp.h / 2);
    expect(w.spawnTimer).toBe(0);
    expect(w.obstacles).toEqual([]);
  });

  it("retryChapter reverts punya to the chapter start", () => {
    const w = runningWorld(1);
    w.punya = 300;
    startChapter(w, 2, vp);
    w.punya = 450;
    retryChapter(w, vp);
    expect(w.chapter).toBe(2);
    expect(w.punya).toBe(300);
  });
});

describe("physics", () => {
  it("applies gravity: vy ≈ GRAVITY_H·H after one second of free fall", () => {
    const w = runningWorld();
    for (let i = 0; i < 120; i++) {
      step(w, noFlap, DT, vp);
      w.y = vp.h / 2;
      w.spawnTimer = 0;
    }
    expect(w.running).toBe(true);
    expect(w.vy).toBeCloseTo(GRAVITY_H * vp.h, 0);
  });

  it("a flap sets vy to FLAP_H·H exactly, then gravity applies", () => {
    const w = runningWorld();
    step(w, flap, DT, vp);
    expect(w.vy).toBeCloseTo(FLAP_H * vp.h + GRAVITY_H * vp.h * DT, 6);
  });

  it("reaches the same apex height as a fraction of H in both orientations", () => {
    const apex = (v: ReturnType<typeof computeViewport>) => {
      const w = createWorld(v, fixed(0.5));
      startChapter(w, 0, v);
      w.running = true;
      w.y = v.h * 0.8;
      let top = w.y;
      step(w, flap, DT, v);
      while (w.vy < 0 && w.running) {
        step(w, noFlap, DT, v);
        w.spawnTimer = 0;
        top = Math.min(top, w.y);
      }
      return (v.h * 0.8 - top) / v.h;
    };
    const portrait = computeViewport(CANON_PORTRAIT.w, CANON_PORTRAIT.h, 1);
    expect(apex(vp)).toBeCloseTo(apex(portrait), 3);
    expect(apex(vp)).toBeCloseTo(0.11, 1);
  });

  it("does nothing while not running", () => {
    const w = createWorld(vp);
    const y = w.y;
    expect(step(w, flap, 0.1, vp)).toEqual([]);
    expect(w.y).toBe(y);
  });
});

describe("spawning", () => {
  it("spawns from the roster once the chapter spawn interval elapses", () => {
    const w = runningWorld(0);
    const ch = chapterAt(0);
    stepSafe(w, Math.ceil((ch.difficulty.spawn + 0.05) / DT));
    expect(w.obstacles.length).toBe(1);
    expect(w.obstacles[0]?.kind).toBe("cloud");
    expect(w.obstacles[0]?.x).toBeLessThanOrEqual(vp.w + 60);
  });

  it("never spawns more roster columns than the goal needs", () => {
    const w = runningWorld(0);
    const ch = chapterAt(0);
    w.passes = targetPasses(ch) - 1;
    expect(nextSpawnKind(w, ch)).toBe("cloud");
    w.passes = targetPasses(ch);
    expect(nextSpawnKind(w, ch)).toBeNull();
  });

  it("boss chapters spawn sentries, then exactly one Lankini once the screen is clear", () => {
    const lankiniIndex = CHAPTERS.findIndex((c) => c.goal.kind === "boss");
    const w = runningWorld(lankiniIndex);
    const ch = chapterAt(lankiniIndex);
    expect(nextSpawnKind(w, ch)).toBe("rakshasa");
    w.passes = targetPasses(ch);
    expect(nextSpawnKind(w, ch)).toBe("lankini");
    w.bossSpawned = true;
    expect(nextSpawnKind(w, ch)).toBeNull();
  });
});

describe("passing and punya", () => {
  it("counts a pass exactly once and emits a pass event with chapter-scaled punya", () => {
    const w = runningWorld(0);
    columnAboutToPass(w);
    w.spawnTimer = -100;
    const events = stepSafe(w, 10);
    expect(events.filter((e) => e.type === "pass")).toHaveLength(1);
    expect(w.passes).toBe(1);
    expect(w.leaps).toBe(1);
    expect(w.punya).toBe(Math.round(PASS_PUNYA * chapterAt(0).scoreMul));
  });

  it("clears a chapter: goal reached → finale glide → chapterClear with bonus", () => {
    const w = runningWorld(0);
    const ch = chapterAt(0);
    w.passes = targetPasses(ch) - 1;
    columnAboutToPass(w);
    w.spawnTimer = -100;
    const punyaBefore = w.punya;
    const events: GameEvent[] = [];
    // Enough steps for the column to clear the hero and the 1 s glide to finish.
    for (let i = 0; i < 120 * 3 && w.running; i++) events.push(...step(w, noFlap, DT, vp));
    const types = events.map((e) => e.type);
    expect(types).toContain("pass");
    expect(types).toContain("finale");
    expect(types[types.length - 1]).toBe("chapterClear");
    expect(w.phase).toBe("frozen");
    expect(w.running).toBe(false);
    expect(w.punya).toBe(punyaBefore + Math.round(PASS_PUNYA * ch.scoreMul) + CLEAR_BONUS);
  });

  it("the last chapter ends with a won event carrying the win bonus", () => {
    const w = runningWorld(LAST_CHAPTER);
    const ch = chapterAt(LAST_CHAPTER);
    w.passes = targetPasses(ch) - 1;
    columnAboutToPass(w);
    w.spawnTimer = -100;
    const events: GameEvent[] = [];
    for (let i = 0; i < 120 * 5 && w.running; i++) events.push(...step(w, noFlap, DT, vp));
    const last = events[events.length - 1];
    expect(last?.type).toBe("won");
    expect(last && last.type === "won" ? last.deaths : -1).toBe(0);
  });
});

describe("collide", () => {
  it("is false in open air", () => {
    expect(collide(createWorld(vp), vp)).toBe(false);
  });

  it("hits the ceiling and the sea", () => {
    const w = createWorld(vp);
    w.y = HERO_R - 1;
    expect(collide(w, vp)).toBe(true);
    w.y = vp.h - vp.seaH - HERO_R + 1;
    expect(collide(w, vp)).toBe(true);
  });

  it("passes through a gap but hits the column above or below it", () => {
    const w = runningWorld();
    const o = spawnObstacle(w, vp, chapterAt(0), "cloud");
    o.x = vp.heroX - OB_W / 2;
    o.gapY = w.y - o.gapH / 2;
    w.obstacles.push(o);
    expect(collide(w, vp)).toBe(false);
    w.y = o.gapY - 1;
    expect(collide(w, vp)).toBe(true);
    w.y = o.gapY + o.gapH + 1;
    expect(collide(w, vp)).toBe(true);
  });

  it("a hit stops the run, counts a death, and emits hit", () => {
    const w = runningWorld();
    w.y = vp.h - vp.seaH - HERO_R - 1;
    w.vy = 500;
    const events = step(w, noFlap, 1 / 60, vp);
    expect(events).toContainEqual({ type: "hit", punya: w.punya, by: "wall" });
    expect(w.running).toBe(false);
    expect(w.deaths).toBe(1);
  });

  it("names the column that killed the hero", () => {
    const w = runningWorld(5);
    const o = spawnObstacle(w, vp, chapterAt(5), "tree");
    o.x = vp.heroX - o.w / 2;
    o.gapY = o.baseGapY = 0;
    o.gapH = o.baseGapH = 0; // the whole column is solid
    w.obstacles.push(o);
    const events = step(w, noFlap, DT, vp);
    expect(events.find((e) => e.type === "hit")).toMatchObject({ by: "tree" });
  });
});

describe("resizeWorld", () => {
  it("keeps vertical quantities as fractions of H across an orientation flip", () => {
    const portrait = computeViewport(CANON_PORTRAIT.w, CANON_PORTRAIT.h, 1);
    const w = runningWorld();
    const o = spawnObstacle(w, vp, chapterAt(0), "cloud");
    w.obstacles.push(o);
    const yFrac = w.y / vp.h;
    const gapFrac = o.gapH / vp.h;
    resizeWorld(w, vp, portrait);
    expect(w.y / portrait.h).toBeCloseTo(yFrac, 9);
    expect(o.gapH / portrait.h).toBeCloseTo(gapFrac, 9);
    expect(o.x).toBe(vp.w + 60); // x untouched
  });
});

describe("easy (sahaj) mode", () => {
  it("widens every gap, Lankini's included, and slows the scroll", () => {
    const normal = runningWorld(4);
    const easy = runningWorld(4);
    easy.easy = true;
    const ch = chapterAt(4);
    const a = spawnObstacle(normal, vp, ch, "rakshasa");
    const b = spawnObstacle(easy, vp, ch, "rakshasa");
    expect(b.gapH).toBeCloseTo(a.gapH * EASY_GAP_MUL, 6);
    const la = spawnObstacle(normal, vp, ch, "lankini");
    const lb = spawnObstacle(easy, vp, ch, "lankini");
    expect(lb.gapH).toBeCloseTo(la.gapH * EASY_GAP_MUL, 6);
    expect(chapterSpeed(ch, vp, easy)).toBeCloseTo(
      chapterSpeed(ch, vp, normal) * EASY_SPEED_MUL,
      6,
    );
  });
});

describe("endless mode", () => {
  it("never reaches a goal, keeps spawning from the roster, and ramps speed with passes", () => {
    const w = runningWorld(ENDLESS_INDEX);
    const ch = chapterAt(ENDLESS_INDEX);
    expect(ch.id).toBe("endless");
    expect(targetPasses(ch)).toBe(Infinity);
    expect(nextSpawnKind(w, ch)).not.toBeNull();
    const v0 = chapterSpeed(ch, vp, w);
    w.passes = 30;
    step(w, noFlap, DT, vp); // mechanic runs inside step
    w.vy = 0;
    w.y = vp.h / 2;
    expect(chapterSpeed(ch, vp, w)).toBeGreaterThan(v0);
    w.passes = 10_000;
    step(w, noFlap, DT, vp);
    expect(w.speedRamp).toBeCloseTo(1 + ENDLESS_RAMP, 6);
    expect(w.phase).toBe("run");
    // a long survival never flips into a finale
    w.y = vp.h / 2;
    for (let i = 0; i < 600; i++) {
      step(w, noFlap, DT, vp);
      w.vy = 0;
      w.y = vp.h / 2;
      w.obstacles = []; // keep it alive; we only care about the phase
    }
    expect(w.phase).toBe("run");
    expect(w.running).toBe(true);
  });

  it("a seeded rng makes the whole run reproducible", () => {
    const a = createWorld(vp, mulberry32(99));
    const b = createWorld(vp, mulberry32(99));
    for (const w of [a, b]) {
      startChapter(w, ENDLESS_INDEX, vp);
      w.running = true;
    }
    for (let i = 0; i < 1200; i++) {
      for (const w of [a, b]) {
        step(w, i % 40 === 0 ? flap : noFlap, DT, vp);
      }
    }
    expect(a.obstacles.map((o) => [o.kind, o.x, o.gapY, o.gapH])).toEqual(
      b.obstacles.map((o) => [o.kind, o.x, o.gapY, o.gapH]),
    );
    expect(a.y).toBe(b.y);
    expect(a.punya).toBe(b.punya);
  });
});
