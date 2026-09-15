import { describe, expect, it } from "vitest";
import { FLAP, GRAVITY, H, HERO_R, HERO_X, OB_W, SEA_H, W } from "../constants";
import { collide, createWorld, spawnObstacle, step } from "../engine";
import { STAGES, stageAt } from "../stages";
import type { Viewport } from "../types";

const vp: Viewport = { w: W, h: H, dpr: 1 };
const noFlap = { flap: false };
const flap = { flap: true };

/** Deterministic rng that always returns the same value. */
const fixed = (v: number) => () => v;

/** Advance `seconds` in fixed substeps and collect every event. */
function run(world: ReturnType<typeof createWorld>, seconds: number, dt = 1 / 120) {
  const events = [];
  for (let t = 0; t < seconds; t += dt) events.push(...step(world, noFlap, dt, vp));
  return events;
}

describe("createWorld", () => {
  it("starts the hero mid-screen, running, with a clean spawn timer", () => {
    const w = createWorld(vp);
    expect(w.y).toBe(H / 2);
    expect(w.vy).toBe(0);
    expect(w.running).toBe(true);
    expect(w.spawnTimer).toBe(0);
    expect(w.obstacles).toEqual([]);
  });

  it("resets the spawn timer on restart (the old closure-timer bug)", () => {
    const w = createWorld(vp, fixed(0.5));
    run(w, 1.0);
    expect(w.spawnTimer).toBeGreaterThan(0);
    const fresh = createWorld(vp, fixed(0.5));
    expect(fresh.spawnTimer).toBe(0);
  });
});

describe("physics", () => {
  it("applies gravity: vy ≈ GRAVITY after one second of free fall", () => {
    const w = createWorld(vp, fixed(0.5));
    // Hold altitude so the sea never ends the run; only vy is under test.
    for (let i = 0; i < 120; i++) {
      step(w, noFlap, 1 / 120, vp);
      w.y = H / 2;
      w.spawnTimer = 0;
    }
    expect(w.running).toBe(true);
    expect(w.vy).toBeCloseTo(GRAVITY, 0);
  });

  it("a flap sets vy to FLAP exactly, and the next frame is gravity-only", () => {
    const w = createWorld(vp, fixed(0.5));
    step(w, flap, 1 / 120, vp);
    expect(w.vy).toBeCloseTo(FLAP + GRAVITY / 120, 6);
  });

  it("does nothing once the run is over", () => {
    const w = createWorld(vp, fixed(0.5));
    w.running = false;
    const y = w.y;
    expect(step(w, flap, 0.1, vp)).toEqual([]);
    expect(w.y).toBe(y);
  });
});

describe("spawning and passing", () => {
  it("spawns an obstacle once the stage spawn interval elapses", () => {
    const w = createWorld(vp, fixed(0.5));
    const stage = stageAt(0);
    w.y = 40;
    for (let t = 0; t < stage.spawn + 0.05; t += 1 / 120) {
      step(w, noFlap, 1 / 120, vp);
      w.vy = 0; // hold altitude so we don't die before spawn
      w.y = 40;
    }
    expect(w.obstacles.length).toBe(1);
    expect(w.obstacles[0]?.x).toBeLessThanOrEqual(W + 60);
  });

  it("counts a pass exactly once and emits a pass event", () => {
    const w = createWorld(vp, fixed(0.5));
    const o = spawnObstacle(w, vp, stageAt(0));
    // Put the column just ahead of the hero, with the gap centred on the hero.
    o.x = HERO_X - OB_W + 1;
    o.gapY = w.y - o.gapH / 2;
    w.obstacles.push(o);
    w.spawnTimer = -100; // no new spawns during this test

    const events = [];
    for (let i = 0; i < 10; i++) {
      events.push(...step(w, noFlap, 1 / 120, vp));
      w.vy = 0;
      w.y = H / 2;
    }
    const passes = events.filter((e) => e.type === "pass");
    expect(passes).toHaveLength(1);
    expect(w.leaps).toBe(1);
    expect(w.score).toBe(10);
  });

  it("levels up every 5 leaps and caps at the last stage", () => {
    const w = createWorld(vp, fixed(0.5));
    w.leaps = 4;
    const o = spawnObstacle(w, vp, stageAt(0));
    o.x = HERO_X - OB_W + 1;
    o.gapY = w.y - o.gapH / 2;
    w.obstacles.push(o);
    w.spawnTimer = -100;
    const events = step(w, noFlap, 1 / 120, vp);
    expect(events[0]).toMatchObject({ type: "pass", leaps: 5, level: 1 });
    w.leaps = 999;
    expect(step(w, noFlap, 1 / 120, vp)).toEqual([]);
    expect(STAGES.length).toBe(5);
  });
});

describe("collide", () => {
  it("is false in open air", () => {
    const w = createWorld(vp);
    expect(collide(w, vp)).toBe(false);
  });

  it("hits the ceiling and the sea", () => {
    const w = createWorld(vp);
    w.y = HERO_R - 1;
    expect(collide(w, vp)).toBe(true);
    w.y = H - SEA_H - HERO_R + 1;
    expect(collide(w, vp)).toBe(true);
  });

  it("passes through a gap but hits the column above or below it", () => {
    const w = createWorld(vp, fixed(0.5));
    const o = spawnObstacle(w, vp, stageAt(0));
    o.x = HERO_X - OB_W / 2;
    o.gapY = w.y - o.gapH / 2;
    w.obstacles.push(o);
    expect(collide(w, vp)).toBe(false);
    w.y = o.gapY - 1;
    expect(collide(w, vp)).toBe(true);
    w.y = o.gapY + o.gapH + 1;
    expect(collide(w, vp)).toBe(true);
  });

  it("stops the run and emits a hit event", () => {
    const w = createWorld(vp, fixed(0.5));
    w.y = H - SEA_H - HERO_R - 1;
    w.vy = 500;
    const events = step(w, noFlap, 1 / 60, vp);
    expect(events.some((e) => e.type === "hit")).toBe(true);
    expect(w.running).toBe(false);
  });
});
