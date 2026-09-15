import { describe, expect, it } from "vitest";
import { LANDSCAPE_H, MAX_DPR, PORTRAIT_H, PORTRAIT_SPEED_MUL } from "../constants";
import { computeViewport } from "../viewport";

describe("computeViewport", () => {
  it("gives the canonical 900×560 for a 16:10 landscape container", () => {
    const vp = computeViewport(900, 560, 2);
    expect(vp.portrait).toBe(false);
    expect(vp.w).toBe(900);
    expect(vp.h).toBe(LANDSCAPE_H);
    expect(vp.cssW).toBe(900);
    expect(vp.cssH).toBe(560);
    expect(vp.heroX).toBe(171);
    expect(vp.seaH).toBe(50);
    expect(vp.speedMul).toBe(1);
    expect(vp.dpr).toBe(2);
  });

  it("gives a 9:16-ish portrait viewport for a phone", () => {
    const vp = computeViewport(390, 844, 3);
    expect(vp.portrait).toBe(true);
    expect(vp.h).toBe(PORTRAIT_H);
    expect(vp.w).toBe(Math.round(PORTRAIT_H * (390 / 844)));
    expect(vp.speedMul).toBe(PORTRAIT_SPEED_MUL);
    expect(vp.dpr).toBe(MAX_DPR); // capped
    // contain-fit: the container is narrower than the logical aspect → width-bound
    expect(vp.cssW).toBe(390);
    expect(Math.abs(vp.cssH - 844)).toBeLessThan(1); // logical W is rounded
  });

  it("clamps very wide landscape containers and letterboxes the CSS box", () => {
    const vp = computeViewport(3000, 560, 1);
    expect(vp.w).toBe(Math.round(LANDSCAPE_H * 2.1));
    expect(vp.cssH).toBe(560);
    expect(vp.cssW).toBeCloseTo(560 * (vp.w / vp.h), 5);
  });

  it("applies hysteresis around square", () => {
    // was portrait, now slightly wider than tall: stays portrait
    expect(computeViewport(102, 100, 1, true).portrait).toBe(true);
    // was landscape, now slightly taller than wide: stays landscape
    expect(computeViewport(98, 100, 1, false).portrait).toBe(false);
    // decisive changes flip
    expect(computeViewport(120, 100, 1, true).portrait).toBe(false);
    expect(computeViewport(80, 100, 1, false).portrait).toBe(true);
  });

  it("falls back to the canonical landscape size for an unmeasured container", () => {
    const vp = computeViewport(0, 0, 1);
    expect(vp.w).toBe(900);
    expect(vp.h).toBe(560);
  });
});
