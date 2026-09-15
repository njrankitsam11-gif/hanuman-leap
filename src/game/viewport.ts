import {
  CANON_LANDSCAPE,
  HERO_X_FRAC,
  LANDSCAPE_ASPECT,
  LANDSCAPE_H,
  MAX_DPR,
  PORTRAIT_ASPECT,
  PORTRAIT_H,
  PORTRAIT_SPEED_MUL,
  SEA_H_FRAC,
} from "./constants";
import type { Viewport } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Decide orientation with a little hysteresis so a window hovering around square
 * doesn't flip modes (and re-scale the world) every other resize event.
 */
function isPortrait(aspect: number, prevPortrait: boolean | undefined) {
  if (prevPortrait === undefined) return aspect < 1;
  return prevPortrait ? aspect < 1.05 : aspect < 0.95;
}

/**
 * Logical H is fixed per orientation; logical W follows the container's aspect within
 * a clamp. The CSS box is the contain-fit of that aspect inside the container.
 */
export function computeViewport(
  containerW: number,
  containerH: number,
  devicePixelRatio: number,
  prevPortrait?: boolean,
): Viewport {
  const dpr = clamp(devicePixelRatio || 1, 1, MAX_DPR);
  if (!(containerW > 0) || !(containerH > 0)) {
    return finish(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 0, 0, dpr, false);
  }
  const aspect = containerW / containerH;
  const portrait = isPortrait(aspect, prevPortrait);
  const h = portrait ? PORTRAIT_H : LANDSCAPE_H;
  const [lo, hi] = portrait ? PORTRAIT_ASPECT : LANDSCAPE_ASPECT;
  const w = Math.round(h * clamp(aspect, lo, hi));

  // contain-fit the logical aspect inside the container
  const logicalAspect = w / h;
  let cssW: number;
  let cssH: number;
  if (aspect > logicalAspect) {
    cssH = containerH;
    cssW = containerH * logicalAspect;
  } else {
    cssW = containerW;
    cssH = containerW / logicalAspect;
  }
  return finish(w, h, cssW, cssH, dpr, portrait);
}

function finish(
  w: number,
  h: number,
  cssW: number,
  cssH: number,
  dpr: number,
  portrait: boolean,
): Viewport {
  return {
    w,
    h,
    cssW,
    cssH,
    dpr,
    portrait,
    heroX: Math.round(w * HERO_X_FRAC),
    seaH: Math.round(h * SEA_H_FRAC),
    speedMul: portrait ? PORTRAIT_SPEED_MUL : 1,
  };
}

/** Default before the container has been measured (SSR and first client frame). */
export const DEFAULT_VIEWPORT: Viewport = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);

/**
 * Size the backing store for the device pixel ratio and map logical → device px once.
 * Note: setting `width`/`height` clears the canvas, so callers should redraw afterwards.
 */
export function applyViewport(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
) {
  canvas.width = Math.round(vp.w * vp.dpr);
  canvas.height = Math.round(vp.h * vp.dpr);
  ctx.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
}
