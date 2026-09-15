import { Lock } from "lucide-react";
import { CHAPTERS } from "@/game/chapters";
import { cn } from "@/lib/utils";
import { stopPointer } from "./Overlay";

export function ChapterSelect({
  unlocked,
  onSelect,
}: {
  unlocked: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid w-full max-w-lg grid-cols-4 gap-1.5 sm:gap-2">
      {CHAPTERS.map((ch, i) => {
        const locked = i > unlocked;
        return (
          <button
            key={ch.id}
            type="button"
            disabled={locked}
            aria-label={`Chapter ${i + 1}: ${ch.title.en}${locked ? " (locked)" : ""}`}
            onPointerDown={stopPointer}
            onClick={() => onSelect(i)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition-colors",
              locked
                ? "cursor-not-allowed border-border/60 bg-background/40 text-muted-foreground/60"
                : "border-border bg-background/80 text-foreground hover:border-primary hover:bg-primary/10",
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {locked ? <Lock className="inline size-3" /> : i + 1}
            </span>
            <span lang="hi" className="font-devanagari text-xs leading-tight sm:text-sm">
              {ch.title.hi}
            </span>
          </button>
        );
      })}
    </div>
  );
}
