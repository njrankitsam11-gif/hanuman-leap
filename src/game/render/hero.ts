import { HERO_DRAW, HERO_R, HERO_X } from "../constants";
import { isReady } from "../assets";
import type { World } from "../types";

export function drawHero(ctx: CanvasRenderingContext2D, world: World, hero: HTMLImageElement) {
  const tilt = Math.max(-0.4, Math.min(0.7, world.vy / 900));
  ctx.save();
  ctx.translate(HERO_X, world.y);
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
