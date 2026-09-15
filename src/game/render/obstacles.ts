import { OB_W, SEA_H } from "../constants";
import { KINDS } from "../stages";
import type { Obstacle, Viewport } from "../types";

/** Plain gradient column with gold cap strips (Mainaka, Surasa, Simhika). */
function drawColumn(ctx: CanvasRenderingContext2D, o: Obstacle, vp: Viewport) {
  const k = KINDS[o.kind];
  const y1 = o.gapY;
  const y2 = o.gapY + o.gapH;
  const grad = ctx.createLinearGradient(o.x, 0, o.x + OB_W, 0);
  grad.addColorStop(0, k.top);
  grad.addColorStop(1, k.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(o.x, 0, OB_W, y1);
  ctx.fillRect(o.x, y2, OB_W, vp.h - y2);
  ctx.fillStyle = "rgba(255,215,120,0.85)";
  ctx.fillRect(o.x - 6, y1 - 16, OB_W + 12, 16);
  ctx.fillRect(o.x - 6, y2, OB_W + 12, 16);
}

/** Procedural rakshasa: armoured body, horns, burning eyes, fanged jaw facing the gap. */
function drawRakshasa(
  ctx: CanvasRenderingContext2D,
  o: Obstacle,
  top: boolean,
  y0: number,
  y1: number,
) {
  const h = y1 - y0;
  if (h <= 4) return;
  const body = ctx.createLinearGradient(o.x, y0, o.x + OB_W, y1);
  body.addColorStop(0, "#6d1a24");
  body.addColorStop(0.55, "#3d0b12");
  body.addColorStop(1, "#1b0407");
  ctx.fillStyle = body;
  ctx.fillRect(o.x, y0, OB_W, h);

  // armour ribbing
  ctx.fillStyle = "rgba(255,190,110,0.10)";
  for (let y = y0 + 12; y < y1 - 6; y += 26) ctx.fillRect(o.x + 6, y, OB_W - 12, 6);

  const faceY = top ? y1 - 46 : y0 + 46;
  const dir = top ? -1 : 1;

  // horns
  ctx.fillStyle = "#e3b23c";
  ctx.beginPath();
  ctx.moveTo(o.x + 10, faceY + dir * 14);
  ctx.quadraticCurveTo(o.x + 2, faceY - dir * 16, o.x + 26, faceY - dir * 26);
  ctx.quadraticCurveTo(o.x + 18, faceY - dir * 6, o.x + 24, faceY + dir * 12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(o.x + 74, faceY + dir * 14);
  ctx.quadraticCurveTo(o.x + 82, faceY - dir * 16, o.x + 58, faceY - dir * 26);
  ctx.quadraticCurveTo(o.x + 66, faceY - dir * 6, o.x + 60, faceY + dir * 12);
  ctx.fill();

  // burning eyes
  const cx = o.x + OB_W / 2;
  const glow = ctx.createRadialGradient(cx, faceY, 1, cx, faceY, 30);
  glow.addColorStop(0, "rgba(255,140,40,0.55)");
  glow.addColorStop(1, "rgba(255,90,20,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, faceY, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb545";
  for (const ex of [o.x + 28, o.x + 56]) {
    ctx.beginPath();
    ctx.ellipse(ex, faceY, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#320404";
  for (const ex of [o.x + 28, o.x + 56]) {
    ctx.beginPath();
    ctx.ellipse(ex, faceY, 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // fanged jaw facing the gap
  const jawY = top ? y1 : y0;
  ctx.fillStyle = "#f1e2c4";
  for (let i = 0; i < 6; i++) {
    const fx = o.x + 8 + i * 13;
    ctx.beginPath();
    ctx.moveTo(fx, jawY);
    ctx.lineTo(fx + 6, jawY + (top ? 14 : -14));
    ctx.lineTo(fx + 12, jawY);
    ctx.fill();
  }
}

export function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, vp: Viewport) {
  if (o.kind === 3 || o.kind === 4) {
    drawRakshasa(ctx, o, true, 0, o.gapY);
    drawRakshasa(ctx, o, false, o.gapY + o.gapH, vp.h - SEA_H);
  } else {
    drawColumn(ctx, o, vp);
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(KINDS[o.kind].name, o.x + OB_W / 2, Math.max(20, o.gapY - 24));
}
