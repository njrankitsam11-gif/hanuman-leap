import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { loadSave, saveGame, type Lang } from "@/game/storage";
import { translate, type Params, type StringKey } from "./strings";

export type { Lang } from "@/game/storage";
export { LANG_NAMES, STRINGS, translate } from "./strings";
export type { StringKey } from "./strings";

/** Prose that exists in both languages (chapter intros, captions). */
export type Localized = { hi: string; en: string };

type LangCtx = { lang: Lang; setLang: (l: Lang) => void };

const LangContext = createContext<LangCtx>({ lang: "en", setLang: () => {} });

/**
 * The server always renders English; the saved (or browser-detected) language is
 * applied right after hydration, the same way the game reads its save.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(loadSave().lang);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveGame({ lang: l });
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** `t("clear.title", { n: 3, punya: 120 })` in the current language. */
export function useT() {
  const { lang } = useLang();
  return useCallback((key: StringKey, params?: Params) => translate(lang, key, params), [lang]);
}

/** Pick one side of a bilingual string. */
export const pick = (lang: Lang, text: Localized) => text[lang];
