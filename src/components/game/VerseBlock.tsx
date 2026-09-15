import { Badge } from "@/components/ui/badge";
import type { Verse } from "@/game/chapters/types";
import { cn } from "@/lib/utils";

export function VerseBlock({ verse, compact = false }: { verse: Verse; compact?: boolean }) {
  return (
    <figure className={cn("mx-auto max-w-xl", compact ? "space-y-1.5" : "space-y-3")}>
      <blockquote
        lang="hi"
        className={cn(
          "font-devanagari whitespace-pre-line font-semibold leading-relaxed text-foreground",
          compact ? "text-base sm:text-lg" : "text-lg sm:text-2xl",
        )}
      >
        {verse.devanagari}
      </blockquote>
      {!compact && (
        <p className="whitespace-pre-line text-xs italic leading-relaxed text-muted-foreground sm:text-sm">
          {verse.transliteration}
        </p>
      )}
      <figcaption className="space-y-2">
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {verse.meaning}
        </p>
        <Badge variant="secondary" lang="hi" className="font-devanagari font-normal">
          सुंदरकांड · {verse.ref}
        </Badge>
      </figcaption>
    </figure>
  );
}
