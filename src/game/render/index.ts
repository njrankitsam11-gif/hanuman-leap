import { chapterAt } from "../chapters";
import type { Assets, Viewport, World } from "../types";
import { drawBackground, drawSea } from "./background";
import { drawHero } from "./hero";
import { drawObstacle } from "./obstacles";
import { drawSky } from "./sky";

export type RenderOpts = {
  /** Wall-clock ms, for cosmetic motion that shouldn't touch the simulation. */
  now: number;
  /** Hover the hero gently (menus, chapter intro). */
  idle: boolean;
};

/** One full frame: background → sky → obstacles → sea → hero. Never reads React state. */
export function render(
  ctx: CanvasRenderingContext2D,
  world: World,
  vp: Viewport,
  assets: Assets,
  opts: RenderOpts,
) {
  const ch = chapterAt(world.chapter);
  drawBackground(ctx, assets.bg, world, vp);
  drawSky(ctx, ch.sky, vp);
  for (const o of world.obstacles) drawObstacle(ctx, o, vp);
  drawSea(ctx, world.scroll, vp);
  const bob = opts.idle ? Math.sin(opts.now / 500) * 6 : 0;
  drawHero(ctx, world, vp, assets.hero, bob);
}
