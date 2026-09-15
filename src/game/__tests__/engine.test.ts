import { describe, expect, it } from "vitest";
import { CANON_LANDSCAPE, CANON_PORTRAIT, FLAP_H, GRAVITY_H, HERO_R, OB_W } from "../constants";
import { collide, createWorld, resizeWorld, spawnObstacle, step } from "../engine";
import { STAGES, stageAt } from "../stages";
import { computeViewport } from "../viewport";

const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);
const noFlap = { flap: false };
const flap = { flap: true };

/** Deterministic rng that always returns the same value. */
const fixed = (v: number) => () => v;

describe("createWorld", () => {
  it("starts the hero mid-screen, running, with a clean spawn timer", () => {
    const w = createWorld(vp);
    expect(w.y).toBe(vp.h / 2);
    expect(w.vy).toBe(0);
    expect(w.running).toBe(true);
    expect(w.spawnTimer).toBe(0);
    expect(w.obstacles).toEqual([]);
  });

  it("resets the spawn timer on restart (the old closure-timer bug)", () => {
    const w = createWorld(vp, fixed(0.5));
    for (let i = 0; i < 60; i++) step(w, noFlap, 1 / 120, vp);
    expect(w.spawnTimer).toBeGreaterThan(0);
    expect(createWorld(vp, fixed(0.5)).spawnTimer).toBe(0);
  });
});

describe("physics", () => {
  it("applies gravity: vy ≈ GRAVITY_H·H after one second of free fall", () => {
    const w = createWorld(vp, fixed(0.5));
    // Hold altitude so the sea never ends the run; only vy is under test.
    for (let i = 0; i < 120; i++) {
      step(w, noFlap, 1 / 120, vp);
      w.y = vp.h / 2;
      w.spawnTimer = 0;
    }
    expect(w.running).toBe(true);
    expect(w.vy).toBeCloseTo(GRAVITY_H * vp.h, 0);
  });

  it("a flap sets vy to FLAP_H·H exactly, then gravity applies", () => {
    const w = createWorld(vp, fixed(0.5));
    step(w, flap, 1 / 120, vp);
    expect(w.vy).toBeCloseTo(FLAP_H * vp.h + (GRAVITY_H * vp.h) / 120, 6);
  });

  it("reaches the same apex height as a fraction of H in both orientations", () => {
    const apex = (v: ReturnType<typeof computeViewport>) => {
      const w = createWorld(v, fixed(0.5));
      w.y = v.h * 0.8;
      let top = w.y;
      step(w, flap, 1 / 120, v);
      while (w.vy < 0 && w.running) {
        step(w, noFlap, 1 / 120, v);
        w.spawnTimer = 0;
        top = Math.min(top, w.y);
      }
      return (v.h * 0.8 - top) / v.h;
    };
    const portrait = computeViewport(CANON_PORTRAIT.w, CANON_PORTRAIT.h, 1);
    expect(apex(vp)).toBeCloseTo(apex(portrait), 3);
    expect(apex(vp)).toBeCloseTo(0.11, 1);
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
    for (let t = 0; t < stage.spawn + 0.05; t += 1 / 120) {
      step(w, noFlap, 1 / 120, vp);
      w.vy = 0;
      w.y = vp.h / 2;
    }
    expect(w.obstacles.length).toBe(1);
    expect(w.obstacles[0]?.x).toBeLessThanOrEqual(vp.w + 60);
  });

  it("counts a pass exactly once and emits a pass event", () => {
    const w = createWorld(vp, fixed(0.5));
    const o = spawnObstacle(w, vp, stageAt(0));
    // Column just ahead of the hero's trailing edge, gap centred on the hero.
    o.x = vp.heroX - OB_W + 1;
    o.gapY = w.y - o.gapH / 2;
    w.obstacles.push(o);
    w.spawnTimer = -100; // no new spawns during this test

    const events = [];
    for (let i = 0; i < 10; i++) {
      events.push(...step(w, noFlap, 1 / 120, vp));
      w.vy = 0;
      w.y = vp.h / 2;
    }
    expect(events.filter((e) => e.type === "pass")).toHaveLength(1);
    expect(w.leaps).toBe(1);
    expect(w.score).toBe(10);
  });

  it("levels up every 5 leaps and caps at the last stage", () => {
    const w = createWorld(vp, fixed(0.5));
    w.leaps = 4;
    const o = spawnObstacle(w, vp, stageAt(0));
    o.x = vp.heroX - OB_W + 1;
    o.gapY = w.y - o.gapH / 2;
    w.obstacles.push(o);
    w.spawnTimer = -100;
    const events = step(w, noFlap, 1 / 120, vp);
    expect(events[0]).toMatchObject({ type: "pass", leaps: 5, level: 1 });
    expect(STAGES.length).toBe(5);
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
    const w = createWorld(vp, fixed(0.5));
    const o = spawnObstacle(w, vp, stageAt(0));
    o.x = vp.heroX - OB_W / 2;
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
    w.y = vp.h - vp.seaH - HERO_R - 1;
    w.vy = 500;
    const events = step(w, noFlap, 1 / 60, vp);
    expect(events.some((e) => e.type === "hit")).toBe(true);
    expect(w.running).toBe(false);
  });
});

describe("resizeWorld", () => {
  it("keeps vertical quantities as fractions of H across an orientation flip", () => {
    const portrait = computeViewport(CANON_PORTRAIT.w, CANON_PORTRAIT.h, 1);
    const w = createWorld(vp, fixed(0.5));
    const o = spawnObstacle(w, vp, stageAt(0));
    w.obstacles.push(o);
    const yFrac = w.y / vp.h;
    const gapFrac = o.gapH / vp.h;
    resizeWorld(w, vp, portrait);
    expect(w.y / portrait.h).toBeCloseTo(yFrac, 9);
    expect(o.gapH / portrait.h).toBeCloseTo(gapFrac, 9);
    expect(o.x).toBe(vp.w + 60); // x untouched
  });
});
