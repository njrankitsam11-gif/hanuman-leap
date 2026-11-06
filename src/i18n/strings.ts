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

  "landing.play": "Play now",
  "landing.facts": "10 chapters · one tap · free",
  "landing.verseLabel": "From the Sundarkand",

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
  "settings.music": "Music",
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
  "account.title": "Your account",
  "account.gate": "Sign in to play",
  "account.loading": "One moment…",
  "account.pitch": "Sign in with your email. Your progress stays safe on every device.",
  "account.email": "Email address",
  "account.send": "Email me a code",
  "account.code": "6-digit code",
  "account.codeSent":
    "We sent a code to {email}. It can take a minute; check your spam folder too.",
  "account.codeError": "That code didn't work. Check it, or go back and ask for a new one.",
  "account.verify": "Sign in",
  "account.back": "Use a different email",
  "account.signedIn": "Signed in as {email}",
  "account.synced": "Progress saved to your account",
  "account.signOut": "Sign out",
  "account.delete": "Delete account",
  "account.deleteConfirm":
    "Delete your account and its saved progress? Progress on this device stays.",
  "account.error": "That didn't work. Check your connection and try again.",
  "privacy.title": "Privacy",
  "privacy.intro":
    "Hanuman's Leap is a free game. It has no ads and sells nothing, including your data.",
  "privacy.collectTitle": "What we keep",
  "privacy.collect":
    "Your email address, so you can sign in, and your game progress: scores, unlocked chapters, achievements and journey stats.",
  "privacy.deviceTitle": "On your device",
  "privacy.device":
    "Your progress and settings are also kept in your browser, so the game works offline.",
  "privacy.servicesTitle": "Who handles it",
  "privacy.services":
    "Neon stores your account and progress. Vercel hosts the game and counts page visits and anonymous game events, such as which chapter was reached. These never include your email. Turning on Do Not Track in your browser stops them.",
  "privacy.deleteTitle": "Deleting your data",
  "privacy.delete":
    "Open Settings in the game and choose Delete account. This removes your account and saved progress from our servers. Progress in your browser stays until you clear it or use Reset progress.",
  "privacy.back": "Back to the game",
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
  "landing.play": "खेलें",
  "landing.facts": "10 अध्याय · एक टैप · मुफ़्त",
  "landing.verseLabel": "सुंदरकांड से",
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
  "settings.music": "संगीत",
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
  "account.title": "आपका खाता",
  "account.gate": "खेलने के लिए साइन इन करें",
  "account.loading": "एक क्षण…",
  "account.pitch": "अपने ईमेल से साइन इन करें। आपकी प्रगति हर डिवाइस पर सुरक्षित रहेगी।",
  "account.email": "ईमेल पता",
  "account.send": "मुझे कोड भेजें",
  "account.code": "6 अंकों का कोड",
  "account.codeSent":
    "हमने {email} पर कोड भेजा है। इसमें एक मिनट लग सकता है; स्पैम फ़ोल्डर भी देखें।",
  "account.codeError": "यह कोड काम नहीं किया। इसे जाँचें, या वापस जाकर नया कोड मँगाएँ।",
  "account.verify": "साइन इन करें",
  "account.back": "दूसरा ईमेल चुनें",
  "account.signedIn": "{email} से साइन इन है",
  "account.synced": "प्रगति आपके खाते में सुरक्षित है",
  "account.signOut": "साइन आउट",
  "account.delete": "खाता हटाएँ",
  "account.deleteConfirm": "खाता और उसमें सुरक्षित प्रगति हटा दें? इस डिवाइस की प्रगति बनी रहेगी।",
  "account.error": "यह नहीं हो पाया। अपना कनेक्शन जाँचें और फिर कोशिश करें।",
  "privacy.title": "निजता",
  "privacy.intro":
    "हनुमान की लंका-छलाँग एक मुफ़्त खेल है। इसमें न विज्ञापन हैं, न कुछ बेचा जाता है, आपका डेटा भी नहीं।",
  "privacy.collectTitle": "हम क्या रखते हैं",
  "privacy.collect":
    "आपका ईमेल पता, ताकि आप साइन इन कर सकें, और खेल की प्रगति: स्कोर, खुले अध्याय, उपलब्धियाँ और यात्रा के आँकड़े।",
  "privacy.deviceTitle": "आपके डिवाइस पर",
  "privacy.device": "आपकी प्रगति और सेटिंग आपके ब्राउज़र में भी रहती हैं, ताकि खेल ऑफ़लाइन चले।",
  "privacy.servicesTitle": "इसे कौन सँभालता है",
  "privacy.services":
    "Neon आपका खाता और प्रगति रखता है। Vercel खेल चलाता है और पेज विज़िट तथा गुमनाम खेल घटनाएँ गिनता है, जैसे कौन-सा अध्याय पहुँचा गया। इनमें आपका ईमेल कभी नहीं होता। ब्राउज़र में Do Not Track चालू करने से ये बंद हो जाती हैं।",
  "privacy.deleteTitle": "अपना डेटा हटाना",
  "privacy.delete":
    "खेल में सेटिंग खोलें और खाता हटाएँ चुनें। इससे आपका खाता और सुरक्षित प्रगति हमारे सर्वर से हट जाती है। ब्राउज़र की प्रगति तब तक रहती है जब तक आप उसे साफ़ न करें या प्रगति न मिटाएँ।",
  "privacy.back": "खेल पर लौटें",
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
