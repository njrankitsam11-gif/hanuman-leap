import { SEA_H } from "../constants";
import { isReady } from "../assets";
import type { Viewport, World } from "../types";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  world: World,
  vp: Viewport,
) {
  if (isReady(bg)) {
    const off = (world.scroll * 0.25) % vp.w;
    ctx.drawImage(bg, -off, 0, vp.w, vp.h);
    ctx.drawImage(bg, vp.w - off, 0, vp.w, vp.h);
  } else {
    ctx.fillStyle = "#f3b45a";
    ctx.fillRect(0, 0, vp.w, vp.h);
  }
}

/** Dusk deepens as Lanka nears. */
export function drawTint(ctx: CanvasRenderingContext2D, level: number, vp: Viewport) {
  ctx.fillStyle = `rgba(${90 + level * 20}, ${70 - level * 8}, ${40 + level * 10}, ${0.1 + level * 0.05})`;
  ctx.fillRect(0, 0, vp.w, vp.h);
}

export function drawSea(ctx: CanvasRenderingContext2D, scroll: number, vp: Viewport) {
  const top = vp.h - SEA_H;
  const seaGrad = ctx.createLinearGradient(0, top, 0, vp.h);
  seaGrad.addColorStop(0, "#1f7d8c");
  seaGrad.addColorStop(1, "#0d4a57");
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, top, vp.w, SEA_H);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < vp.w; i += 30) {
    const x = (i - (scroll % 30)) % vp.w;
    const y = top + 6 + Math.sin((i + scroll) / 25) * 3;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 16, y);
  }
  ctx.stroke();
}
