import { Award } from "lucide-react";
import { useEffect, useState } from "react";
import { achievementById } from "@/game/achievements";
import { pick, useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";

const SHOW_MS = 3200;

/**
 * Shows unlocked achievements one after another. `queue` only ever grows within a
 * mount; the component remembers how many it has already shown.
 */
export function AchievementToast({ queue }: { queue: readonly string[] }) {
  const t = useT();
  const { lang } = useLang();
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(false);

  const current = shown < queue.length ? achievementById(queue[shown]!) : undefined;

  useEffect(() => {
    if (!current) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), SHOW_MS - 300);
    const next = setTimeout(() => setShown((n) => n + 1), SHOW_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(next);
    };
  }, [current]);

  if (!current) return null;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary/30 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur transition-all duration-300 sm:top-20",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <Award className="size-6 shrink-0 text-primary" />
      <div className="text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground [&:lang(hi)]:tracking-normal">
          {t("ach.unlocked")}
        </p>
        <p className="text-sm font-semibold text-foreground">{pick(lang, current.title)}</p>
        <p className="text-xs text-muted-foreground">{pick(lang, current.desc)}</p>
      </div>
    </div>
  );
}
