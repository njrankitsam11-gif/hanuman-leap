/**
 * Gameplay telemetry. The game only ever calls `track(event)`; the provider lives
 * here so swapping Vercel Web Analytics for PostHog (or nothing) is a one-file change.
 *
 * Nothing personal is sent: chapter indices, obstacle kinds, counts, and the language.
 * Do-Not-Track is honoured. On Vercel's Hobby plan custom events are accepted but not
 * shown; page views are. They appear as soon as the project is on Pro.
 */
import { inject, track as vercelTrack } from "@vercel/analytics";
import type { ObstacleKindId } from "@/game/chapters/types";
import type { Lang } from "@/game/storage";

export type AnalyticsEvent =
  | { name: "run_start"; chapter: number; fresh: boolean; easy: boolean; lang: Lang }
  | { name: "chapter_start"; chapter: number }
  | { name: "chapter_clear"; chapter: number; deaths: number; punya: number }
  | { name: "death"; chapter: number; kind: ObstacleKindId | "wall"; passes: number }
  | { name: "won"; deaths: number; punya: number; easy: boolean }
  | { name: "settings"; key: "muted" | "haptics" | "easy" | "lang"; value: string }
  | { name: "install" };

let ready = false;

function optedOut(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1";
}

/** Call once on the client; page views start flowing from here. */
export function initAnalytics() {
  if (ready || optedOut()) return;
  ready = true;
  try {
    inject({ debug: false });
  } catch {
    ready = false;
  }
}

export function track(event: AnalyticsEvent) {
  if (!ready) return;
  const { name, ...props } = event;
  try {
    vercelTrack(name, props);
  } catch {
    // never let telemetry break the game
  }
}
