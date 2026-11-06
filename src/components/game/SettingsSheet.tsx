import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ACHIEVEMENTS } from "@/game/achievements";
import { CHAPTERS } from "@/game/chapters";
import type { Lang, Stats } from "@/game/storage";
import { LANG_NAMES, pick, useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { AccountPanel } from "./AccountPanel";
import { stopPointer } from "./Overlay";

export type Settings = {
  muted: boolean;
  music: boolean;
  haptics: boolean;
  easy: boolean;
};

export function SettingsSheet({
  open,
  onOpenChange,
  settings,
  hapticsAvailable,
  stats,
  achievements,
  onChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  /** Hide the vibration toggle where the platform can't buzz (desktop, iOS Safari). */
  hapticsAvailable: boolean;
  stats: Stats;
  achievements: readonly string[];
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [confirming, setConfirming] = useState(false);

  const row = "flex items-center justify-between gap-4 py-2";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setConfirming(false);
        onOpenChange(o);
      }}
    >
      <DialogContent
        lang={lang}
        className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl"
        onPointerDown={stopPointer}
      >
        <DialogHeader>
          <DialogTitle>{t("nav.settings")}</DialogTitle>
          <DialogDescription className="sr-only">{t("nav.settings")}</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60">
          <label className={row}>
            <span className="text-sm font-medium">{t("settings.sound")}</span>
            <Switch checked={!settings.muted} onCheckedChange={(v) => onChange({ muted: !v })} />
          </label>

          <label className={row}>
            <span className="text-sm font-medium">{t("settings.music")}</span>
            <Switch
              checked={settings.music}
              disabled={settings.muted}
              onCheckedChange={(v) => onChange({ music: v })}
            />
          </label>

          {hapticsAvailable && (
            <label className={row}>
              <span className="text-sm font-medium">{t("settings.haptics")}</span>
              <Switch
                checked={settings.haptics}
                onCheckedChange={(v) => onChange({ haptics: v })}
              />
            </label>
          )}

          <label className={row}>
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t("settings.easy")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.easyHint")}</span>
            </span>
            <Switch checked={settings.easy} onCheckedChange={(v) => onChange({ easy: v })} />
          </label>

          <div className={row}>
            <span className="text-sm font-medium">{t("settings.language")}</span>
            <div
              role="radiogroup"
              aria-label={t("settings.language")}
              className="flex overflow-hidden rounded-full border border-border"
            >
              {(["hi", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  lang={l}
                  aria-checked={lang === l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "px-3 py-1 text-sm transition-colors",
                    lang === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent/30",
                  )}
                >
                  {LANG_NAMES[l]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AccountPanel />

        <section className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] [&:lang(hi)]:tracking-normal text-muted-foreground">
            {t("settings.journey")}
          </h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t("settings.runs")}</dt>
            <dd className="text-right tabular-nums">{stats.runs}</dd>
            <dt className="text-muted-foreground">{t("settings.leaps")}</dt>
            <dd className="text-right tabular-nums">{stats.leaps}</dd>
            <dt className="text-muted-foreground">{t("settings.deaths")}</dt>
            <dd className="text-right tabular-nums">{stats.deaths}</dd>
            <dt className="text-muted-foreground">{t("settings.wins")}</dt>
            <dd className="text-right tabular-nums">{stats.wins}</dd>
          </dl>
          {stats.chapters.some((c) => c.clears + c.deaths > 0) && (
            <table className="mt-3 w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left font-medium">{t("stats.chapter")}</th>
                  <th className="text-right font-medium">{t("stats.clears")}</th>
                  <th className="text-right font-medium">{t("stats.falls")}</th>
                </tr>
              </thead>
              <tbody>
                {CHAPTERS.map((ch, i) => {
                  const c = stats.chapters[i];
                  if (!c || c.clears + c.deaths === 0) return null;
                  return (
                    <tr key={ch.id}>
                      <td lang="hi" className="font-devanagari py-0.5">
                        {i + 1} · {ch.title.hi}
                      </td>
                      <td className="text-right tabular-nums">{c.clears}</td>
                      <td className="text-right tabular-nums">{c.deaths}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
          <h3 className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground [&:lang(hi)]:tracking-normal">
            <span>{t("ach.title")}</span>
            <span className="tabular-nums">
              {t("ach.progress", { n: achievements.length, total: ACHIEVEMENTS.length })}
            </span>
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {ACHIEVEMENTS.map((a) => {
              const got = achievements.includes(a.id);
              return (
                <li
                  key={a.id}
                  title={pick(lang, a.desc)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs",
                    got
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground/60",
                  )}
                >
                  {pick(lang, a.title)}
                </li>
              );
            })}
          </ul>
        </section>

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-sm">{t("settings.resetConfirm")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                {t("settings.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
              >
                {t("settings.erase")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              {t("settings.reset")}
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              {t("settings.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
