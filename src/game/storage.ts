/**
 * localStorage persistence. Every access is guarded: SSR has no `window`, Safari
 * private mode throws on write, and a corrupted value should never crash the game.
 *
 * The record is versioned; `migrate` accepts every shape ever shipped and returns the
 * current one, so a save written by an old build is never thrown away.
 */

export const STORAGE_KEY = "hanuman-leap:v1";
const KEY = STORAGE_KEY;

/**
 * Optional secondary store. The native build mirrors every write into Capacitor
 * Preferences and restores from it at boot if the WebView's localStorage was
 * evicted, so an installed app never loses progress.
 */
let mirror: ((json: string) => void) | null = null;

export function setStorageMirror(fn: ((json: string) => void) | null) {
  mirror = fn;
}

/** Seed localStorage from a backup when it has nothing of its own (native boot). */
export function restoreSave(json: string | null) {
  if (typeof window === "undefined" || !json) return;
  try {
    if (!window.localStorage.getItem(KEY)) window.localStorage.setItem(KEY, json);
  } catch {
    // storage disabled; the in-memory defaults apply
  }
}

export type Lang = "hi" | "en";

/** Shipped in Phase 1–5. Kept so the migration is typed. */
export type SaveV1 = {
  v: 1;
  best: number;
  muted: boolean;
  unlockedChapter: number;
};

export type Stats = {
  /** Runs started from the shore or a chapter card. */
  runs: number;
  /** Columns cleared, all time. */
  leaps: number;
  deaths: number;
  wins: number;
  flawless: number;
  /** Per chapter (index into CHAPTERS): how often it was cleared and how often it killed. */
  chapters: { clears: number; deaths: number }[];
};

export type SaveV2 = {
  v: 2;
  best: number;
  unlockedChapter: number;
  muted: boolean;
  haptics: boolean;
  lang: Lang;
  /** "Sahaj" mode: wider gaps, slower scroll. */
  easy: boolean;
  /** The first-run hint has been shown. */
  hinted: boolean;
  stats: Stats;
};

export type Save = SaveV2;

export const DEFAULT_STATS: Stats = {
  runs: 0,
  leaps: 0,
  deaths: 0,
  wins: 0,
  flawless: 0,
  chapters: [],
};

export const DEFAULT_SAVE: SaveV2 = {
  v: 2,
  best: 0,
  unlockedChapter: 0,
  muted: false,
  haptics: true,
  lang: "en",
  easy: false,
  hinted: false,
  stats: DEFAULT_STATS,
};

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === "boolean";
const isLang = (x: unknown): x is Lang => x === "hi" || x === "en";

function isV1(x: unknown): x is SaveV1 {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return s["v"] === 1 && isNum(s["best"]) && isBool(s["muted"]) && isNum(s["unlockedChapter"]);
}

function isV2(x: unknown): x is SaveV2 {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    s["v"] === 2 &&
    isNum(s["best"]) &&
    isNum(s["unlockedChapter"]) &&
    isBool(s["muted"]) &&
    isBool(s["haptics"]) &&
    isLang(s["lang"]) &&
    isBool(s["easy"]) &&
    isBool(s["hinted"]) &&
    typeof s["stats"] === "object" &&
    s["stats"] !== null
  );
}

/** The preferred UI language for a fresh save: Hindi when the browser says so. */
export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language ?? ""];
  return langs.some((l) => l.toLowerCase().startsWith("hi")) ? "hi" : "en";
}

/** Bring any stored shape up to the current version; unknown shapes become the default. */
export function migrate(raw: unknown, fresh: () => SaveV2 = () => DEFAULT_SAVE): SaveV2 {
  if (isV2(raw)) return { ...raw, stats: { ...DEFAULT_STATS, ...raw.stats } };
  if (isV1(raw)) {
    return {
      ...fresh(),
      best: raw.best,
      muted: raw.muted,
      unlockedChapter: raw.unlockedChapter,
      // a returning player has seen plenty of taps already
      hinted: raw.best > 0 || raw.unlockedChapter > 0,
    };
  }
  return fresh();
}

const freshSave = (): SaveV2 => ({ ...DEFAULT_SAVE, lang: detectLang() });

export function loadSave(): SaveV2 {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return freshSave();
    return migrate(JSON.parse(raw) as unknown, freshSave);
  } catch {
    return freshSave();
  }
}

function write(next: SaveV2) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, json);
  } catch {
    // quota exceeded or storage disabled — the in-memory value still wins this session
  }
  mirror?.(json);
}

/** Shallow-merge a patch into the stored save and return the result. */
export function saveGame(patch: Partial<Omit<SaveV2, "v" | "stats">>): SaveV2 {
  const next: SaveV2 = { ...loadSave(), ...patch, v: 2 };
  write(next);
  return next;
}

/** Apply a stats update against the stored record and return the new save. */
export function updateStats(fn: (stats: Stats) => Stats): SaveV2 {
  const cur = loadSave();
  const next: SaveV2 = { ...cur, stats: fn({ ...cur.stats, chapters: [...cur.stats.chapters] }) };
  write(next);
  return next;
}

/** Forget progress and stats; keep preferences (sound, haptics, language, easy). */
export function resetProgress(): SaveV2 {
  const cur = loadSave();
  const next: SaveV2 = {
    ...cur,
    best: 0,
    unlockedChapter: 0,
    hinted: false,
    stats: DEFAULT_STATS,
  };
  write(next);
  return next;
}

/** Stats helpers, pure so they're testable and reusable by the native build. */
export function bumpChapter(stats: Stats, chapter: number, field: "clears" | "deaths"): Stats {
  const chapters = [...stats.chapters];
  while (chapters.length <= chapter) chapters.push({ clears: 0, deaths: 0 });
  const c = chapters[chapter]!;
  chapters[chapter] = { ...c, [field]: c[field] + 1 };
  return { ...stats, chapters };
}
