import type { Assets, Viewport, World } from "../types";
import { drawBackground, drawSea, drawTint } from "./background";
import { drawHero } from "./hero";
import { drawObstacle } from "./obstacles";

/** One full frame: background → obstacles → sea → hero. Never reads React state. */
export function render(ctx: CanvasRenderingContext2D, world: World, vp: Viewport, assets: Assets) {
  drawBackground(ctx, assets.bg, world, vp);
  drawTint(ctx, world.level, vp);
  for (const o of world.obstacles) drawObstacle(ctx, o, vp);
  drawSea(ctx, world.scroll, vp);
  drawHero(ctx, world, vp, assets.hero);
}
