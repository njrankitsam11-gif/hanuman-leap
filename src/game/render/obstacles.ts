import { OB_W } from "../constants";
import { KINDS } from "../kinds";
import { MAINAKA_PEAK_R, SIMHIKA_BAND } from "../obstacles/registry";
import type { Obstacle, Viewport, World } from "../types";

type Ctx = CanvasRenderingContext2D;

/**
 * Horizontal column gradients depend only on colours and width, so one per kind is
 * built at x = 0 and reused under a translate instead of a new gradient per column
 * per frame (cheap on desktop, measurable on low-end phones).
 */
const bodyGrads = new WeakMap<Ctx, Map<string, CanvasGradient>>();

function bodyGradient(ctx: Ctx, w: number, top: string, bottom: string) {
  let perCtx = bodyGrads.get(ctx);
  if (!perCtx) bodyGrads.set(ctx, (perCtx = new Map()));
  const key = `${w}|${top}|${bottom}`;
  let grad = perCtx.get(key);
  if (!grad) {
    grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    perCtx.set(key, grad);
  }
  return grad;
}

/** Gradient-filled column pieces above and below the gap. */
function columnBody(ctx: Ctx, o: Obstacle, vp: Viewport, top: string, bottom: string) {
  ctx.save();
  ctx.translate(o.x, 0);
  ctx.fillStyle = bodyGradient(ctx, o.w, top, bottom);
  ctx.fillRect(0, 0, o.w, o.gapY);
  ctx.fillRect(0, o.gapY + o.gapH, o.w, vp.h - o.gapY - o.gapH);
  ctx.restore();
}

function caps(ctx: Ctx, o: Obstacle, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(o.x - 6, o.gapY - 16, o.w + 12, 16);
  ctx.fillRect(o.x - 6, o.gapY + o.gapH, o.w + 12, 16);
}

/** Row of triangular teeth along a horizontal edge, pointing into the gap. */
function fangs(ctx: Ctx, o: Obstacle, edgeY: number, down: boolean, color: string, len = 14) {
  ctx.fillStyle = color;
  const n = Math.floor(o.w / 13);
  for (let i = 0; i < n; i++) {
    const fx = o.x + 8 + i * 13;
    ctx.beginPath();
    ctx.moveTo(fx, edgeY);
    ctx.lineTo(fx + 6, edgeY + (down ? len : -len));
    ctx.lineTo(fx + 12, edgeY);
    ctx.fill();
  }
}

function puffs(ctx: Ctx, o: Obstacle, edgeY: number, color: string, r = 20) {
  ctx.fillStyle = color;
  for (const dx of [0.18, 0.5, 0.82]) {
    ctx.beginPath();
    ctx.arc(o.x + o.w * dx, edgeY, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(ctx: Ctx, o: Obstacle, vp: Viewport) {
  const k = KINDS.cloud;
  ctx.globalAlpha = 0.92;
  columnBody(ctx, o, vp, k.top, k.bottom);
  puffs(ctx, o, o.gapY - 4, "#fbf6ec");
  puffs(ctx, o, o.gapY + o.gapH + 4, "#e9dfcf");
  ctx.globalAlpha = 1;
}

function drawWave(ctx: Ctx, o: Obstacle, vp: Viewport, t: number) {
  const k = KINDS.wave;
  columnBody(ctx, o, vp, k.top, k.bottom);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  for (const edgeY of [o.gapY - 6, o.gapY + o.gapH + 6]) {
    ctx.beginPath();
    for (let x = o.x - 6; x <= o.x + o.w + 6; x += 4) {
      const y = edgeY + Math.sin(x / 9 + t * 6) * 4;
      if (x === o.x - 6) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Bottom-only golden mountain; the peak is at `o.gapH`. */
function drawMainaka(ctx: Ctx, o: Obstacle, vp: Viewport, t: number) {
  const sea = vp.h - vp.seaH;
  const peakY = o.gapH;
  const cx = o.x + o.w / 2;
  const h = sea - peakY;
  if (h < 2) return;
  const grad = ctx.createLinearGradient(0, peakY, 0, sea);
  grad.addColorStop(0, "#e8b95a");
  grad.addColorStop(0.35, "#a5702f");
  grad.addColorStop(1, "#5a3617");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(o.x - 34, sea);
  ctx.lineTo(o.x + o.w * 0.28, peakY + h * 0.38);
  ctx.lineTo(cx, peakY);
  ctx.lineTo(o.x + o.w * 0.76, peakY + h * 0.3);
  ctx.lineTo(o.x + o.w + 34, sea);
  ctx.closePath();
  ctx.fill();
  // golden crest
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.moveTo(cx, peakY);
  ctx.lineTo(cx - 12, peakY + 18);
  ctx.lineTo(cx + 12, peakY + 18);
  ctx.closePath();
  ctx.fill();
  if (!o.touched) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const glow = ctx.createRadialGradient(cx, peakY, 2, cx, peakY, MAINAKA_PEAK_R + 14);
    glow.addColorStop(0, `rgba(255, 230, 140, ${0.55 + 0.25 * pulse})`);
    glow.addColorStop(1, "rgba(255, 200, 80, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, peakY, MAINAKA_PEAK_R + 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Serpent mouth: fangs and eyes on both jaws. */
function drawSurasa(ctx: Ctx, o: Obstacle, vp: Viewport) {
  const k = KINDS.surasa;
  columnBody(ctx, o, vp, k.top, k.bottom);
  // scales
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let y = 10; y < vp.h; y += 22) ctx.fillRect(o.x + 8, y, o.w - 16, 8);
  fangs(ctx, o, o.gapY, true, "#f4ecd8", 16);
  fangs(ctx, o, o.gapY + o.gapH, false, "#f4ecd8", 16);
  ctx.fillStyle = "#d8e84a";
  for (const ex of [o.x + o.w * 0.3, o.x + o.w * 0.7]) {
    ctx.beginPath();
    ctx.ellipse(ex, o.gapY - 34, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1a1a0a";
  for (const ex of [o.x + o.w * 0.3, o.x + o.w * 0.7]) {
    ctx.beginPath();
    ctx.ellipse(ex, o.gapY - 34, 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSimhika(ctx: Ctx, o: Obstacle, vp: Viewport) {
  const k = KINDS.simhika;
  columnBody(ctx, o, vp, k.top, k.bottom);
  caps(ctx, o, "rgba(120, 200, 210, 0.5)");
}

/** Procedural rakshasa: armoured body, horns, burning eyes, fanged jaw facing the gap. */
function drawRakshasa(ctx: Ctx, o: Obstacle, top: boolean, y0: number, y1: number) {
  const h = y1 - y0;
  if (h <= 4) return;
  const s = o.w / OB_W;
  const X = (u: number) => o.x + u * s;
  const body = ctx.createLinearGradient(o.x, y0, o.x + o.w, y1);
  body.addColorStop(0, "#6d1a24");
  body.addColorStop(0.55, "#3d0b12");
  body.addColorStop(1, "#1b0407");
  ctx.fillStyle = body;
  ctx.fillRect(o.x, y0, o.w, h);

  ctx.fillStyle = "rgba(255,190,110,0.10)";
  for (let y = y0 + 12; y < y1 - 6; y += 26) ctx.fillRect(o.x + 6, y, o.w - 12, 6);

  const faceY = top ? y1 - 46 : y0 + 46;
  const dir = top ? -1 : 1;

  ctx.fillStyle = "#e3b23c";
  ctx.beginPath();
  ctx.moveTo(X(10), faceY + dir * 14);
  ctx.quadraticCurveTo(X(2), faceY - dir * 16, X(26), faceY - dir * 26);
  ctx.quadraticCurveTo(X(18), faceY - dir * 6, X(24), faceY + dir * 12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(74), faceY + dir * 14);
  ctx.quadraticCurveTo(X(82), faceY - dir * 16, X(58), faceY - dir * 26);
  ctx.quadraticCurveTo(X(66), faceY - dir * 6, X(60), faceY + dir * 12);
  ctx.fill();

  const cx = o.x + o.w / 2;
  const glow = ctx.createRadialGradient(cx, faceY, 1, cx, faceY, 30 * s);
  glow.addColorStop(0, "rgba(255,140,40,0.55)");
  glow.addColorStop(1, "rgba(255,90,20,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, faceY, 30 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb545";
  for (const ex of [X(28), X(56)]) {
    ctx.beginPath();
    ctx.ellipse(ex, faceY, 7 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#320404";
  for (const ex of [X(28), X(56)]) {
    ctx.beginPath();
    ctx.ellipse(ex, faceY, 2 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  fangs(ctx, o, top ? y1 : y0, top, "#f1e2c4");
}

/** The boss: a gate arch behind a crowned, wider rakshasi. */
function drawLankini(ctx: Ctx, o: Obstacle, vp: Viewport) {
  const sea = vp.h - vp.seaH;
  // gate arch
  ctx.strokeStyle = "rgba(255, 210, 120, 0.7)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(o.x - 22, sea);
  ctx.lineTo(o.x - 22, o.gapY + 30);
  ctx.arc(o.x + o.w / 2, o.gapY + 30, o.w / 2 + 22, Math.PI, 0);
  ctx.lineTo(o.x + o.w + 22, sea);
  ctx.stroke();
  drawRakshasa(ctx, o, true, 0, o.gapY);
  drawRakshasa(ctx, o, false, o.gapY + o.gapH, sea);
  // crown on the upper face
  ctx.fillStyle = "#ffd76a";
  const crownY = o.gapY - 74;
  ctx.beginPath();
  ctx.moveTo(o.x + 14, crownY);
  for (let i = 0; i < 5; i++) {
    const px = o.x + 14 + ((o.w - 28) * i) / 4;
    ctx.lineTo(px, crownY - (i % 2 === 0 ? 22 : 8));
  }
  ctx.lineTo(o.x + o.w - 14, crownY);
  ctx.closePath();
  ctx.fill();
}

/** Ashoka tree: hanging canopy above, trunk with a crown of leaves below. */
function drawTree(ctx: Ctx, o: Obstacle, vp: Viewport) {
  const k = KINDS.tree;
  // canopy above
  const g1 = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
  g1.addColorStop(0, k.top);
  g1.addColorStop(1, k.bottom);
  ctx.fillStyle = g1;
  ctx.fillRect(o.x, 0, o.w, o.gapY - 10);
  puffs(ctx, o, o.gapY - 12, "#3d6a2a", 22);
  // trunk below
  const tx = o.x + o.w * 0.3;
  const tw = o.w * 0.4;
  const g2 = ctx.createLinearGradient(tx, 0, tx + tw, 0);
  g2.addColorStop(0, "#6b4a2b");
  g2.addColorStop(1, "#3a2413");
  ctx.fillStyle = g2;
  ctx.fillRect(tx, o.gapY + o.gapH, tw, vp.h - o.gapY - o.gapH);
  puffs(ctx, o, o.gapY + o.gapH + 14, "#3d6a2a", 24);
  puffs(ctx, o, o.gapY + o.gapH + 2, "#4f7d35", 16);
}

/**
 * A house on Vibhishana's street. The open door (the gap) is marked with a Tulsi
 * plant and राम; painted doorways elsewhere on the wall are decoys.
 */
function drawHouse(ctx: Ctx, o: Obstacle, vp: Viewport, t: number) {
  const k = KINDS.house;
  const sea = vp.h - vp.seaH;
  columnBody(ctx, o, vp, k.top, k.bottom);
  // brick courses
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  for (let y = 10; y < sea; y += 22) ctx.fillRect(o.x + 4, y, o.w - 8, 3);
  // decoy doorways: dark arches on solid wall
  for (const dy of o.decoys ?? []) {
    const y = dy * vp.h;
    ctx.fillStyle = "#2a1408";
    ctx.beginPath();
    ctx.moveTo(o.x + 18, y + 28);
    ctx.lineTo(o.x + 18, y);
    ctx.arc(o.x + o.w / 2, y, o.w / 2 - 18, Math.PI, 0);
    ctx.lineTo(o.x + o.w - 18, y + 28);
    ctx.closePath();
    ctx.fill();
  }
  // lintel and threshold of the real door
  ctx.fillStyle = "#e9c265";
  ctx.fillRect(o.x - 4, o.gapY - 10, o.w + 8, 10);
  ctx.fillRect(o.x - 4, o.gapY + o.gapH, o.w + 8, 8);
  // Tulsi in a pot on the threshold
  const px = o.x + o.w / 2;
  const py = o.gapY + o.gapH;
  ctx.fillStyle = "#b8552a";
  ctx.fillRect(px - 8, py - 12, 16, 12);
  ctx.fillStyle = "#3d8a3a";
  for (const [dx, dyy, r] of [
    [0, -22, 8],
    [-8, -16, 6],
    [8, -16, 6],
  ] as const) {
    ctx.beginPath();
    ctx.arc(px + dx, py + dyy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // राम on the lintel, glowing softly
  const pulse = 0.75 + 0.25 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(255, 245, 200, ${pulse})`;
  ctx.font = '700 15px "Noto Sans Devanagari", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("राम", px, o.gapY - 16);
}

/** An Ashoka vriksha: standing, or torn down by the hero. */
function drawVriksha(ctx: Ctx, o: Obstacle, vp: Viewport) {
  if (!o.smashed) return drawTree(ctx, o, vp);
  const sea = vp.h - vp.seaH;
  // broken trunk stump and a scatter of leaves on the ground
  const tx = o.x + o.w * 0.3;
  const tw = o.w * 0.4;
  ctx.fillStyle = "#4a3018";
  ctx.fillRect(tx, sea - 40, tw, 40);
  ctx.fillStyle = "#6b4a2b";
  ctx.beginPath();
  ctx.moveTo(tx, sea - 40);
  ctx.lineTo(tx + tw * 0.3, sea - 58);
  ctx.lineTo(tx + tw * 0.6, sea - 44);
  ctx.lineTo(tx + tw, sea - 52);
  ctx.lineTo(tx + tw, sea - 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(61, 106, 42, 0.8)";
  for (const [dx, r] of [
    [-20, 9],
    [6, 12],
    [30, 8],
    [52, 10],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2 + dx, sea - 6, r, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Meghnad's volley: a curtain of golden arrows above and below the opening. */
function drawAstra(ctx: Ctx, o: Obstacle, vp: Viewport, t: number) {
  const sea = vp.h - vp.seaH;
  const shaft = (x: number, y0: number, y1: number, down: boolean) => {
    ctx.strokeStyle = "#e9c265";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    // head at the gap edge, fletching at the far end
    const tip = down ? y1 : y0;
    const dir = down ? 1 : -1;
    ctx.fillStyle = "#fff0b0";
    ctx.beginPath();
    ctx.moveTo(x, tip + dir * 8);
    ctx.lineTo(x - 5, tip - dir * 4);
    ctx.lineTo(x + 5, tip - dir * 4);
    ctx.closePath();
    ctx.fill();
    const tail = down ? y0 : y1;
    ctx.strokeStyle = "#c4501b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, tail);
    ctx.lineTo(x - 6, tail - dir * 10);
    ctx.moveTo(x, tail);
    ctx.lineTo(x + 6, tail - dir * 10);
    ctx.stroke();
  };
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = o.x + 12 + (i * (o.w - 24)) / (n - 1);
    const wobble = Math.sin(t * 7 + i) * 3;
    shaft(x, -20, o.gapY - 8 + wobble, true);
    shaft(x, o.gapY + o.gapH + 8 - wobble, sea + 20, false);
  }
  // heat shimmer where the volley is densest
  ctx.fillStyle = "rgba(255, 215, 94, 0.12)";
  ctx.fillRect(o.x, 0, o.w, o.gapY);
  ctx.fillRect(o.x, o.gapY + o.gapH, o.w, sea - o.gapY - o.gapH);
}

/** Golden tower with battlements and flames at the cut. */
function drawTower(ctx: Ctx, o: Obstacle, vp: Viewport, t: number) {
  const k = KINDS.tower;
  columnBody(ctx, o, vp, k.top, k.bottom);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 8; y < vp.h; y += 24) ctx.fillRect(o.x + 6, y, o.w - 12, 4);
  // battlements
  ctx.fillStyle = "#e9c265";
  for (const edgeY of [o.gapY, o.gapY + o.gapH]) {
    const up = edgeY === o.gapY;
    for (let i = 0; i < 4; i++) {
      const bx = o.x - 4 + i * ((o.w + 8) / 4);
      ctx.fillRect(bx, up ? edgeY - 12 : edgeY, (o.w + 8) / 8, 12);
    }
  }
  // flames
  for (let i = 0; i < 5; i++) {
    const fx = o.x + 8 + i * (o.w / 5);
    const flick = Math.sin(t * 14 + i * 1.7) * 6;
    for (const [edgeY, sign] of [
      [o.gapY, 1],
      [o.gapY + o.gapH, -1],
    ] as const) {
      const base = edgeY;
      ctx.fillStyle = i % 2 ? "rgba(255,140,30,0.85)" : "rgba(255,210,60,0.85)";
      ctx.beginPath();
      ctx.moveTo(fx, base);
      ctx.lineTo(fx + 6, base + sign * (22 + flick));
      ctx.lineTo(fx + 12, base);
      ctx.fill();
    }
  }
}

export function drawObstacle(ctx: Ctx, o: Obstacle, world: World, vp: Viewport) {
  switch (o.kind) {
    case "cloud":
      return drawCloud(ctx, o, vp);
    case "wave":
      return drawWave(ctx, o, vp, world.t);
    case "mainaka":
      return drawMainaka(ctx, o, vp, world.t);
    case "surasa":
      return drawSurasa(ctx, o, vp);
    case "simhika":
      return drawSimhika(ctx, o, vp);
    case "rakshasa":
      drawRakshasa(ctx, o, true, 0, o.gapY);
      drawRakshasa(ctx, o, false, o.gapY + o.gapH, vp.h - vp.seaH);
      return;
    case "lankini":
      return drawLankini(ctx, o, vp);
    case "house":
      return drawHouse(ctx, o, vp, world.t);
    case "tree":
      return drawTree(ctx, o, vp);
    case "vriksha":
      return drawVriksha(ctx, o, vp);
    case "astra":
      return drawAstra(ctx, o, vp, world.t);
    case "tower":
      return drawTower(ctx, o, vp, world.t);
  }
}

/** Effects that sit on top of the sea (drawn after it): Simhika's shadow and tendril. */
export function drawObstacleFx(ctx: Ctx, o: Obstacle, world: World, vp: Viewport) {
  if (o.kind !== "simhika") return;
  const sea = vp.h - vp.seaH;
  const cx = o.x + o.w / 2;
  ctx.fillStyle = "rgba(5, 20, 30, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx, sea + vp.seaH * 0.5, o.w / 2 + SIMHIKA_BAND, vp.seaH * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  if (o.shadowing) {
    const hx = vp.heroX;
    const grad = ctx.createLinearGradient(hx, world.y, hx, sea);
    grad.addColorStop(0, "rgba(40, 90, 110, 0)");
    grad.addColorStop(1, "rgba(10, 40, 55, 0.7)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10 + Math.sin(world.t * 9) * 3;
    ctx.beginPath();
    ctx.moveTo(hx, world.y + 20);
    ctx.quadraticCurveTo(hx + 30, (world.y + sea) / 2, cx, sea + 6);
    ctx.stroke();
  }
}

/** Obstacle name, drawn in an un-mirrored pass so text reads correctly on the way home. */
export function drawObstacleLabel(ctx: Ctx, o: Obstacle, vp: Viewport, mirror: boolean) {
  if (o.smashed) return;
  const cx = o.x + o.w / 2;
  const x = mirror ? vp.w - cx : cx;
  const y = o.kind === "mainaka" ? Math.max(20, o.gapH - 44) : Math.max(20, o.gapY - 24);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(KINDS[o.kind].name, x, y);
}
