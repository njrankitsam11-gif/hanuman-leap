import { HERO_DRAW, HERO_R } from "../constants";
import { isReady } from "../assets";
import type { Viewport, World } from "../types";

export function drawHero(
  ctx: CanvasRenderingContext2D,
  world: World,
  vp: Viewport,
  hero: HTMLImageElement,
) {
  // Tilt is tuned against the landscape fall speed; scale so portrait matches.
  const tilt = Math.max(-0.4, Math.min(0.7, world.vy / (900 * (vp.h / 560))));
  ctx.save();
  ctx.translate(vp.heroX, world.y);
  ctx.rotate(tilt);
  if (isReady(hero)) {
    ctx.drawImage(hero, HERO_DRAW.ox, HERO_DRAW.oy, HERO_DRAW.w, HERO_DRAW.h);
  } else {
    ctx.fillStyle = "#e07c28";
    ctx.beginPath();
    ctx.arc(0, 0, HERO_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
