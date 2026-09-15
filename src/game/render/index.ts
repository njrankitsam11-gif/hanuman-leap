import { chapterAt } from "../chapters";
import { drawParticles, type Fx } from "../fx";
import type { Assets, Viewport, World } from "../types";
import { drawBackground, drawSea } from "./background";
import { drawHero } from "./hero";
import { drawObstacle, drawObstacleFx, drawObstacleLabel } from "./obstacles";
import { drawScene, drawSceneFront, sceneHeroX } from "./scene";
import { drawSky, endlessSky } from "./sky";

export type RenderOpts = {
  /** Wall-clock ms, for cosmetic motion that shouldn't touch the simulation. */
  now: number;
  /** Hover the hero gently (menus, chapter intro). */
  idle: boolean;
  fx?: Fx;
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
  const fx = opts.fx;

  ctx.save();
  if (fx && fx.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 2 * fx.shake, (Math.random() - 0.5) * 2 * fx.shake);
  }
  if (mirror) {
    ctx.translate(vp.w, 0);
    ctx.scale(-1, 1);
  }
  drawBackground(ctx, assets.bg, world, vp);
  drawSky(ctx, ch.goal.kind === "endless" ? endlessSky(world.passes) : ch.sky, vp);
  drawScene(ctx, world, vp, ch);
  for (const o of world.obstacles) drawObstacle(ctx, o, world, vp);
  drawSea(ctx, world.scroll, vp);
  for (const o of world.obstacles) drawObstacleFx(ctx, o, world, vp);
  if (fx) drawParticles(ctx, fx);
  const bob = opts.idle ? Math.sin(opts.now / 500) * 6 : 0;
  drawHero(ctx, world, vp, assets.hero, { bob, x: heroX, squash: fx?.squash ?? 0 });
  drawSceneFront(ctx, world, vp, ch, heroX);
  ctx.restore();

  for (const o of world.obstacles) drawObstacleLabel(ctx, o, vp, mirror);

  if (fx && fx.flash > 0) {
    const a = fx.flash;
    ctx.fillStyle = `rgba(${Math.round(255)}, ${Math.round(255 * a)}, ${Math.round(255 * a)}, ${0.55 * a})`;
    ctx.fillRect(0, 0, vp.w, vp.h);
  }
  if (fx && fx.wipe > 0) {
    // saffron iris: everything outside a growing circle is covered
    const r = (1 - fx.wipe) * Math.hypot(vp.w, vp.h) * 0.6;
    ctx.fillStyle = "#e07c28";
    ctx.beginPath();
    ctx.rect(0, 0, vp.w, vp.h);
    ctx.arc(heroX, world.y, Math.max(0.01, r), 0, Math.PI * 2, true);
    ctx.fill("evenodd");
  }
}
