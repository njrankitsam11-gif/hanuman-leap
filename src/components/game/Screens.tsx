import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Chapter } from "@/game/chapters/types";
import { CHAPTER_COUNT } from "@/game/chapters";
import { cn } from "@/lib/utils";
import { ChapterSelect } from "./ChapterSelect";
import { Overlay, stopPointer } from "./Overlay";
import { VerseBlock } from "./VerseBlock";

export function StartScreen({
  unlocked,
  onStart,
  onSelect,
}: {
  unlocked: number;
  onStart: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <Overlay>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        Sundara Kanda
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Hanuman's Leap to Lanka
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Carry Lord Ram's ring across the sea to Sita Maa, set Lanka ablaze, and bring her
        crest-jewel home — through eight chapters of the Sundarkand.
      </p>
      <Button
        size="lg"
        className="mt-1 rounded-full px-7 shadow-lg transition-transform hover:scale-105"
        onPointerDown={stopPointer}
        onClick={onStart}
      >
        Begin the leap
      </Button>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        or choose a chapter
      </p>
      <ChapterSelect unlocked={unlocked} onSelect={onSelect} />
      <p className="text-xs text-muted-foreground">Space or tap to rise · P pause · M mute</p>
    </Overlay>
  );
}

export function ChapterIntro({ chapter, index }: { chapter: Chapter; index: number }) {
  return (
    <Overlay className="bg-background/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        Chapter {index + 1} of {CHAPTER_COUNT}
      </p>
      <h2 lang="hi" className="font-devanagari text-3xl font-bold text-foreground sm:text-4xl">
        {chapter.title.hi}
      </h2>
      <p className="text-base font-semibold text-foreground/80">{chapter.title.en}</p>
      <p className="max-w-md text-sm text-muted-foreground">{chapter.intro}</p>
      {chapter.introVerse && (
        <div className="mt-1 max-w-md rounded-xl border border-border/60 bg-background/60 px-4 py-3">
          <VerseBlock verse={chapter.introVerse} compact />
        </div>
      )}
      <p className="mt-2 animate-pulse text-sm font-semibold text-primary">
        Tap or press Space to leap
      </p>
    </Overlay>
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
  return (
    <Overlay interactive>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        Chapter {index + 1} cleared · Punya {punya}
      </p>
      <VerseBlock verse={chapter.verse} />
      <Button
        size="lg"
        autoFocus
        className="mt-2 rounded-full px-7 shadow-lg transition-transform hover:scale-105"
        onClick={onContinue}
      >
        Continue the journey
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
}: {
  chapter: Chapter;
  index: number;
  punya: number;
  canContinue: boolean;
  onRetry: () => void;
  onChapters: () => void;
}) {
  return (
    <Overlay>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        The leap ended
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Punya {punya} in chapter {index + 1},{" "}
        <span lang="hi" className="font-devanagari">
          {chapter.title.hi}
        </span>
        . The ring is still in your hand.
      </p>
      <div
        className={cn("flex gap-2 transition-opacity duration-300", !canContinue && "opacity-0")}
      >
        <Button
          size="lg"
          className="rounded-full px-7 shadow-lg"
          onPointerDown={stopPointer}
          onClick={onRetry}
        >
          Leap again
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-6"
          onPointerDown={stopPointer}
          onClick={onChapters}
        >
          Chapters
        </Button>
      </div>
      <p
        className={cn(
          "text-xs text-muted-foreground transition-opacity duration-300",
          !canContinue && "opacity-0",
        )}
      >
        Space or tap to retry
      </p>
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
}: {
  chapter: Chapter;
  punya: number;
  best: number;
  flawless: boolean;
  onPlayAgain: () => void;
  onChapters: () => void;
}) {
  return (
    <Overlay interactive>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        The Chudamani delivered
      </p>
      <h2 lang="hi" className="font-devanagari text-3xl font-bold text-foreground sm:text-4xl">
        जय श्री राम
      </h2>
      <VerseBlock verse={chapter.verse} />
      <p className="text-sm text-foreground">
        Punya <span className="font-semibold">{punya}</span> · Best {best}
        {flawless && (
          <span
            lang="hi"
            className="font-devanagari ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-primary"
          >
            निर्विघ्न
          </span>
        )}
      </p>
      <div className="mt-1 flex gap-2">
        <Button size="lg" autoFocus className="rounded-full px-7 shadow-lg" onClick={onPlayAgain}>
          Leap again from the shore
        </Button>
        <Button size="lg" variant="outline" className="rounded-full px-6" onClick={onChapters}>
          Chapters
        </Button>
      </div>
    </Overlay>
  );
}

export function PauseMenu({
  muted,
  onResume,
  onRestart,
  onChapters,
  onMute,
}: {
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onChapters: () => void;
  onMute: () => void;
}) {
  return (
    <Overlay interactive>
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Paused</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={onResume}>
          Resume
        </Button>
        <Button size="lg" variant="outline" onClick={onRestart}>
          Restart chapter
        </Button>
        <Button size="lg" variant="ghost" onClick={onChapters}>
          Chapters
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={muted} onCheckedChange={onMute} /> Mute sounds
      </label>
      <p className="text-xs text-muted-foreground">P or Esc to resume · M to mute</p>
    </Overlay>
  );
}
