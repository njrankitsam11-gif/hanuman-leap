import type { SkyId } from "../chapters/types";
import type { Viewport } from "../types";

/** Flat tint over the ocean painting; Phase 4 may layer gradients/embers on top. */
const SKY_TINT: Record<SkyId, string | null> = {
  morning: "rgba(255, 224, 170, 0.12)",
  day: null,
  dusk: "rgba(160, 60, 90, 0.28)",
  night: "rgba(8, 18, 70, 0.55)",
  fire: "rgba(210, 60, 10, 0.36)",
  dawn: "rgba(255, 170, 120, 0.2)",
};

export function drawSky(ctx: CanvasRenderingContext2D, sky: SkyId, vp: Viewport) {
  const tint = SKY_TINT[sky];
  if (!tint) return;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, vp.w, vp.h);
}
