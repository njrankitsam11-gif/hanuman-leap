import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterAt, chapterIndex, targetPasses } from "../chapters";
import { CANON_LANDSCAPE, HERO_R, OB_W } from "../constants";
import { collide, createWorld, nextSpawnKind, spawnObstacle, startChapter, step } from "../engine";
import { DAHAN_RAMP } from "../mechanics";
import {
  ASTRA_GAP_MUL,
  COLLECT_PUNYA,
  LANKINI_WIDTH_MUL,
  SMASH_PUNYA,
  SIMHIKA_PULL,
  SURASA_SHRINK,
  SURASA_SWELL,
} from "../obstacles/registry";
import type { GameEvent, World } from "../types";
import { computeViewport } from "../viewport";

const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);
const noFlap = { flap: false };
const DT = 1 / 120;
const fixed = (v: number) => () => v;
const index = (id: (typeof CHAPTERS)[number]["id"]) => CHAPTERS.findIndex((c) => c.id === id);

function runningIn(id: (typeof CHAPTERS)[number]["id"]): World {
  const w = createWorld(vp, fixed(0.5));
  startChapter(w, index(id), vp);
  w.running = true;
  w.spawnTimer = -1000; // tests place their own obstacles
  return w;
}

/** Step with the hero pinned at (heroX, y) so only the mechanic under test acts. */
function stepPinned(w: World, y: number, n = 1): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    events.push(...step(w, noFlap, DT, vp));
    w.y = y;
    w.vy = 0;
  }
  return events;
}

describe("Mainaka", () => {
  it("is never lethal and pays the touch bonus exactly once", () => {
    const w = runningIn("mainaka");
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "mainaka");
    expect(o.gapY).toBe(0);
    // fully risen, centred under the hero
    o.x = vp.heroX - o.w / 2;
    o.riseT = 10;
    o.gapH = o.targetPeakY ?? 0;
    w.obstacles.push(o);

    // flying into the body below the peak: no hit
    w.y = (o.targetPeakY ?? 0) + 120;
    expect(collide(w, vp)).toBe(false);

    // touching the peak collects once
    const punya = w.punya;
    let events = stepPinned(w, (o.targetPeakY ?? 0) - HERO_R - 5, 3);
    expect(events.filter((e) => e.type === "collect")).toHaveLength(1);
    expect(w.punya).toBe(punya + COLLECT_PUNYA);
    expect(w.running).toBe(true);
    events = stepPinned(w, (o.targetPeakY ?? 0) - HERO_R - 5, 3);
    expect(events.filter((e) => e.type === "collect")).toHaveLength(0);
  });

  it("rises from sea level toward its target peak once on screen", () => {
    const w = runningIn("mainaka");
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "mainaka");
    o.x = vp.w - 10;
    w.obstacles.push(o);
    const seaLevel = vp.h - vp.seaH;
    expect(o.gapH).toBe(seaLevel);
    stepPinned(w, vp.h / 2, 30);
    expect(o.gapH).toBeLessThan(seaLevel);
    expect(o.gapH).toBeGreaterThanOrEqual(o.targetPeakY ?? 0);
  });
});

describe("Surasa", () => {
  it("closes her mouth monotonically as the hero approaches", () => {
    const w = runningIn("surasa");
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "surasa");
    w.obstacles.push(o);
    let last = Infinity;
    for (let i = 0; i < 400 && o.x > vp.heroX; i++) {
      stepPinned(w, vp.h / 2);
      expect(o.gapH).toBeLessThanOrEqual(last + 1e-9);
      last = o.gapH;
    }
    expect(last).toBeLessThan(o.baseGapH);
  });

  it("swells the hero on approach and shrinks it to a thumb inside her jaws", () => {
    const w = runningIn("surasa");
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "surasa");
    w.obstacles.push(o);
    o.x = vp.heroX + 0.1 * vp.w;
    stepPinned(w, vp.h / 2);
    expect(w.heroScale).toBe(SURASA_SWELL);
    o.x = vp.heroX - o.w / 2;
    stepPinned(w, vp.h / 2);
    expect(w.heroScale).toBe(SURASA_SHRINK);
  });
});

describe("Simhika", () => {
  it("pulls harder inside her shadow band than outside it", () => {
    const fall = (offset: number) => {
      const w = runningIn("simhika");
      const o = spawnObstacle(w, vp, chapterAt(w.chapter), "simhika");
      o.x = vp.heroX + offset;
      o.gapY = 0;
      o.gapH = vp.h; // no column to hit; only the pull matters
      w.obstacles.push(o);
      w.y = vp.h * 0.3;
      for (let i = 0; i < 30; i++) step(w, noFlap, DT, vp);
      return w.vy;
    };
    const inside = fall(-OB_W / 2);
    const outside = fall(vp.w * 0.4);
    expect(inside / outside).toBeCloseTo(SIMHIKA_PULL, 1);
  });
});

describe("Lankini", () => {
  it("spawns sentries, then a single wide boss, and the chapter ends when it is passed", () => {
    const w = runningIn("lankini");
    const ch = chapterAt(w.chapter);
    expect(nextSpawnKind(w, ch)).toBe("rakshasa");
    w.passes = targetPasses(ch);
    const boss = spawnObstacle(w, vp, ch, "lankini");
    expect(boss.w).toBeCloseTo(OB_W * LANKINI_WIDTH_MUL, 6);
    w.bossSpawned = true;
    expect(nextSpawnKind(w, ch)).toBeNull();

    boss.x = vp.heroX - boss.w + 1;
    boss.gapY = vp.h / 2 - boss.gapH / 2;
    boss.baseGapY = boss.gapY;
    w.obstacles.push(boss);
    const events: GameEvent[] = [];
    for (let i = 0; i < 120 * 3 && w.running; i++) {
      events.push(...step(w, noFlap, DT, vp));
      w.y = vp.h / 2;
      w.vy = 0;
    }
    expect(w.bossPassed).toBe(true);
    expect(events.map((e) => e.type)).toContain("chapterClear");
  });
});

describe("Lanka Dahan and the return", () => {
  it("lights the tail and ramps speed with progress", () => {
    const w = runningIn("dahan");
    expect(w.tailFire).toBe(true);
    step(w, noFlap, DT, vp);
    expect(w.speedRamp).toBe(1);
    w.passes = targetPasses(chapterAt(w.chapter));
    step(w, noFlap, DT, vp);
    expect(w.speedRamp).toBeCloseTo(1 + DAHAN_RAMP, 6);
  });

  it("flies home mirrored without changing collisions", () => {
    const w = runningIn("return");
    expect(w.dir).toBe(-1);
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "cloud");
    o.x = vp.heroX - o.w / 2;
    o.gapY = vp.h / 2 - o.gapH / 2;
    w.obstacles.push(o);
    w.y = vp.h / 2;
    expect(collide(w, vp)).toBe(false);
    w.y = o.gapY - 1;
    expect(collide(w, vp)).toBe(true);
  });

  it("resets chapter effects when moving on", () => {
    const w = runningIn("dahan");
    startChapter(w, index("prelude"), vp);
    expect(w.tailFire).toBe(false);
    expect(w.dir).toBe(1);
    expect(w.speedRamp).toBe(1);
  });
});

describe("Vibhishana's street", () => {
  const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);
  it("houses carry painted decoy doorways on solid wall, never inside the real gap", () => {
    const w = createWorld(vp, () => 0.5);
    startChapter(w, chapterIndex("vibhishana"), vp);
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "house");
    expect(o.decoys?.length).toBeGreaterThan(0);
    for (const d of o.decoys ?? []) {
      const y = d * vp.h;
      expect(y < o.gapY || y > o.gapY + o.gapH).toBe(true);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(vp.h - vp.seaH);
    }
    // still a lethal column through the wall
    o.x = vp.heroX - o.w / 2;
    w.obstacles = [o];
    w.y = o.gapY - HERO_R - 5;
    expect(collide(w, vp)).toBe(true);
    w.y = o.gapY + o.gapH / 2;
    expect(collide(w, vp)).toBe(false);
  });
});

describe("Vatika-vidhvans", () => {
  const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);
  const DT = 1 / 120;

  it("a vriksha is torn down instead of killing the hero, once, for punya", () => {
    const w = createWorld(vp, () => 0.5);
    startChapter(w, chapterIndex("vidhvans"), vp);
    w.running = true;
    const o = spawnObstacle(w, vp, chapterAt(w.chapter), "vriksha");
    o.x = vp.heroX - o.w / 2;
    w.y = o.gapY - HERO_R - 5; // in the canopy
    w.obstacles = [o];
    const before = w.punya;
    const events = step(w, { flap: false }, DT, vp);
    expect(events.find((e) => e.type === "smash")).toMatchObject({ punya: before + SMASH_PUNYA });
    expect(events.some((e) => e.type === "hit")).toBe(false);
    expect(o.smashed).toBe(true);
    expect(w.smashes).toBe(1);
    expect(w.running).toBe(true);
    // the stump no longer collides at all
    w.y = o.gapY - HERO_R - 5;
    expect(collide(w, vp)).toBe(false);
    expect(step(w, { flap: false }, DT, vp).some((e) => e.type === "smash")).toBe(false);
  });

  it("Meghnad's volley leaves a narrower opening and still kills", () => {
    const w = createWorld(vp, () => 0.5);
    startChapter(w, chapterIndex("vidhvans"), vp);
    const ch = chapterAt(w.chapter);
    const plain = spawnObstacle(w, vp, ch, "vriksha");
    const volley = spawnObstacle(w, vp, ch, "astra");
    expect(volley.gapH).toBeCloseTo(plain.gapH * ASTRA_GAP_MUL, 6);
    volley.x = vp.heroX - volley.w / 2;
    w.y = volley.gapY - HERO_R - 2;
    w.obstacles = [volley];
    expect(collide(w, vp)).toBe(true);
  });

  it("ends in the capture finale, then clears into Lanka Dahan", () => {
    const w = createWorld(vp, () => 0.5);
    const idx = chapterIndex("vidhvans");
    startChapter(w, idx, vp);
    w.running = true;
    const ch = chapterAt(idx);
    expect(ch.goal).toEqual({ kind: "finale", passes: 8, scene: "capture" });
    w.passes = targetPasses(ch);
    w.obstacles = [];
    const events: string[] = [];
    for (let i = 0; i < 120 * 4; i++) {
      for (const e of step(w, { flap: false }, DT, vp)) events.push(e.type);
      if (w.phase === "run") {
        w.vy = 0;
        w.y = vp.h / 2;
      }
    }
    expect(events).toContain("finale");
    expect(events).toContain("chapterClear");
    expect(chapterAt(idx + 1).id).toBe("dahan");
  });
});
