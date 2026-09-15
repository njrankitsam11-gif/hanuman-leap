import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterAt } from "../chapters";
import type { ObstacleKindId } from "../chapters/types";
import { CANON_LANDSCAPE, CANON_PORTRAIT } from "../constants";
import { createWorld, spawnObstacle, startChapter, step } from "../engine";
import { burst, createFx, hitFx, wipeFx } from "../fx";
import { KINDS } from "../kinds";
import { render } from "../render";
import type { Assets } from "../types";
import { computeViewport } from "../viewport";

/**
 * A CanvasRenderingContext2D stand-in: every method is a no-op that records its
 * name, gradients are inert objects. Enough to prove the drawers don't throw.
 */
function stubContext() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, prop: string) => {
      if (prop in target) return target[prop];
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return () => gradient;
      }
      return (...args: unknown[]) => {
        calls.push(prop);
        for (const a of args) {
          if (typeof a === "number" && !Number.isFinite(a)) {
            throw new Error(`${prop} received a non-finite argument`);
          }
        }
      };
    },
    set: (target, prop: string, value) => {
      target[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const fakeImage = (ready: boolean) =>
  ({
    complete: ready,
    naturalWidth: ready ? 1920 : 0,
    naturalHeight: ready ? 1088 : 0,
  }) as unknown as HTMLImageElement;

const assets: Assets = { hero: fakeImage(true), bg: fakeImage(true) };
const noAssets: Assets = { hero: fakeImage(false), bg: fakeImage(false) };

const viewports = [
  computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 2),
  computeViewport(CANON_PORTRAIT.w, CANON_PORTRAIT.h, 2),
];

describe("render", () => {
  it("draws every obstacle kind in every chapter without throwing", () => {
    for (const vp of viewports) {
      for (let i = 0; i < CHAPTERS.length; i++) {
        const w = createWorld(vp, () => 0.5);
        startChapter(w, i, vp);
        w.running = true;
        for (const kind of Object.keys(KINDS) as ObstacleKindId[]) {
          const o = spawnObstacle(w, vp, chapterAt(i), kind);
          o.x = vp.w * 0.5;
          if (kind === "simhika") o.shadowing = true;
          w.obstacles.push(o);
        }
        const fx = createFx();
        burst(fx, "spark", vp.heroX, w.y, 20);
        hitFx(fx);
        wipeFx(fx);
        const { ctx, calls } = stubContext();
        render(ctx, w, vp, assets, { now: 1234, idle: false, fx });
        expect(calls.length).toBeGreaterThan(50);
        expect(calls).toContain("drawImage");
        expect(calls).toContain("fillText");
      }
    }
  });

  it("draws the finale scenes (Sita, Ram) through their whole timeline", () => {
    for (const vp of viewports) {
      for (const ch of CHAPTERS) {
        if (ch.goal.kind !== "finale") continue;
        const i = CHAPTERS.indexOf(ch);
        const w = createWorld(vp, () => 0.5);
        startChapter(w, i, vp);
        w.running = true;
        w.phase = "finale";
        for (let t = 0; t <= 2.6; t += 0.2) {
          w.finaleT = t;
          const { ctx, calls } = stubContext();
          render(ctx, w, vp, assets, { now: t * 1000, idle: false });
          expect(calls.length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("mirrors the return leg and burns the tail in Lanka, falling back when assets are missing", () => {
    const vp = viewports[0]!;
    for (const id of ["dahan", "return"] as const) {
      const w = createWorld(vp, () => 0.5);
      startChapter(
        w,
        CHAPTERS.findIndex((c) => c.id === id),
        vp,
      );
      w.running = true;
      const { ctx, calls } = stubContext();
      render(ctx, w, vp, noAssets, { now: 0, idle: true });
      if (id === "return") expect(calls).toContain("scale");
      expect(calls).toContain("fillRect");
    }
  });

  it("stays finite after a long simulated run with collisions disabled", () => {
    const vp = viewports[1]!;
    const w = createWorld(vp, () => 0.37);
    startChapter(w, 0, vp);
    w.running = true;
    for (let i = 0; i < 120 * 20; i++) {
      step(w, { flap: i % 40 === 0 }, 1 / 120, vp);
      w.y = vp.h / 2;
      w.vy = 0;
      w.running = true;
    }
    const { ctx } = stubContext();
    expect(() => render(ctx, w, vp, assets, { now: 20000, idle: false })).not.toThrow();
  });
});
