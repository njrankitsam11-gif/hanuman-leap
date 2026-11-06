import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Mode } from "@/game/achievements";
import type { Chapter } from "@/game/chapters/types";
import { CHAPTER_COUNT } from "@/game/chapters";
import type { ShareOutcome } from "@/game/share";
import { pick, useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { ChapterSelect } from "./ChapterSelect";
import { ModeCards } from "./ModeCards";
import { Overlay, stopPointer } from "./Overlay";
import { ShareButton } from "./ShareButton";
import { VerseBlock } from "./VerseBlock";

export type ModeInfo = {
  unlocked: boolean;
  endlessBest: number;
  dailyBest: number;
  dailyDate: string;
  onEndless: () => void;
  onDaily: () => void;
};

export function StartScreen({
  unlocked,
  modes,
  onStart,
  onSelect,
  onSettings,
}: {
  unlocked: number;
  modes: ModeInfo;
  onStart: () => void;
  onSelect: (index: number) => void;
  onSettings: () => void;
}) {
  const t = useT();
  return (
    <Overlay>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("nav.settings")}
        className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/70 backdrop-blur sm:right-4 sm:top-4"
        onPointerDown={stopPointer}
        onClick={onSettings}
      >
        <Settings2 />
      </Button>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] [&:lang(hi)]:tracking-normal text-muted-foreground">
        {t("app.eyebrow")}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t("app.title")}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{t("start.blurb")}</p>
      <Button
        size="lg"
        className="mt-1 rounded-full px-7 shadow-lg transition-transform hover:scale-105"
        onPointerDown={stopPointer}
        onClick={onStart}
      >
        {t("start.begin")}
      </Button>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wider [&:lang(hi)]:tracking-normal text-muted-foreground">
        {t("start.orChoose")}
      </p>
      <ChapterSelect unlocked={unlocked} onSelect={onSelect} />
      <ModeCards {...modes} />
      <p className="text-xs text-muted-foreground">{t("start.controls")}</p>
    </Overlay>
  );
}

export function ChapterIntro({
  chapter,
  index,
  mode,
  date,
}: {
  chapter: Chapter;
  index: number;
  mode: Mode;
  date: string;
}) {
  const t = useT();
  const { lang } = useLang();
  const eyebrow =
    mode === "daily"
      ? t("mode.intro.daily", { date })
      : mode === "endless"
        ? t("mode.intro.endless")
        : t("intro.chapterOf", { n: index + 1, total: CHAPTER_COUNT });
  return (
    <Overlay className="bg-background/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] [&:lang(hi)]:tracking-normal text-muted-foreground">
        {eyebrow}
      </p>
      <h2 lang="hi" className="font-devanagari text-3xl font-bold text-foreground sm:text-4xl">
        {chapter.title.hi}
      </h2>
      <p className="text-base font-semibold text-foreground/80">{chapter.title.en}</p>
      <p className="max-w-md text-sm text-muted-foreground">{pick(lang, chapter.intro)}</p>
      {chapter.introVerse && (
        <div className="mt-1 max-w-md rounded-xl border border-border/60 bg-background/60 px-4 py-3">
          <VerseBlock verse={chapter.introVerse} compact />
        </div>
      )}
      <p className="mt-2 animate-pulse text-sm font-semibold text-primary">{t("intro.tap")}</p>
    </Overlay>
  );
}

/**
 * First-ever run: a pulsing pointer under the hero until the first flap lands, so a
 * new player learns the one control without reading anything.
 */
export function FirstRunHint() {
  const t = useT();
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="mt-24 flex flex-col items-center gap-1 text-primary drop-shadow">
        <svg viewBox="0 0 24 24" className="size-10 animate-bounce fill-current" aria-hidden="true">
          <path d="M9 2a1.5 1.5 0 0 1 1.5 1.5V11h1V7.5a1.5 1.5 0 0 1 3 0V11h1V8.5a1.5 1.5 0 0 1 3 0V11h1v-1a1.5 1.5 0 0 1 3 0v6.5c0 3.6-2.9 6.5-6.5 6.5h-2.2a6.5 6.5 0 0 1-5.4-2.9L3.6 15a1.6 1.6 0 0 1 2.5-2l1.4 1.6V3.5A1.5 1.5 0 0 1 9 2Z" />
        </svg>
        <span className="rounded-full bg-background/80 px-3 py-1 text-sm font-semibold backdrop-blur">
          {t("hint.tap")}
        </span>
      </div>
    </div>
  );
}

export function ChapterClear({
  chapter,
  index,
  punya,
  onContinue,
}: {
  chapter: Chapter;
  index: number;
  punya: number;
  onContinue: () => void;
}) {
  const t = useT();
  return (
    <Overlay interactive>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] [&:lang(hi)]:tracking-normal text-muted-foreground">
        {t("clear.title", { n: index + 1, punya })}
      </p>
      <VerseBlock verse={chapter.verse} />
      <Button
        size="lg"
        autoFocus
        className="mt-2 rounded-full px-7 shadow-lg transition-transform hover:scale-105"
        onClick={onContinue}
      >
        {t("clear.continue")}
      </Button>
    </Overlay>
  );
}

export function GameOver({
  chapter,
  index,
  punya,
  canContinue,
  onRetry,
  onChapters,
  onShare,
}: {
  chapter: Chapter;
  index: number;
  punya: number;
  canContinue: boolean;
  onRetry: () => void;
  onChapters: () => void;
  onShare: () => Promise<ShareOutcome>;
}) {
  const t = useT();
  return (
    <Overlay>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t("over.title")}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("over.body", { punya, n: index + 1, title: chapter.title.hi })}
      </p>
      <div
        className={cn(
          "flex flex-wrap items-start justify-center gap-2 transition-opacity duration-300",
          !canContinue && "pointer-events-none opacity-0",
        )}
      >
        <Button
          size="lg"
          className="rounded-full px-7 shadow-lg"
          onPointerDown={stopPointer}
          onClick={onRetry}
        >
          {t("over.retry")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-6"
          onPointerDown={stopPointer}
          onClick={onChapters}
        >
          {t("nav.chapters")}
        </Button>
        {punya > 0 && <ShareButton onShare={onShare} />}
      </div>
      <p
        className={cn(
          "text-xs text-muted-foreground transition-opacity duration-300",
          !canContinue && "opacity-0",
        )}
      >
        {t("over.hint")}
      </p>
    </Overlay>
  );
}

/** Endless / Daily: the run is the score. Same verse every time — no rest until Ram's work is done. */
export function EndlessOver({
  mode,
  chapter,
  passes,
  punya,
  best,
  newBest,
  canContinue,
  onRetry,
  onChapters,
  onShare,
}: {
  mode: Mode;
  chapter: Chapter;
  passes: number;
  punya: number;
  best: number;
  newBest: boolean;
  canContinue: boolean;
  onRetry: () => void;
  onChapters: () => void;
  onShare: () => Promise<ShareOutcome>;
}) {
  const t = useT();
  return (
    <Overlay interactive>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] [&:lang(hi)]:tracking-normal text-muted-foreground">
        {mode === "daily" ? t("mode.daily") : t("mode.endless")}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t("endless.over")}
      </h2>
      <p className="text-base font-semibold text-foreground">
        {t("endless.result", { passes, punya })}
      </p>
      <p className="text-sm text-muted-foreground">
        {mode === "daily" ? t("endless.bestToday", { best }) : t("endless.best", { best })}
        {newBest && (
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
            {t("endless.newBest")}
          </span>
        )}
      </p>
      <div className="max-w-md rounded-xl border border-border/60 bg-background/60 px-4 py-3">
        <VerseBlock verse={chapter.verse} compact />
      </div>
      <div
        className={cn(
          "mt-1 flex flex-wrap items-start justify-center gap-2 transition-opacity duration-300",
          !canContinue && "pointer-events-none opacity-0",
        )}
      >
        <Button
          size="lg"
          disabled={!canContinue}
          className="rounded-full px-7 shadow-lg"
          onClick={onRetry}
        >
          {t("over.retry")}
        </Button>
        <Button size="lg" variant="outline" className="rounded-full px-6" onClick={onChapters}>
          {t("nav.chapters")}
        </Button>
        {punya > 0 && <ShareButton onShare={onShare} />}
      </div>
    </Overlay>
  );
}

export function WinScreen({
  chapter,
  punya,
  best,
  flawless,
  onPlayAgain,
  onChapters,
  onShare,
}: {
  chapter: Chapter;
  punya: number;
  best: number;
  flawless: boolean;
  onPlayAgain: () => void;
  onChapters: () => void;
  onShare: () => Promise<ShareOutcome>;
}) {
  const t = useT();
  return (
    <Overlay interactive>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] [&:lang(hi)]:tracking-normal text-muted-foreground">
        {t("win.eyebrow")}
      </p>
      <h2 lang="hi" className="font-devanagari text-3xl font-bold text-foreground sm:text-4xl">
        जय श्री राम
      </h2>
      <VerseBlock verse={chapter.verse} />
      <p className="text-sm text-foreground">
        {t("win.score", { punya, best })}
        {flawless && (
          <span
            lang="hi"
            className="font-devanagari ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-primary"
          >
            निर्विघ्न
          </span>
        )}
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-center gap-2">
        <Button size="lg" autoFocus className="rounded-full px-7 shadow-lg" onClick={onPlayAgain}>
          {t("win.again")}
        </Button>
        <Button size="lg" variant="outline" className="rounded-full px-6" onClick={onChapters}>
          {t("nav.chapters")}
        </Button>
        <ShareButton onShare={onShare} />
      </div>
    </Overlay>
  );
}

export function PauseMenu({
  onResume,
  onRestart,
  onChapters,
  onSettings,
}: {
  onResume: () => void;
  onRestart: () => void;
  onChapters: () => void;
  onSettings: () => void;
}) {
  const t = useT();
  return (
    <Overlay interactive>
      <h2 className="text-3xl font-bold tracking-tight text-foreground">{t("pause.title")}</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={onResume}>
          {t("pause.resume")}
        </Button>
        <Button size="lg" variant="outline" onClick={onRestart}>
          {t("pause.restart")}
        </Button>
        <Button size="lg" variant="ghost" onClick={onChapters}>
          {t("nav.chapters")}
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onSettings}>
        <Settings2 /> {t("nav.settings")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("pause.hint")}</p>
    </Overlay>
  );
}
