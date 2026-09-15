import { isReady } from "../assets";
import type { Viewport, World } from "../types";

/** Where the horizon sits in the ocean image, as a fraction of its height. */
const HORIZON_FRAC = 0.58;

/**
 * Cover-fit the image (no squash), anchor the horizon at the same fraction of the
 * canvas, and tile it horizontally for parallax.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: HTMLImageElement,
  world: World,
  vp: Viewport,
) {
  if (!isReady(bg)) {
    ctx.fillStyle = "#f3b45a";
    ctx.fillRect(0, 0, vp.w, vp.h);
    return;
  }
  const scale = Math.max(vp.w / bg.naturalWidth, vp.h / bg.naturalHeight);
  const dw = bg.naturalWidth * scale;
  const dh = bg.naturalHeight * scale;
  const dy = HORIZON_FRAC * (vp.h - dh);
  const off = (world.scroll * 0.25) % dw;
  ctx.drawImage(bg, -off, dy, dw, dh);
  ctx.drawImage(bg, dw - off, dy, dw, dh);
}

export function drawSea(ctx: CanvasRenderingContext2D, scroll: number, vp: Viewport) {
  const top = vp.h - vp.seaH;
  const seaGrad = ctx.createLinearGradient(0, top, 0, vp.h);
  seaGrad.addColorStop(0, "#1f7d8c");
  seaGrad.addColorStop(1, "#0d4a57");
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, top, vp.w, vp.seaH);

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
