import type { Mode } from "./achievements";
import { isReady } from "./assets";
import { HERO_SRC } from "./constants";
import type { Lang } from "./storage";
import { platform } from "@/platform";

export const SITE_URL = "https://hanuman-leap.vercel.app";

export type ShareData = {
  mode: Mode;
  lang: Lang;
  punya: number;
  passes: number;
  /** 1-based chapter number and its Devanagari title (story mode). */
  chapter: number;
  chapterTitle: string;
  chapterCount: number;
  won: boolean;
  /** One Devanagari line to set the mood. */
  verseLine: string;
  /** IST day key for the daily. */
  date: string;
  hero: HTMLImageElement;
};

export type ShareOutcome = "shared" | "copied" | "failed";

const SIZE = 1080;

const F = (weight: number, px: number, devanagari = false) =>
  `${weight} ${px}px ${devanagari ? '"Noto Sans Devanagari", ' : ""}system-ui, -apple-system, "Segoe UI", sans-serif`;

/** The sentence that goes with the image (and stands in for it where files can't be shared). */
export function shareText(d: ShareData): string {
  const n = d.punya.toLocaleString("en-IN");
  if (d.mode === "daily") {
    return d.lang === "hi"
      ? `आज की उड़ान (${d.date}): ${d.passes} छलाँगें, ${n} पुण्य। क्या आप आगे निकल सकते हैं?`
      : `Today's Leap (${d.date}): ${d.passes} leaps, ${n} punya. Can you fly farther?`;
  }
  if (d.mode === "endless") {
    return d.lang === "hi"
      ? `अखंड उड़ान में ${d.passes} छलाँगें और ${n} पुण्य — हनुमान की लंका-छलाँग।`
      : `${d.passes} leaps and ${n} punya in Endless Flight — Hanuman's Leap to Lanka.`;
  }
  if (d.won) {
    return d.lang === "hi"
      ? `चूड़ामणि राम तक पहुँचा दी — ${n} पुण्य के साथ सुंदरकांड पूरा।`
      : `Delivered the Chudamani to Ram — the Sundarkand complete with ${n} punya.`;
  }
  return d.lang === "hi"
    ? `हनुमान की लंका-छलाँग: ${n} पुण्य, अध्याय ${d.chapter}/${d.chapterCount} ${d.chapterTitle}।`
    : `Hanuman's Leap to Lanka: ${n} punya, chapter ${d.chapter}/${d.chapterCount} ${d.chapterTitle}.`;
}

/** Paint the 1080×1080 card. Pure canvas; testable with a stub context. */
export function drawShareCard(ctx: CanvasRenderingContext2D, d: ShareData) {
  const story = d.mode === "story";
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  if (story) {
    bg.addColorStop(0, "#f0a054");
    bg.addColorStop(1, "#c4501b");
  } else {
    bg.addColorStop(0, "#1f7d8c");
    bg.addColorStop(1, "#0d4a57");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const glow = ctx.createRadialGradient(SIZE * 0.5, SIZE * 0.42, 10, SIZE * 0.5, SIZE * 0.42, 420);
  glow.addColorStop(0, "rgba(255, 226, 160, 0.55)");
  glow.addColorStop(1, "rgba(255, 226, 160, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // hero, flying in from the left
  if (isReady(d.hero)) {
    const w = 620;
    const h = (w * HERO_SRC.h) / HERO_SRC.w;
    ctx.save();
    ctx.translate(SIZE * 0.5, SIZE * 0.42);
    ctx.rotate(-0.12);
    ctx.drawImage(d.hero, HERO_SRC.x, HERO_SRC.y, HERO_SRC.w, HERO_SRC.h, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = F(600, 30);
  const eyebrow =
    d.mode === "daily"
      ? d.lang === "hi"
        ? `आज की उड़ान · ${d.date}`
        : `TODAY'S LEAP · ${d.date}`
      : d.mode === "endless"
        ? d.lang === "hi"
          ? "अखंड उड़ान"
          : "ENDLESS FLIGHT"
        : d.lang === "hi"
          ? "सुंदरकांड"
          : "SUNDARA KANDA";
  ctx.font = F(600, 30, d.lang === "hi");
  ctx.fillText(eyebrow, SIZE / 2, 96);

  ctx.fillStyle = "#fff";
  ctx.font = F(800, 64, d.lang === "hi");
  ctx.fillText(d.lang === "hi" ? "हनुमान की लंका-छलाँग" : "Hanuman's Leap to Lanka", SIZE / 2, 172);

  // the number
  ctx.font = F(800, 150);
  ctx.fillText(d.punya.toLocaleString("en-IN"), SIZE / 2, 790);
  ctx.font = F(600, 40, d.lang === "hi");
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const sub = story
    ? d.won
      ? d.lang === "hi"
        ? "पुण्य · चूड़ामणि पहुँचा दी"
        : "punya · the Chudamani delivered"
      : d.lang === "hi"
        ? `पुण्य · अध्याय ${d.chapter}/${d.chapterCount} · ${d.chapterTitle}`
        : `punya · chapter ${d.chapter}/${d.chapterCount} · ${d.chapterTitle}`
    : d.lang === "hi"
      ? `पुण्य · ${d.passes} छलाँगें`
      : `punya · ${d.passes} leaps`;
  ctx.fillText(sub, SIZE / 2, 850);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = F(400, 34, true);
  ctx.fillText(d.verseLine, SIZE / 2, 940);

  ctx.font = F(600, 28);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(SITE_URL.replace("https://", ""), SIZE / 2, 1020);
}

async function renderPng(d: ShareData): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  try {
    await Promise.all([
      document.fonts.load(F(800, 64, true)),
      document.fonts.load(F(400, 34, true)),
    ]);
  } catch {
    // fall back to whatever font is available
  }
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawShareCard(ctx, d);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Share the result: an image where the platform can (Android Chrome, iOS Safari),
 * the sentence plus link where it can't, and the clipboard as the last resort.
 */
export async function shareResult(d: ShareData): Promise<ShareOutcome> {
  const text = shareText(d);
  const title = d.lang === "hi" ? "हनुमान की लंका-छलाँग" : "Hanuman's Leap to Lanka";

  const native = platform().share;
  if (native) return (await native({ title, text, url: SITE_URL })) ? "shared" : "failed";

  if (typeof navigator === "undefined") return "failed";
  try {
    if (typeof navigator.share === "function") {
      const blob = await renderPng(d);
      if (blob && typeof navigator.canShare === "function") {
        const file = new File([blob], "hanuman-leap.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          return "shared";
        }
      }
      await navigator.share({ title, text, url: SITE_URL });
      return "shared";
    }
  } catch (e) {
    // user dismissed the sheet: not a failure worth a fallback
    if (e instanceof DOMException && e.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(`${text} ${SITE_URL}`);
    return "copied";
  } catch {
    return "failed";
  }
}
