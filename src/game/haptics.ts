/**
 * Haptic feedback. On the web this is `navigator.vibrate` (Android Chrome/Firefox;
 * iOS Safari has no API). The native build swaps in Capacitor's Haptics plugin
 * through `setHapticBackend`, so the game code only ever calls `haptic(name)`.
 *
 * Patterns are short on purpose — a flap must never buzz, only real events do.
 */

export type HapticName = "hit" | "collect" | "chapter" | "win";

export type HapticBackend = (name: HapticName) => void;

const PATTERNS: Record<HapticName, number | number[]> = {
  hit: 60,
  collect: 15,
  chapter: [20, 40, 20],
  win: [30, 50, 30, 50, 60],
};

let enabled = true;

function webBackend(name: HapticName) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[name]);
  } catch {
    // some browsers throw when called outside a user gesture; feedback is best-effort
  }
}

let backend: HapticBackend = webBackend;

/** Whether this platform can buzz at all — the settings toggle hides itself otherwise. */
export function hapticsSupported(): boolean {
  if (backend !== webBackend) return true;
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export const hapticsEnabled = () => enabled;

export function setHapticBackend(b: HapticBackend | null) {
  backend = b ?? webBackend;
}

export function haptic(name: HapticName) {
  if (!enabled) return;
  backend(name);
}
