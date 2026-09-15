import type { Chapter } from "./types";
import { VERSES } from "./verses";

export * from "./types";
export { VERSES } from "./verses";

const GAP_MIN = 0.268;

/** The Sundarkand arc, in order. Difficulty: speed ·H/s, spawn s, gap ·H. */
export const CHAPTERS = [
  {
    id: "prelude",
    title: { hi: "जामवंत का उत्साह", en: "Jambavan's Call" },
    intro:
      "On the southern shore Jambavan reminds Hanuman of his strength. He swells, bows to Ram, and springs from Mahendra Parvata.",
    caption: "Spring from the mountain — clear the clouds over the shore.",
    goal: { kind: "passes", count: 5 },
    difficulty: { speed: 0.34, spawn: 1.9, gap: 0.42, gapMin: GAP_MIN },
    roster: [["cloud", 1]],
    sky: "morning",
    scoreMul: 1,
    verse: VERSES.launch,
  },
  {
    id: "mainaka",
    title: { hi: "मैनाक का सत्कार", en: "Mainaka's Offering" },
    intro:
      "The ocean asks the golden mountain Mainaka to rise and offer Hanuman rest. He touches it in respect and flies on.",
    caption: "Ride the swells of Sagara — Mainaka rises to greet you.",
    goal: { kind: "passes", count: 6 },
    difficulty: { speed: 0.375, spawn: 1.7, gap: 0.39, gapMin: GAP_MIN },
    roster: [
      ["wave", 2],
      ["mainaka", 1],
    ],
    sky: "day",
    scoreMul: 1,
    verse: VERSES.mainaka,
  },
  {
    id: "surasa",
    title: { hi: "सुरसा की परीक्षा", en: "Surasa's Test" },
    intro:
      "The gods send Surasa, mother of serpents, to test him. Her mouth grows as he grows — so he shrinks to a thumb and slips through.",
    caption: "Her mouth widens as you near — shrink and slip through.",
    goal: { kind: "passes", count: 6 },
    difficulty: { speed: 0.42, spawn: 1.55, gap: 0.37, gapMin: GAP_MIN },
    roster: [["surasa", 1]],
    sky: "day",
    scoreMul: 1.2,
    verse: VERSES.surasa,
  },
  {
    id: "simhika",
    title: { hi: "सिंहिका की छाया", en: "Simhika's Shadow" },
    intro:
      "A demoness in the sea catches flying creatures by their shadows on the water. Hanuman sees through the trick.",
    caption: "Her shadow drags you down — flap harder and tear free.",
    goal: { kind: "passes", count: 7 },
    difficulty: { speed: 0.455, spawn: 1.45, gap: 0.34, gapMin: GAP_MIN },
    roster: [["simhika", 1]],
    sky: "dusk",
    scoreMul: 1.4,
    verse: VERSES.simhika,
  },
  {
    id: "lankini",
    title: { hi: "लंकिनी का द्वार", en: "Lankini's Gate" },
    intro:
      "At night, mosquito-small, Hanuman reaches the golden ramparts. Lankini, guardian of the gate, bars the way.",
    caption: "Past the rakshasa sentries waits Lankini at the gate.",
    goal: { kind: "boss", after: 5 },
    difficulty: { speed: 0.49, spawn: 1.35, gap: 0.32, gapMin: GAP_MIN },
    roster: [["rakshasa", 1]],
    sky: "night",
    scoreMul: 1.6,
    verse: VERSES.lankini,
  },
  {
    id: "vatika",
    title: { hi: "अशोक वाटिका", en: "Ashok Vatika" },
    intro:
      "In Ravana's garden, under the Shimshapa tree, sits Sita. Hanuman drops Ram's ring from the branches.",
    caption: "Thread the Ashoka trees — Sita waits beneath the last one.",
    goal: { kind: "finale", passes: 8, scene: "sita" },
    difficulty: { speed: 0.47, spawn: 1.4, gap: 0.33, gapMin: GAP_MIN },
    roster: [["tree", 1]],
    sky: "night",
    scoreMul: 1.8,
    verse: VERSES.ring,
  },
  {
    id: "dahan",
    title: { hi: "लंका दहन", en: "Lanka Ablaze" },
    intro:
      "Captured and set alight by his tail, Hanuman grows vast and leaps from palace to palace. Lanka burns.",
    caption: "Tail afire — leap the towers as the golden city burns.",
    goal: { kind: "passes", count: 10 },
    difficulty: { speed: 0.56, spawn: 1.2, gap: 0.3, gapMin: GAP_MIN },
    roster: [["tower", 1]],
    sky: "fire",
    scoreMul: 2.5,
    verse: VERSES.dahan,
  },
  {
    id: "return",
    title: { hi: "प्रभु मिलन", en: "Return to Ram" },
    intro:
      "With Sita's crest-jewel in hand, Hanuman leaps back across the sea at dawn to bring Ram her message.",
    caption: "Carry the Chudamani home — Ram waits on the far shore.",
    goal: { kind: "finale", passes: 6, scene: "ram" },
    difficulty: { speed: 0.42, spawn: 1.8, gap: 0.38, gapMin: GAP_MIN },
    roster: [["cloud", 1]],
    sky: "dawn",
    scoreMul: 2,
    verse: VERSES.ram,
    introVerse: VERSES.chudamani,
  },
] as const satisfies readonly [Chapter, ...Chapter[]];

export const CHAPTER_COUNT = CHAPTERS.length;
export const LAST_CHAPTER = CHAPTER_COUNT - 1;

export const chapterAt = (i: number): Chapter => CHAPTERS[i] ?? CHAPTERS[0];

/** Roster passes needed before the chapter can resolve (a boss is extra). */
export function targetPasses(ch: Chapter): number {
  switch (ch.goal.kind) {
    case "passes":
      return ch.goal.count;
    case "boss":
      return ch.goal.after;
    case "finale":
      return ch.goal.passes;
  }
}

/** Total obstacles the HUD progress bar counts toward. */
export const totalSteps = (ch: Chapter) => targetPasses(ch) + (ch.goal.kind === "boss" ? 1 : 0);

/** Seconds the closing glide/scene lasts before the chapter clears. */
export const finaleDuration = (ch: Chapter) => (ch.goal.kind === "finale" ? 2.4 : 1.0);
