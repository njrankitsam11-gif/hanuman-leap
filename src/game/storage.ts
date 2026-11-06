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

/** Cloud sync's hook: told after every write. Returns an unsubscribe. */
const writeListeners = new Set<() => void>();

export function onSaveWrite(fn: () => void): () => void {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
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
  /** Background music (tanpura + raga phrase); separate from `muted`, which silences all. */
  music: boolean;
  haptics: boolean;
  lang: Lang;
  /** "Sahaj" mode: wider gaps, slower scroll. */
  easy: boolean;
  /** The first-run hint has been shown. */
  hinted: boolean;
  stats: Stats;
  /** Best punya in Endless Flight. */
  endlessBest: number;
  /** Best punya in today's Daily Leap (date is the IST day key). */
  daily: { date: string; best: number };
  /** Unlocked achievement ids, in unlock order. */
  achievements: string[];
};

/**
 * v3 (2026-09-15): two chapters were inserted into the arc (Vibhishana at 5,
 * Vatika-vidhvans at 7), so chapter indices in a v2 save must be remapped.
 */
export type SaveV3 = Omit<SaveV2, "v"> & { v: 3 };

/** Old story index → new story index. */
const V2_TO_V3_CHAPTER = [0, 1, 2, 3, 4, 6, 8, 9] as const;

export type Save = SaveV3;

export const DEFAULT_STATS: Stats = {
  runs: 0,
  leaps: 0,
  deaths: 0,
  wins: 0,
  flawless: 0,
  chapters: [],
};

export const DEFAULT_SAVE: SaveV3 = {
  v: 3,
  best: 0,
  unlockedChapter: 0,
  muted: false,
  music: true,
  haptics: true,
  lang: "en",
  easy: false,
  hinted: false,
  stats: DEFAULT_STATS,
  endlessBest: 0,
  daily: { date: "", best: 0 },
  achievements: [],
};

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === "boolean";
const isLang = (x: unknown): x is Lang => x === "hi" || x === "en";

function isV1(x: unknown): x is SaveV1 {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return s["v"] === 1 && isNum(s["best"]) && isBool(s["muted"]) && isNum(s["unlockedChapter"]);
}

function isV2Shape(x: unknown, v: 2 | 3): boolean {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    s["v"] === v &&
    isNum(s["best"]) &&
    isNum(s["unlockedChapter"]) &&
    isBool(s["muted"]) &&
    isBool(s["haptics"]) &&
    isLang(s["lang"]) &&
    isBool(s["easy"]) &&
    isBool(s["hinted"]) &&
    typeof s["stats"] === "object" &&
    s["stats"] !== null
    // fields added later (music, endlessBest, daily, achievements) are back-filled by migrate
  );
}
const isV2 = (x: unknown): x is SaveV2 => isV2Shape(x, 2);
const isV3 = (x: unknown): x is SaveV3 => isV2Shape(x, 3);

/** Fill in fields a v2/v3 record may predate. */
function backfill(raw: SaveV2 | SaveV3): SaveV3 {
  const merged: SaveV3 = {
    ...DEFAULT_SAVE,
    ...raw,
    v: 3,
    stats: { ...DEFAULT_STATS, ...raw.stats },
  };
  if (!Array.isArray(merged.achievements)) merged.achievements = [];
  if (typeof merged.daily?.best !== "number") merged.daily = { date: "", best: 0 };
  return merged;
}

/** Move v2 chapter indices (8-chapter arc) onto the 10-chapter arc. */
export function remapChaptersV2(save: SaveV2): SaveV3 {
  const s = backfill(save);
  const map = (i: number) => V2_TO_V3_CHAPTER[Math.max(0, Math.min(7, i))] ?? 0;
  const chapters: Stats["chapters"] = [];
  save.stats.chapters?.forEach((c, i) => {
    if (i < V2_TO_V3_CHAPTER.length) {
      const j = map(i);
      while (chapters.length <= j) chapters.push({ clears: 0, deaths: 0 });
      chapters[j] = c;
    }
  });
  return { ...s, unlockedChapter: map(save.unlockedChapter), stats: { ...s.stats, chapters } };
}

/** The preferred UI language for a fresh save: Hindi when the browser says so. */
export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language ?? ""];
  return langs.some((l) => l.toLowerCase().startsWith("hi")) ? "hi" : "en";
}

/** Bring any stored shape up to the current version; unknown shapes become the default. */
export function migrate(raw: unknown, fresh: () => SaveV3 = () => DEFAULT_SAVE): SaveV3 {
  if (isV3(raw)) return backfill(raw);
  if (isV2(raw)) return remapChaptersV2(raw);
  if (isV1(raw)) {
    return {
      ...fresh(),
      best: raw.best,
      muted: raw.muted,
      unlockedChapter: V2_TO_V3_CHAPTER[Math.max(0, Math.min(7, raw.unlockedChapter))] ?? 0,
      // a returning player has seen plenty of taps already
      hinted: raw.best > 0 || raw.unlockedChapter > 0,
    };
  }
  return fresh();
}

const freshSave = (): SaveV3 => ({ ...DEFAULT_SAVE, lang: detectLang() });

export function loadSave(): SaveV3 {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return freshSave();
    return migrate(JSON.parse(raw) as unknown, freshSave);
  } catch {
    return freshSave();
  }
}

function write(next: SaveV3) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, json);
  } catch {
    // quota exceeded or storage disabled — the in-memory value still wins this session
  }
  mirror?.(json);
  writeListeners.forEach((fn) => fn());
}

/** Shallow-merge a patch into the stored save and return the result. */
export function saveGame(patch: Partial<Omit<SaveV3, "v" | "stats">>): SaveV3 {
  const next: SaveV3 = { ...loadSave(), ...patch, v: 3 };
  write(next);
  return next;
}

/** Apply a stats update against the stored record and return the new save. */
export function updateStats(fn: (stats: Stats) => Stats): SaveV3 {
  const cur = loadSave();
  const next: SaveV3 = { ...cur, stats: fn({ ...cur.stats, chapters: [...cur.stats.chapters] }) };
  write(next);
  return next;
}

/** Forget progress and stats; keep preferences (sound, haptics, language, easy). */
export function resetProgress(): SaveV3 {
  const cur = loadSave();
  const next: SaveV3 = {
    ...cur,
    best: 0,
    unlockedChapter: 0,
    hinted: false,
    stats: DEFAULT_STATS,
    endlessBest: 0,
    daily: { date: "", best: 0 },
    achievements: [],
  };
  write(next);
  return next;
}

/** A save arriving from outside (the cloud API): the current shape, or null if it isn't one. */
export function parseSave(raw: unknown): SaveV3 | null {
  if (!isV3(raw)) return null;
  const save = backfill(raw);
  return Array.isArray(save.stats.chapters) ? save : null;
}

/**
 * Combine two devices' progress. Progress only ever grows, so each field keeps the
 * furthest value and nothing earned on either device is lost. Preferences stay `local`'s:
 * sound and language belong to the device in hand. Pure; the server runs it too.
 */
export function mergeSaves(local: SaveV3, remote: SaveV3): SaveV3 {
  const a = local.stats;
  const b = remote.stats;
  const chapters: Stats["chapters"] = [];
  for (let i = 0; i < Math.max(a.chapters.length, b.chapters.length); i++) {
    const x = a.chapters[i] ?? { clears: 0, deaths: 0 };
    const y = b.chapters[i] ?? { clears: 0, deaths: 0 };
    chapters.push({ clears: Math.max(x.clears, y.clears), deaths: Math.max(x.deaths, y.deaths) });
  }
  const daily =
    local.daily.date === remote.daily.date
      ? { date: local.daily.date, best: Math.max(local.daily.best, remote.daily.best) }
      : local.daily.date > remote.daily.date
        ? local.daily
        : remote.daily;
  return {
    ...local,
    best: Math.max(local.best, remote.best),
    unlockedChapter: Math.max(local.unlockedChapter, remote.unlockedChapter),
    hinted: local.hinted || remote.hinted,
    endlessBest: Math.max(local.endlessBest, remote.endlessBest),
    daily,
    achievements: [...new Set([...local.achievements, ...remote.achievements])],
    stats: {
      runs: Math.max(a.runs, b.runs),
      leaps: Math.max(a.leaps, b.leaps),
      deaths: Math.max(a.deaths, b.deaths),
      wins: Math.max(a.wins, b.wins),
      flawless: Math.max(a.flawless, b.flawless),
      chapters,
    },
  };
}

/** Overwrite the stored save with a merged one from the cloud. */
export function replaceSave(next: SaveV3) {
  write(next);
}

/** Stats helpers, pure so they're testable and reusable by the native build. */
export function bumpChapter(stats: Stats, chapter: number, field: "clears" | "deaths"): Stats {
  const chapters = [...stats.chapters];
  while (chapters.length <= chapter) chapters.push({ clears: 0, deaths: 0 });
  const c = chapters[chapter]!;
  chapters[chapter] = { ...c, [field]: c[field] + 1 };
  return { ...stats, chapters };
}
