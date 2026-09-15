import { HERO_DRAW, HERO_R, HERO_SRC } from "../constants";
import { isReady } from "../assets";
import type { Viewport, World } from "../types";

export function drawHero(
  ctx: CanvasRenderingContext2D,
  world: World,
  vp: Viewport,
  hero: HTMLImageElement,
  opts: { bob: number; x: number; squash: number },
) {
  // Tilt is tuned against the landscape fall speed; scale so portrait matches.
  const tilt = Math.max(-0.4, Math.min(0.7, world.vy / (900 * (vp.h / 560))));
  const s = opts.squash;
  ctx.save();
  ctx.translate(opts.x, world.y + opts.bob);
  ctx.rotate(tilt);
  // stretch on flap: narrower and taller, easing back to 1
  ctx.scale(world.heroScale * (1 - 0.12 * s), world.heroScale * (1 + 0.2 * s));
  if (isReady(hero)) {
    ctx.drawImage(
      hero,
      HERO_SRC.x,
      HERO_SRC.y,
      HERO_SRC.w,
      HERO_SRC.h,
      HERO_DRAW.ox,
      HERO_DRAW.oy,
      HERO_DRAW.w,
      HERO_DRAW.h,
    );
  } else {
    ctx.fillStyle = "#e07c28";
    ctx.beginPath();
    ctx.arc(0, 0, HERO_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
