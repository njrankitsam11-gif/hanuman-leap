export type ObstacleKindId =
  "cloud" | "wave" | "mainaka" | "surasa" | "simhika" | "rakshasa" | "lankini" | "tree" | "tower";

export type SkyId = "morning" | "day" | "dusk" | "night" | "fire" | "dawn";

export type Verse = {
  /** e.g. "दोहा 1", "चौपाई 3.4–3.5", "सोरठा 12" */
  ref: string;
  /** Lines separated by "\n"; "।" ends a half-line, "॥" a full line. */
  devanagari: string;
  /** IAST-style, same line breaks. */
  transliteration: string;
  /** Plain English, one to three sentences. */
  meaning: string;
  /** The same rendering in Hindi (भावार्थ). */
  meaningHi: string;
  /** Must be true before shipping — a test enforces it. Set only after checking the text against a printed/Gita Press-derived source. */
  verified: boolean;
};

export type ChapterGoal =
  | { kind: "passes"; count: number }
  /** Spawn `after` sentries from the roster, then one boss; clearing the boss completes the chapter. */
  | { kind: "boss"; after: number }
  /** After `passes`, spawning stops and a scripted scene plays before the chapter clears. */
  | { kind: "finale"; passes: number; scene: "sita" | "ram" }
  /** Never clears; the run ends only on a hit. Difficulty ramps with passes. */
  | { kind: "endless" };

export type ChapterId =
  | "prelude"
  | "mainaka"
  | "surasa"
  | "simhika"
  | "lankini"
  | "vatika"
  | "dahan"
  | "return"
  | "endless";

export type Localized = { hi: string; en: string };

export type Chapter = {
  id: ChapterId;
  title: Localized;
  /** One line of context on the intro card. */
  intro: Localized;
  /** In-game caption. */
  caption: Localized;
  goal: ChapterGoal;
  difficulty: {
    /** Scroll speed, ·H per second. */
    speed: number;
    /** Seconds between spawns. */
    spawn: number;
    /** Gap height, ·H. */
    gap: number;
    /** Floor for the gap after per-pass shrinking, ·H. */
    gapMin: number;
  };
  /** Weighted kinds to spawn. */
  roster: ReadonlyArray<readonly [ObstacleKindId, number]>;
  sky: SkyId;
  scoreMul: number;
  /** Shown when the chapter is cleared (or on the win screen for the last chapter). */
  verse: Verse;
  /** Optional verse on the intro card. */
  introVerse?: Verse;
};
