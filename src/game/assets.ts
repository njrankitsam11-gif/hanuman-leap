import hanumanSrc from "@/assets/hanuman.png";
import oceanSrc from "@/assets/ocean-bg.jpg";
import type { Assets } from "./types";

/** Client-only: constructs `Image`s, so call it from an effect, never at module scope. */
export function loadAssets(): Assets {
  const hero = new Image();
  hero.src = hanumanSrc;
  const bg = new Image();
  bg.src = oceanSrc;
  return { hero, bg };
}

export const isReady = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
