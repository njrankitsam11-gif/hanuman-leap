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
    intro: {
      hi: "दक्षिण तट पर जामवंत हनुमान को उनका बल याद दिलाते हैं। वे विशाल रूप धरते हैं, राम को प्रणाम करते हैं और महेंद्र पर्वत से छलाँग लगाते हैं।",
      en: "On the southern shore Jambavan reminds Hanuman of his strength. He swells, bows to Ram, and springs from Mahendra Parvata.",
    },
    caption: {
      hi: "पर्वत से छलाँग — तट के ऊपर के बादल पार करें।",
      en: "Spring from the mountain — clear the clouds over the shore.",
    },
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
    intro: {
      hi: "समुद्र सोने के पर्वत मैनाक से कहता है कि वह उठकर हनुमान को विश्राम दे। वे आदर से उसे छूकर आगे बढ़ जाते हैं।",
      en: "The ocean asks the golden mountain Mainaka to rise and offer Hanuman rest. He touches it in respect and flies on.",
    },
    caption: {
      hi: "सागर की लहरों पर उड़ें — मैनाक आपके स्वागत में उठता है।",
      en: "Ride the swells of Sagara — Mainaka rises to greet you.",
    },
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
    intro: {
      hi: "देवता नागमाता सुरसा को उनकी परीक्षा लेने भेजते हैं। जितना वे बढ़ते हैं, उतना ही उसका मुख बढ़ता है — तो वे अँगूठे जितने छोटे होकर निकल जाते हैं।",
      en: "The gods send Surasa, mother of serpents, to test him. Her mouth grows as he grows — so he shrinks to a thumb and slips through.",
    },
    caption: {
      hi: "पास आते ही उसका मुख फैलता है — छोटे होकर निकल जाएँ।",
      en: "Her mouth widens as you near — shrink and slip through.",
    },
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
    intro: {
      hi: "समुद्र में एक राक्षसी उड़ते जीवों को पानी पर पड़ी उनकी परछाईं से पकड़ लेती है। हनुमान उसका छल भाँप लेते हैं।",
      en: "A demoness in the sea catches flying creatures by their shadows on the water. Hanuman sees through the trick.",
    },
    caption: {
      hi: "उसकी छाया आपको नीचे खींचती है — ज़ोर से फड़फड़ाकर छूटें।",
      en: "Her shadow drags you down — flap harder and tear free.",
    },
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
    intro: {
      hi: "रात में मच्छर जितने छोटे होकर हनुमान सोने के परकोटे तक पहुँचते हैं। द्वार की रक्षिका लंकिनी रास्ता रोकती है।",
      en: "At night, mosquito-small, Hanuman reaches the golden ramparts. Lankini, guardian of the gate, bars the way.",
    },
    caption: {
      hi: "राक्षस प्रहरियों के पार द्वार पर लंकिनी खड़ी है।",
      en: "Past the rakshasa sentries waits Lankini at the gate.",
    },
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
    intro: {
      hi: "रावण के उपवन में शिंशपा वृक्ष के नीचे सीता बैठी हैं। हनुमान डाल से राम की मुद्रिका गिराते हैं।",
      en: "In Ravana's garden, under the Shimshapa tree, sits Sita. Hanuman drops Ram's ring from the branches.",
    },
    caption: {
      hi: "अशोक वृक्षों के बीच से निकलें — अंतिम वृक्ष के नीचे सीता प्रतीक्षा में हैं।",
      en: "Thread the Ashoka trees — Sita waits beneath the last one.",
    },
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
    intro: {
      hi: "बंदी बनाकर पूँछ में आग लगा दी गई; हनुमान विशाल रूप धरकर महल से महल कूदते हैं। लंका जलती है।",
      en: "Captured and set alight by his tail, Hanuman grows vast and leaps from palace to palace. Lanka burns.",
    },
    caption: {
      hi: "पूँछ में आग — जलती स्वर्णनगरी के बुर्ज लाँघें।",
      en: "Tail afire — leap the towers as the golden city burns.",
    },
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
    intro: {
      hi: "सीता की चूड़ामणि लेकर हनुमान भोर में समुद्र के पार लौटते हैं, राम तक उनका संदेश पहुँचाने।",
      en: "With Sita's crest-jewel in hand, Hanuman leaps back across the sea at dawn to bring Ram her message.",
    },
    caption: {
      hi: "चूड़ामणि घर ले चलें — उस पार राम प्रतीक्षा में हैं।",
      en: "Carry the Chudamani home — Ram waits on the far shore.",
    },
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

/**
 * अखंड उड़ान — the post-story mode. Not part of the arc: it lives at index
 * ENDLESS_INDEX so the engine, HUD and save can address it like any chapter.
 * Every kind but the boss returns; the ramp lives in mechanics.ts and the sky
 * cycles with distance in the renderer.
 */
export const ENDLESS: Chapter = {
  id: "endless",
  title: { hi: "अखंड उड़ान", en: "Endless Flight" },
  intro: {
    hi: "राम-काज पूरा हुए बिना विश्राम कहाँ? जब तक उड़ सकें, समुद्र के ऊपर उड़ते रहें — हर बाधा फिर लौटेगी, हर बार और तेज़।",
    en: "Until Ram's work is done, where is rest? Fly over the sea for as long as you can — every trial returns, faster each time.",
  },
  caption: { hi: "जितनी दूर उड़ सकें, उड़ें।", en: "Fly as far as you can." },
  goal: { kind: "endless" },
  difficulty: { speed: 0.4, spawn: 1.6, gap: 0.4, gapMin: 0.25 },
  roster: [
    ["cloud", 3],
    ["wave", 2],
    ["mainaka", 1],
    ["surasa", 2],
    ["simhika", 2],
    ["rakshasa", 2],
    ["tree", 2],
    ["tower", 1],
  ],
  sky: "day",
  scoreMul: 1.5,
  verse: VERSES.mainaka,
};

export const ENDLESS_INDEX = CHAPTER_COUNT;

export const chapterAt = (i: number): Chapter =>
  i === ENDLESS_INDEX ? ENDLESS : (CHAPTERS[i] ?? CHAPTERS[0]);

export const isEndless = (ch: Chapter) => ch.goal.kind === "endless";

/** Roster passes needed before the chapter can resolve (a boss is extra). */
export function targetPasses(ch: Chapter): number {
  switch (ch.goal.kind) {
    case "passes":
      return ch.goal.count;
    case "boss":
      return ch.goal.after;
    case "finale":
      return ch.goal.passes;
    case "endless":
      return Infinity;
  }
}

/** Total obstacles the HUD progress bar counts toward. */
export const totalSteps = (ch: Chapter) => targetPasses(ch) + (ch.goal.kind === "boss" ? 1 : 0);

/** Seconds the closing glide/scene lasts before the chapter clears. */
export const finaleDuration = (ch: Chapter) => (ch.goal.kind === "finale" ? 2.4 : 1.0);
