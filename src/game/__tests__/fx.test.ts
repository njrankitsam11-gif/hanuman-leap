import { describe, expect, it } from "vitest";
import { CANON_LANDSCAPE } from "../constants";
import { createWorld, startChapter } from "../engine";
import { burst, createFx, flapFx, hitFx, MAX_PARTICLES, updateFx, wipeFx } from "../fx";
import { computeViewport } from "../viewport";

const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);
const rng = () => 0.5;

function world(chapter = 0) {
  const w = createWorld(vp, rng);
  startChapter(w, chapter, vp);
  w.running = true;
  return w;
}

describe("fx", () => {
  it("caps the particle pool", () => {
    const fx = createFx();
    burst(fx, "spark", 0, 0, MAX_PARTICLES * 3, rng);
    expect(fx.particles.length).toBe(MAX_PARTICLES);
  });

  it("flap stretches, hit flashes and shakes, wipe covers — and all decay to zero", () => {
    const fx = createFx();
    flapFx(fx, 100, 100, rng);
    hitFx(fx);
    wipeFx(fx);
    expect(fx.squash).toBe(1);
    expect(fx.flash).toBe(1);
    expect(fx.shake).toBeGreaterThan(0);
    expect(fx.wipe).toBe(1);
    const w = world();
    const opts = { heroX: vp.heroX, fireSky: false, running: false };
    for (let i = 0; i < 240; i++) updateFx(fx, 1 / 60, w, vp, opts, rng);
    expect(fx.squash).toBeLessThan(0.01);
    expect(fx.flash).toBe(0);
    expect(fx.shake).toBe(0);
    expect(fx.wipe).toBe(0);
    expect(fx.particles.length).toBe(0);
  });

  it("respects reduced motion: no shake, no wipe", () => {
    const fx = createFx(true);
    hitFx(fx);
    wipeFx(fx);
    expect(fx.shake).toBe(0);
    expect(fx.wipe).toBe(0);
    expect(fx.flash).toBe(1); // a flash is fine
  });

  it("emits a trail while running, flames in Lanka Dahan, embers under a fire sky", () => {
    const fx = createFx();
    const w = world();
    for (let i = 0; i < 12; i++) {
      updateFx(fx, 1 / 60, w, vp, { heroX: vp.heroX, fireSky: false, running: true }, rng);
    }
    expect(fx.particles.some((p) => p.kind === "spark")).toBe(true);
    expect(fx.particles.some((p) => p.kind === "flame")).toBe(false);

    const dahan = world(6);
    expect(dahan.tailFire).toBe(true);
    const fx2 = createFx();
    for (let i = 0; i < 12; i++) {
      updateFx(fx2, 1 / 60, dahan, vp, { heroX: vp.heroX, fireSky: true, running: true }, rng);
    }
    expect(fx2.particles.some((p) => p.kind === "flame")).toBe(true);
    expect(fx2.particles.some((p) => p.kind === "ember")).toBe(true);
  });
});
