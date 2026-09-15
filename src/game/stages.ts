import type { Kind } from "./types";

/** Obstacles follow the order of the Sundara Kanda crossing. */
export const KINDS = [
  { name: "Mainaka", top: "#8a5a2b", bottom: "#5a3617" },
  { name: "Surasa", top: "#7b2d4a", bottom: "#4a1529" },
  { name: "Simhika", top: "#2f5d63", bottom: "#163036" },
  { name: "Rakshasa", top: "#5b1620", bottom: "#2a070c" },
  { name: "Lankini", top: "#4a2a6b", bottom: "#1f0f33" },
] as const;

export type Stage = {
  name: string;
  line: string;
  speed: number;
  spawn: number;
  gap: number;
  kinds: readonly Kind[];
};

/** Five stages of the Sundara Kanda leap. */
export const STAGES = [
  {
    name: "Mahendra Parvata",
    line: "Hanuman swells in size and springs from the mountain toward the sea.",
    speed: 210,
    spawn: 1.7,
    gap: 220,
    kinds: [0, 0, 1],
  },
  {
    name: "Sagara's Waters",
    line: "Mainaka rises to offer rest; Hanuman touches it in respect and flies on.",
    speed: 235,
    spawn: 1.55,
    gap: 205,
    kinds: [0, 1, 1],
  },
  {
    name: "Surasa's Mouth",
    line: "Mother of serpents bars the way — grow vast, then shrink to a thumb and slip through.",
    speed: 255,
    spawn: 1.45,
    gap: 190,
    kinds: [1, 1, 2],
  },
  {
    name: "Simhika's Shadow",
    line: "The shadow-seizer drags him down; he tears through her and rises again.",
    speed: 275,
    spawn: 1.35,
    gap: 178,
    kinds: [2, 2, 3],
  },
  {
    name: "Shores of Lanka",
    line: "Rakshasa sentries patrol the ramparts and Lankini guards the golden gate.",
    speed: 300,
    spawn: 1.2,
    gap: 168,
    kinds: [3, 3, 4],
  },
] as const satisfies readonly [Stage, ...Stage[]];

export const LEAPS_PER_STAGE = 5;

export const stageFor = (leaps: number) =>
  Math.min(STAGES.length - 1, Math.floor(leaps / LEAPS_PER_STAGE));

export const stageAt = (level: number): Stage => STAGES[level] ?? STAGES[0];

/** Punya awarded for clearing one obstacle. Rakshasas are worth extra. */
export const scoreForPass = (level: number, kind: Kind) => 10 + level * 5 + (kind >= 3 ? 15 : 0);
