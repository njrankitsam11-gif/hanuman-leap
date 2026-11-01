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

/** The sea gradient only changes with the viewport, not per frame (one per context). */
const seaGrads = new WeakMap<CanvasRenderingContext2D, { key: string; grad: CanvasGradient }>();

export function drawSea(ctx: CanvasRenderingContext2D, scroll: number, vp: Viewport) {
  const top = vp.h - vp.seaH;
  const key = `${top}:${vp.h}`;
  let sea = seaGrads.get(ctx);
  if (!sea || sea.key !== key) {
    const grad = ctx.createLinearGradient(0, top, 0, vp.h);
    grad.addColorStop(0, "#1f7d8c");
    grad.addColorStop(1, "#0d4a57");
    seaGrads.set(ctx, (sea = { key, grad }));
  }
  ctx.fillStyle = sea.grad;
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
