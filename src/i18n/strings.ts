import type { Lang } from "@/game/storage";

/**
 * UI strings. Chapter prose and verse meanings live with their data in
 * `src/game/chapters`; this is everything else. `{name}` placeholders are filled by `t()`.
 * Digits stay Western in both languages, as is usual in Indian apps.
 */
const en = {
  "app.eyebrow": "Sundara Kanda",
  "app.title": "Hanuman's Leap to Lanka",
  "app.tagline": "From the Indian shore to Lanka, with Lord Ram's ring for Sita Maa.",
  "app.footer":
    "Space / tap to rise · P to pause · M to mute · verses from Tulsidas's Ramcharitmanas",

  "start.blurb":
    "Carry Lord Ram's ring across the sea to Sita Maa, set Lanka ablaze, and bring her crest-jewel home — through ten chapters of the Sundarkand.",
  "start.begin": "Begin the leap",
  "start.orChoose": "or choose a chapter",
  "start.controls": "Space or tap to rise · P pause · M mute",

  "intro.chapterOf": "Chapter {n} of {total}",
  "intro.tap": "Tap or press Space to leap",
  "hint.tap": "Tap to rise",

  "clear.title": "Chapter {n} cleared · Punya {punya}",
  "clear.continue": "Continue the journey",

  "over.title": "The leap ended",
  "over.body": "Punya {punya} in chapter {n}, {title}. The ring is still in your hand.",
  "over.retry": "Leap again",
  "over.hint": "Space or tap to retry",

  "win.eyebrow": "The Chudamani delivered",
  "win.score": "Punya {punya} · Best {best}",
  "win.again": "Leap again from the shore",

  "pause.title": "Paused",
  "pause.resume": "Resume",
  "pause.restart": "Restart chapter",
  "pause.hint": "P or Esc to resume · M to mute",

  "nav.chapters": "Chapters",
  "nav.settings": "Settings",

  "hud.punya": "Punya",
  "hud.best": "Best",
  "hud.mute": "Mute",
  "hud.unmute": "Unmute",
  "hud.pause": "Pause",

  "select.chapter": "Chapter {n}: {title}",
  "select.locked": "(locked)",

  "settings.sound": "Sound",
  "settings.haptics": "Vibration",
  "settings.language": "Language",
  "settings.easy": "Sahaj mode",
  "settings.easyHint": "Wider gaps, slower sea",
  "settings.journey": "Your journey",
  "settings.runs": "Leaps from the shore",
  "settings.leaps": "Columns cleared",
  "settings.deaths": "Falls",
  "settings.wins": "Chudamani delivered",
  "settings.reset": "Reset progress",
  "settings.resetConfirm": "Erase your best score, unlocked chapters, and journey stats?",
  "settings.erase": "Erase",
  "settings.cancel": "Cancel",
  "settings.close": "Close",
  "mode.endless": "Endless Flight",
  "mode.daily": "Today's Leap",
  "mode.dailyHint": "The same sea for everyone today · {date}",
  "mode.locked": "Reach Lankini's gate to unlock",
  "mode.intro.endless": "Endless Flight",
  "mode.intro.daily": "Today's Leap · {date}",

  "endless.over": "The flight ended",
  "endless.result": "{passes} leaps · Punya {punya}",
  "endless.best": "Best {best}",
  "endless.bestToday": "Best today {best}",
  "endless.newBest": "New best!",
  "hud.leaps": "Leaps",

  share: "Share",
  "share.copied": "Copied — paste it anywhere",
  "share.failed": "Couldn't share on this device",

  "ach.unlocked": "Achievement",
  "ach.title": "Achievements",
  "ach.progress": "{n} of {total}",
  "stats.chapter": "Chapter",
  "stats.clears": "Clears",
  "stats.falls": "Falls",
} as const;

export type StringKey = keyof typeof en;

const hi: Record<StringKey, string> = {
  "app.eyebrow": "सुंदरकांड",
  "app.title": "हनुमान की लंका-छलाँग",
  "app.tagline": "भारत के तट से लंका तक, सीता माँ के लिए प्रभु राम की मुद्रिका लेकर।",
  "app.footer": "Space या टैप से उड़ान · P विराम · M मौन · चौपाइयाँ तुलसीदास की रामचरितमानस से",

  "start.blurb":
    "प्रभु राम की मुद्रिका लेकर समुद्र पार सीता माँ तक पहुँचें, लंका जलाएँ और उनकी चूड़ामणि लेकर लौटें — सुंदरकांड के दस अध्यायों में।",
  "start.begin": "छलाँग लगाएँ",
  "start.orChoose": "या अध्याय चुनें",
  "start.controls": "Space या टैप से उड़ान · P विराम · M मौन",

  "intro.chapterOf": "अध्याय {n} / {total}",
  "intro.tap": "छलाँग के लिए टैप करें या Space दबाएँ",
  "hint.tap": "ऊपर उठने के लिए टैप करें",

  "clear.title": "अध्याय {n} पूरा · पुण्य {punya}",
  "clear.continue": "यात्रा जारी रखें",

  "over.title": "छलाँग थम गई",
  "over.body": "अध्याय {n} ({title}) में पुण्य {punya}। मुद्रिका अब भी आपके हाथ में है।",
  "over.retry": "फिर छलाँग",
  "over.hint": "फिर से खेलने के लिए टैप करें या Space दबाएँ",

  "win.eyebrow": "चूड़ामणि पहुँच गई",
  "win.score": "पुण्य {punya} · सर्वश्रेष्ठ {best}",
  "win.again": "तट से फिर छलाँग",

  "pause.title": "विराम",
  "pause.resume": "जारी रखें",
  "pause.restart": "अध्याय फिर से",
  "pause.hint": "P या Esc से जारी · M से मौन",

  "nav.chapters": "अध्याय",
  "nav.settings": "सेटिंग",

  "hud.punya": "पुण्य",
  "hud.best": "सर्वश्रेष्ठ",
  "hud.mute": "मौन करें",
  "hud.unmute": "ध्वनि चालू करें",
  "hud.pause": "विराम",

  "select.chapter": "अध्याय {n}: {title}",
  "select.locked": "(बंद)",

  "settings.sound": "ध्वनि",
  "settings.haptics": "कंपन",
  "settings.language": "भाषा",
  "settings.easy": "सहज मोड",
  "settings.easyHint": "चौड़े अंतराल, धीमी गति",
  "settings.journey": "आपकी यात्रा",
  "settings.runs": "तट से छलाँगें",
  "settings.leaps": "पार किए स्तंभ",
  "settings.deaths": "गिरावटें",
  "settings.wins": "चूड़ामणि पहुँचाई",
  "settings.reset": "प्रगति मिटाएँ",
  "settings.resetConfirm": "सर्वश्रेष्ठ स्कोर, खुले अध्याय और यात्रा के आँकड़े मिटा दें?",
  "settings.erase": "मिटाएँ",
  "settings.cancel": "रद्द करें",
  "settings.close": "बंद करें",
  "mode.endless": "अखंड उड़ान",
  "mode.daily": "आज की उड़ान",
  "mode.dailyHint": "आज सबके लिए एक जैसा समुद्र · {date}",
  "mode.locked": "खोलने के लिए लंकिनी के द्वार तक पहुँचें",
  "mode.intro.endless": "अखंड उड़ान",
  "mode.intro.daily": "आज की उड़ान · {date}",

  "endless.over": "उड़ान थम गई",
  "endless.result": "{passes} छलाँगें · पुण्य {punya}",
  "endless.best": "सर्वश्रेष्ठ {best}",
  "endless.bestToday": "आज का सर्वश्रेष्ठ {best}",
  "endless.newBest": "नया सर्वश्रेष्ठ!",
  "hud.leaps": "छलाँगें",

  share: "साझा करें",
  "share.copied": "कॉपी हो गया — कहीं भी चिपकाएँ",
  "share.failed": "इस डिवाइस पर साझा नहीं हो सका",

  "ach.unlocked": "उपलब्धि",
  "ach.title": "उपलब्धियाँ",
  "ach.progress": "{total} में से {n}",
  "stats.chapter": "अध्याय",
  "stats.clears": "पूरे",
  "stats.falls": "गिरावटें",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { en, hi };

export const LANG_NAMES: Record<Lang, string> = { en: "English", hi: "हिन्दी" };

export type Params = Record<string, string | number>;

/** Fill `{name}` placeholders. Unknown names are left as-is so a typo is visible, not silent. */
export function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export const translate = (lang: Lang, key: StringKey, params?: Params) =>
  format(STRINGS[lang][key], params);
