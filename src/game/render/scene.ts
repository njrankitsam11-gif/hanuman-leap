import type { Chapter } from "../chapters/types";
import { FINALE_SLOW_S } from "../engine";
import type { Viewport, World } from "../types";

type Ctx = CanvasRenderingContext2D;

/** Where the ring/hero action lands, as a fraction of W. */
const SCENE_X = 0.62;
/** Ring flight window (seconds into the finale). */
const RING_FROM = 1.2;
const RING_TO = 2.0;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export const isSceneActive = (world: World, ch: Chapter) =>
  ch.goal.kind === "finale" && world.phase !== "run";

/** Slide-in progress of the scene set piece. */
const progress = (world: World) => easeOut(clamp01(world.finaleT / FINALE_SLOW_S));

/** The hero drifts toward the set piece during a finale. */
export function sceneHeroX(world: World, vp: Viewport, ch: Chapter): number {
  if (!isSceneActive(world, ch)) return vp.heroX;
  const target = vp.w * SCENE_X - (ch.goal.kind === "finale" && ch.goal.scene === "ram" ? 90 : 24);
  return vp.heroX + (target - vp.heroX) * progress(world);
}

function sitaPos(world: World, vp: Viewport) {
  const p = progress(world);
  const treeX = vp.w * SCENE_X + (1 - p) * vp.w * 0.6;
  const sea = vp.h - vp.seaH;
  return { treeX, sea, sitaX: treeX + 8, sitaY: sea - 30 };
}

function drawSitaScene(ctx: Ctx, world: World, vp: Viewport) {
  const { treeX, sea, sitaX, sitaY } = sitaPos(world, vp);
  // Shimshapa tree
  ctx.fillStyle = "#2b1a0e";
  ctx.fillRect(treeX - 14, vp.h * 0.32, 28, sea - vp.h * 0.32);
  ctx.fillStyle = "#213d1a";
  for (const [dx, dy, r] of [
    [-60, 0.3, 54],
    [0, 0.24, 62],
    [62, 0.31, 52],
    [-30, 0.4, 40],
    [34, 0.41, 40],
  ] as const) {
    ctx.beginPath();
    ctx.arc(treeX + dx, vp.h * dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // warm glow around Sita
  const glow = ctx.createRadialGradient(sitaX, sitaY, 4, sitaX, sitaY, 90);
  glow.addColorStop(0, "rgba(255, 200, 120, 0.45)");
  glow.addColorStop(1, "rgba(255, 200, 120, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sitaX, sitaY, 90, 0, Math.PI * 2);
  ctx.fill();
  // Sita, seated
  ctx.fillStyle = "#f3d9a4";
  ctx.beginPath();
  ctx.ellipse(sitaX, sitaY + 6, 22, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98a3a";
  ctx.beginPath();
  ctx.arc(sitaX, sitaY - 26, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2413";
  ctx.beginPath();
  ctx.arc(sitaX, sitaY - 30, 12, Math.PI, 0);
  ctx.fill();
}

/** The ring in flight, drawn above the hero. */
function drawRing(ctx: Ctx, world: World, vp: Viewport, heroX: number) {
  const { sitaX, sitaY } = sitaPos(world, vp);
  const t = clamp01((world.finaleT - RING_FROM) / (RING_TO - RING_FROM));
  if (t <= 0) return;
  const x0 = heroX + 30;
  const y0 = world.y + 10;
  const cx = (x0 + sitaX) / 2;
  const cy = Math.min(y0, sitaY) - 40;
  const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * sitaX;
  const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * (sitaY - 6);
  ctx.strokeStyle = "#ffd75e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 230, 140, 0.6)";
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawRamScene(ctx: Ctx, world: World, vp: Viewport) {
  const p = progress(world);
  const sea = vp.h - vp.seaH;
  const shoreX = vp.w * SCENE_X + (1 - p) * vp.w * 0.6;
  // shore
  ctx.fillStyle = "#d9b77a";
  ctx.beginPath();
  ctx.moveTo(shoreX - 40, vp.h);
  ctx.quadraticCurveTo(shoreX + 20, sea - 20, vp.w + 80, sea - 40);
  ctx.lineTo(vp.w + 80, vp.h);
  ctx.closePath();
  ctx.fill();
  const figure = (x: number, y: number, body: string, height: number) => {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y - height / 2, 14, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c98a3a";
    ctx.beginPath();
    ctx.arc(x, y - height - 8, 10, 0, Math.PI * 2);
    ctx.fill();
  };
  const groundY = sea - 22;
  // Ram (blue, with a bow) and Lakshman (gold)
  figure(shoreX + 30, groundY, "#3b5fa8", 60);
  ctx.strokeStyle = "#6b4a2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(shoreX + 14, groundY - 34, 34, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();
  figure(shoreX + 70, groundY + 2, "#d8a24a", 52);
  const glow = ctx.createRadialGradient(
    shoreX + 30,
    groundY - 30,
    4,
    shoreX + 30,
    groundY - 30,
    110,
  );
  glow.addColorStop(0, "rgba(255, 220, 150, 0.35)");
  glow.addColorStop(1, "rgba(255, 220, 150, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(shoreX + 30, groundY - 30, 110, 0, Math.PI * 2);
  ctx.fill();
}

/** Brahmastra window (seconds into the finale): the arrow streaks in, then coils bind. */
const ASTRA_FROM = 0.9;
const ASTRA_HIT = 1.5;

/** The world darkens to gold as Meghnad's astra is loosed. */
function drawCaptureScene(ctx: Ctx, world: World, vp: Viewport) {
  const p = progress(world);
  ctx.fillStyle = `rgba(120, 70, 10, ${0.35 * p})`;
  ctx.fillRect(0, 0, vp.w, vp.h);
}

/** The astra in flight, then golden coils around the hero. */
function drawCapture(ctx: Ctx, world: World, vp: Viewport, heroX: number) {
  const t = world.finaleT;
  if (t < ASTRA_FROM) return;
  if (t < ASTRA_HIT) {
    const k = easeOut(clamp01((t - ASTRA_FROM) / (ASTRA_HIT - ASTRA_FROM)));
    const x = vp.w + 60 + (heroX + 20 - (vp.w + 60)) * k;
    const y = world.y - 40 + 40 * k;
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 70, y - 12);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = "#fff0b0";
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x + 6, y - 7);
    ctx.lineTo(x + 6, y + 7);
    ctx.closePath();
    ctx.fill();
    return;
  }
  const k = clamp01((t - ASTRA_HIT) / 0.6);
  const glow = ctx.createRadialGradient(heroX, world.y, 6, heroX, world.y, 90);
  glow.addColorStop(0, `rgba(255, 220, 120, ${0.5 * k})`);
  glow.addColorStop(1, "rgba(255, 220, 120, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(heroX, world.y, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 215, 94, ${0.9 * k})`;
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    const rx = 48 - i * 4;
    const ry = 12 + i * 2;
    ctx.beginPath();
    ctx.ellipse(heroX, world.y - 18 + i * 12, rx * k, ry, -0.25, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Set piece behind the hero. */
export function drawScene(ctx: Ctx, world: World, vp: Viewport, ch: Chapter) {
  if (!isSceneActive(world, ch) || ch.goal.kind !== "finale") return;
  switch (ch.goal.scene) {
    case "sita":
      return drawSitaScene(ctx, world, vp);
    case "ram":
      return drawRamScene(ctx, world, vp);
    case "capture":
      return drawCaptureScene(ctx, world, vp);
  }
}

/** Parts that must sit above the hero. */
export function drawSceneFront(ctx: Ctx, world: World, vp: Viewport, ch: Chapter, heroX: number) {
  if (!isSceneActive(world, ch) || ch.goal.kind !== "finale") return;
  if (ch.goal.scene === "sita") drawRing(ctx, world, vp, heroX);
  if (ch.goal.scene === "capture") drawCapture(ctx, world, vp, heroX);
}
