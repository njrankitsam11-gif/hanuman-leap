import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ShareOutcome } from "@/game/share";
import { useT } from "@/i18n";
import { stopPointer } from "./Overlay";

/** Runs the async share and reports the outcome inline for a moment. */
export function ShareButton({ onShare }: { onShare: () => Promise<ShareOutcome> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<ShareOutcome | null>(null);

  useEffect(() => {
    if (!note || note === "shared") return;
    const id = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(id);
  }, [note]);

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        size="lg"
        variant="secondary"
        className="rounded-full px-6"
        disabled={busy}
        onPointerDown={stopPointer}
        onClick={async () => {
          setBusy(true);
          try {
            setNote(await onShare());
          } finally {
            setBusy(false);
          }
        }}
      >
        <Share2 /> {t("share")}
      </Button>
      {note === "copied" && <p className="text-xs text-muted-foreground">{t("share.copied")}</p>}
      {note === "failed" && <p className="text-xs text-muted-foreground">{t("share.failed")}</p>}
    </div>
  );
}
