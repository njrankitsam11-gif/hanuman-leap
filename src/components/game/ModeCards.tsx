import { Infinity as InfinityIcon, Lock, Sun } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { stopPointer } from "./Overlay";

/** Endless Flight and Today's Leap, under the chapter grid on the start screen. */
export function ModeCards({
  unlocked,
  endlessBest,
  dailyBest,
  dailyDate,
  onEndless,
  onDaily,
}: {
  unlocked: boolean;
  endlessBest: number;
  dailyBest: number;
  dailyDate: string;
  onEndless: () => void;
  onDaily: () => void;
}) {
  const t = useT();
  const card =
    "flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors";
  const live =
    "border-border bg-background/80 text-foreground hover:border-primary hover:bg-primary/10";
  const dead = "cursor-not-allowed border-border/60 bg-background/40 text-muted-foreground/60";
  return (
    <div className="flex w-full max-w-lg flex-col gap-1.5">
      <div className="flex gap-1.5 sm:gap-2">
        <button
          type="button"
          disabled={!unlocked}
          onPointerDown={stopPointer}
          onClick={onEndless}
          className={cn(card, unlocked ? live : dead)}
        >
          {unlocked ? (
            <InfinityIcon className="size-5 shrink-0 text-primary" />
          ) : (
            <Lock className="size-4 shrink-0" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">{t("mode.endless")}</span>
            {unlocked && endlessBest > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("endless.best", { best: endlessBest })}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          disabled={!unlocked}
          onPointerDown={stopPointer}
          onClick={onDaily}
          className={cn(card, unlocked ? live : dead)}
        >
          {unlocked ? (
            <Sun className="size-5 shrink-0 text-primary" />
          ) : (
            <Lock className="size-4 shrink-0" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">{t("mode.daily")}</span>
            <span className="truncate text-xs text-muted-foreground">
              {unlocked && dailyBest > 0 ? t("endless.bestToday", { best: dailyBest }) : dailyDate}
            </span>
          </span>
        </button>
      </div>
      {!unlocked && <p className="text-[11px] text-muted-foreground">{t("mode.locked")}</p>}
    </div>
  );
}
