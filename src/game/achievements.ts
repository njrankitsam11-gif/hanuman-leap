import type { Chapter, Localized, ObstacleKindId } from "./chapters/types";
import type { World } from "./types";

/** Which run the player is on. */
export type Mode = "story" | "endless" | "daily";

export type AchievementId =
  | "first_leap"
  | "mainaka_touch"
  | "surasa_pass"
  | "flawless_chapter"
  | "lankini_gate"
  | "ring_delivered"
  | "lanka_burned"
  | "chudamani"
  | "nirvighna"
  | "leaps_100"
  | "leaps_1000"
  | "punya_1000"
  | "endless_25"
  | "endless_50"
  | "daily_first";

export type Achievement = {
  id: AchievementId;
  title: Localized;
  desc: Localized;
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first_leap",
    title: { hi: "पहली छलाँग", en: "First Leap" },
    desc: { hi: "पहली बाधा पार की", en: "Cleared your first column" },
  },
  {
    id: "mainaka_touch",
    title: { hi: "मैनाक का स्पर्श", en: "Mainaka's Touch" },
    desc: { hi: "मैनाक की चोटी छूकर पुण्य पाया", en: "Touched Mainaka's peak for punya" },
  },
  {
    id: "surasa_pass",
    title: { hi: "अंगुष्ठ रूप", en: "Thumb-sized" },
    desc: { hi: "सुरसा के मुख से निकल गए", en: "Slipped through Surasa's mouth" },
  },
  {
    id: "flawless_chapter",
    title: { hi: "निर्विघ्न अध्याय", en: "Flawless Chapter" },
    desc: { hi: "एक अध्याय बिना गिरे पूरा किया", en: "Cleared a chapter without a fall" },
  },
  {
    id: "lankini_gate",
    title: { hi: "लंकिनी पराजित", en: "Past Lankini" },
    desc: { hi: "लंका के द्वार की रक्षिका को पार किया", en: "Passed the guardian of Lanka's gate" },
  },
  {
    id: "ring_delivered",
    title: { hi: "मुद्रिका", en: "The Ring" },
    desc: { hi: "सीता माँ तक राम की मुद्रिका पहुँचाई", en: "Delivered Ram's ring to Sita Maa" },
  },
  {
    id: "lanka_burned",
    title: { hi: "लंका दहन", en: "Lanka Ablaze" },
    desc: { hi: "जलती लंका पार की", en: "Leapt across burning Lanka" },
  },
  {
    id: "chudamani",
    title: { hi: "चूड़ामणि", en: "The Chudamani" },
    desc: { hi: "सुंदरकांड की यात्रा पूरी की", en: "Completed the Sundarkand journey" },
  },
  {
    id: "nirvighna",
    title: { hi: "निर्विघ्न यात्रा", en: "Nirvighna" },
    desc: { hi: "पूरी यात्रा बिना एक भी गिरावट के", en: "The whole journey without a single fall" },
  },
  {
    id: "leaps_100",
    title: { hi: "सौ छलाँगें", en: "A Hundred Leaps" },
    desc: { hi: "कुल 100 बाधाएँ पार कीं", en: "100 columns cleared in all" },
  },
  {
    id: "leaps_1000",
    title: { hi: "सहस्र छलाँगें", en: "A Thousand Leaps" },
    desc: { hi: "कुल 1000 बाधाएँ पार कीं", en: "1 000 columns cleared in all" },
  },
  {
    id: "punya_1000",
    title: { hi: "सहस्र पुण्य", en: "Thousand Punya" },
    desc: { hi: "एक यात्रा में 1000 पुण्य", en: "1 000 punya in one run" },
  },
  {
    id: "endless_25",
    title: { hi: "अखंड 25", en: "Endless 25" },
    desc: { hi: "अखंड उड़ान में 25 छलाँगें", en: "25 leaps in Endless Flight" },
  },
  {
    id: "endless_50",
    title: { hi: "अखंड 50", en: "Endless 50" },
    desc: { hi: "अखंड उड़ान में 50 छलाँगें", en: "50 leaps in Endless Flight" },
  },
  {
    id: "daily_first",
    title: { hi: "आज की उड़ान", en: "Today's Leap" },
    desc: { hi: "पहली दैनिक उड़ान पूरी की", en: "Finished your first Daily Leap" },
  },
];

export const achievementById = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);

export type AchievementEvent =
  | { type: "pass"; kind: ObstacleKindId }
  | { type: "collect" }
  | { type: "clear" }
  | { type: "won" }
  | { type: "hit" };

export type AchievementCtx = {
  event: AchievementEvent;
  world: World;
  chapter: Chapter;
  mode: Mode;
  /** Deaths inside the current chapter (0 = flawless so far). */
  chapterDeaths: number;
  /** All-time columns cleared, including this run so far. */
  totalLeaps: number;
};

/** Ids newly earned by this event; the caller persists them and shows the toast. */
export function evaluate(ctx: AchievementCtx, unlocked: ReadonlySet<string>): AchievementId[] {
  const { event, world, chapter, mode } = ctx;
  const inEndless = mode !== "story";
  const earned: AchievementId[] = [];
  const add = (id: AchievementId, when: boolean) => {
    if (when && !unlocked.has(id) && !earned.includes(id)) earned.push(id);
  };

  switch (event.type) {
    case "pass":
      add("first_leap", true);
      add("surasa_pass", event.kind === "surasa");
      add("lankini_gate", event.kind === "lankini");
      add("endless_25", inEndless && world.passes >= 25);
      add("endless_50", inEndless && world.passes >= 50);
      break;
    case "collect":
      add("mainaka_touch", true);
      break;
    case "clear":
      add("flawless_chapter", !inEndless && ctx.chapterDeaths === 0);
      add("ring_delivered", chapter.id === "vatika");
      add("lanka_burned", chapter.id === "dahan");
      break;
    case "won":
      add("chudamani", true);
      add("nirvighna", world.deaths === 0);
      break;
    case "hit":
      add("daily_first", mode === "daily" && world.passes >= 1);
      break;
  }
  add("leaps_100", ctx.totalLeaps >= 100);
  add("leaps_1000", ctx.totalLeaps >= 1000);
  add("punya_1000", world.punya >= 1000);
  return earned;
}
