import { chapterAt } from "../chapters";
import type { Assets, Viewport, World } from "../types";
import { drawBackground, drawSea } from "./background";
import { drawHero } from "./hero";
import { drawObstacle, drawObstacleFx, drawObstacleLabel } from "./obstacles";
import { drawScene, drawSceneFront, sceneHeroX } from "./scene";
import { drawSky } from "./sky";

export type RenderOpts = {
  /** Wall-clock ms, for cosmetic motion that shouldn't touch the simulation. */
  now: number;
  /** Hover the hero gently (menus, chapter intro). */
  idle: boolean;
};

/**
 * One full frame. The world is simulated in "flow space" (obstacles always approach
 * from the right); on the way home the whole world pass is mirrored and only the
 * text labels are drawn un-mirrored on top.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  world: World,
  vp: Viewport,
  assets: Assets,
  opts: RenderOpts,
) {
  const ch = chapterAt(world.chapter);
  const mirror = world.dir === -1;
  const heroX = sceneHeroX(world, vp, ch);

  ctx.save();
  if (mirror) {
    ctx.translate(vp.w, 0);
    ctx.scale(-1, 1);
  }
  drawBackground(ctx, assets.bg, world, vp);
  drawSky(ctx, ch.sky, vp);
  drawScene(ctx, world, vp, ch);
  for (const o of world.obstacles) drawObstacle(ctx, o, world, vp);
  drawSea(ctx, world.scroll, vp);
  for (const o of world.obstacles) drawObstacleFx(ctx, o, world, vp);
  const bob = opts.idle ? Math.sin(opts.now / 500) * 6 : 0;
  drawHero(ctx, world, vp, assets.hero, { bob, x: heroX, now: opts.now });
  drawSceneFront(ctx, world, vp, ch, heroX);
  ctx.restore();

  for (const o of world.obstacles) drawObstacleLabel(ctx, o, vp, mirror);
}
