import { describe, expect, it } from "vitest";
import { CHAPTERS } from "../chapters";
import { CANON_LANDSCAPE, CANON_PORTRAIT, STEP } from "../constants";
import { createWorld, startChapter, step } from "../engine";
import { mulberry32 } from "../rng";
import type { Viewport, World } from "../types";
import { computeViewport } from "../viewport";

/**
 * A look-ahead bot plays every chapter, tapping no faster than a person can. It proves each
 * one can be finished; a spawn pattern or tuning change that walls a chapter off fails here.
 */
const TAP_S = 0.14;
const STEPS_PER_TAP = Math.round(TAP_S / STEP);
const LOOK_AHEAD_TAPS = 8;
const MAX_SEARCH = 4000;
const TIME_LIMIT_S = 200;

const clone = (w: World): World => ({
  ...w,
  obstacles: w.obstacles.map((o) => ({ ...o })),
  rng: () => 0.5,
});

/** Advance one tap slot; false if the hero died in it. */
function advance(w: World, vp: Viewport, flap: boolean) {
  for (let i = 0; i < STEPS_PER_TAP; i++) {
    const events = step(w, { flap: flap && i === 0 }, STEP, vp);
    if (events.some((e) => e.type === "hit")) return false;
  }
  return true;
}

let searched = 0;

function survives(w: World, vp: Viewport, depth: number): boolean {
  if (depth === 0 || w.phase !== "run") return true;
  if (++searched > MAX_SEARCH) return false;
  return [false, true].some((flap) => {
    const next = clone(w);
    return advance(next, vp, flap) && survives(next, vp, depth - 1);
  });
}

/** Tap only when not tapping leads to a death inside the look-ahead. */
function shouldFlap(w: World, vp: Viewport) {
  searched = 0;
  const glide = clone(w);
  return !(advance(glide, vp, false) && survives(glide, vp, LOOK_AHEAD_TAPS));
}

function finishes(index: number, vp: Viewport, seed: number) {
  const world = createWorld(vp, mulberry32(seed));
  startChapter(world, index, vp);
  world.running = true;
  for (let t = 0; t < TIME_LIMIT_S; t += TAP_S) {
    const flap = world.phase === "run" && shouldFlap(world, vp);
    for (let i = 0; i < STEPS_PER_TAP; i++) {
      for (const e of step(world, { flap: flap && i === 0 }, STEP, vp)) {
        if (e.type === "hit") return false;
        if (e.type === "chapterClear" || e.type === "won") return true;
      }
    }
  }
  return false;
}

describe.each([
  ["landscape", computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1)],
  ["portrait", computeViewport(CANON_PORTRAIT.w, CANON_PORTRAIT.h, 1)],
])("every chapter can be finished in %s", (_name, vp) => {
  it.each(CHAPTERS.map((ch, i) => [ch.id, i] as const))("%s", (_id, index) => {
    for (let seed = 1; seed <= 6; seed++) expect(finishes(index, vp, seed * 7919)).toBe(true);
  });
});
