/**
 * localStorage persistence. Every access is guarded: SSR has no `window`, Safari
 * private mode throws on write, and a corrupted value should never crash the game.
 */

const KEY = "hanuman-leap:v1";

export type SaveV1 = {
  v: 1;
  best: number;
  muted: boolean;
  unlockedChapter: number;
};

export const DEFAULT_SAVE: SaveV1 = { v: 1, best: 0, muted: false, unlockedChapter: 0 };

function isSave(x: unknown): x is SaveV1 {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    s["v"] === 1 &&
    typeof s["best"] === "number" &&
    typeof s["muted"] === "boolean" &&
    typeof s["unlockedChapter"] === "number"
  );
}

export function loadSave(): SaveV1 {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SAVE;
    const parsed: unknown = JSON.parse(raw);
    return isSave(parsed) ? parsed : DEFAULT_SAVE;
  } catch {
    return DEFAULT_SAVE;
  }
}

/** Shallow-merge a patch into the stored save and return the result. */
export function saveGame(patch: Partial<Omit<SaveV1, "v">>): SaveV1 {
  const next: SaveV1 = { ...loadSave(), ...patch, v: 1 };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota exceeded or storage disabled — the in-memory value still wins this session
  }
  return next;
}
