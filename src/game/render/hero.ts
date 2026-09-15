import { HERO_DRAW, HERO_R } from "../constants";
import { isReady } from "../assets";
import type { Viewport, World } from "../types";

function drawTailFire(ctx: CanvasRenderingContext2D, now: number) {
  // in hero space, the tail trails behind and slightly above the body
  for (let i = 0; i < 4; i++) {
    const flick = Math.sin(now / 45 + i * 1.9) * 4;
    const x = -38 - i * 9;
    const y = -10 - i * 4 + flick;
    ctx.fillStyle = i % 2 ? "rgba(255, 150, 40, 0.85)" : "rgba(255, 220, 90, 0.9)";
    ctx.beginPath();
    ctx.ellipse(x, y, 9 - i, 13 - i * 2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHero(
  ctx: CanvasRenderingContext2D,
  world: World,
  vp: Viewport,
  hero: HTMLImageElement,
  opts: { bob: number; x: number; now: number },
) {
  // Tilt is tuned against the landscape fall speed; scale so portrait matches.
  const tilt = Math.max(-0.4, Math.min(0.7, world.vy / (900 * (vp.h / 560))));
  ctx.save();
  ctx.translate(opts.x, world.y + opts.bob);
  ctx.rotate(tilt);
  ctx.scale(world.heroScale, world.heroScale);
  if (world.tailFire) drawTailFire(ctx, opts.now);
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
