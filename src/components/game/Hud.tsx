import { Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Chapter } from "@/game/chapters/types";
import { totalSteps } from "@/game/chapters";
import { useT } from "@/i18n";
import { stopPointer } from "./Overlay";

export function Hud({
  chapter,
  chapterIndex,
  passes,
  punya,
  best,
  muted,
  showPause,
  onMute,
  onPause,
}: {
  chapter: Chapter;
  chapterIndex: number;
  passes: number;
  punya: number;
  best: number;
  muted: boolean;
  showPause: boolean;
  onMute: () => void;
  onPause: () => void;
}) {
  const t = useT();
  const steps = totalSteps(chapter);
  const pill =
    "rounded-full bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur sm:px-4 sm:py-1.5";
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2 sm:left-4 sm:top-4">
        <div className={`${pill} text-sm font-semibold text-foreground`}>
          {t("hud.punya")} {punya}
        </div>
        <div className={`${pill} flex min-w-[9rem] items-center gap-2 text-muted-foreground`}>
          <Progress value={(Math.min(passes, steps) / steps) * 100} className="h-1.5 flex-1" />
          <span className="tabular-nums">
            {Math.min(passes, steps)}/{steps}
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
        <div className="flex items-center gap-2">
          <div className={`${pill} text-sm font-semibold text-foreground`}>
            {t("hud.best")} {best}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label={muted ? t("hud.unmute") : t("hud.mute")}
            className="pointer-events-auto h-8 w-8 rounded-full bg-background/70 backdrop-blur"
            onPointerDown={stopPointer}
            onClick={onMute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          {showPause && (
            <Button
              variant="outline"
              size="icon"
              aria-label={t("hud.pause")}
              className="pointer-events-auto h-8 w-8 rounded-full bg-background/70 backdrop-blur"
              onPointerDown={stopPointer}
              onClick={onPause}
            >
              <Pause />
            </Button>
          )}
        </div>
        <div className={`${pill} text-foreground`}>
          <span className="text-muted-foreground">{chapterIndex + 1} · </span>
          <span lang="hi" className="font-devanagari">
            {chapter.title.hi}
          </span>
        </div>
      </div>
    </>
  );
}
