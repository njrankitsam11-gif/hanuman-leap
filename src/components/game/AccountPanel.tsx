import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/game/share";
import { useT, type StringKey } from "@/i18n";
import { deleteAccount, sendCode, signOut, useAccount, verifyCode } from "@/lib/cloud-save";

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Sign-in by emailed code: the screen before the game, and the account box in settings. */
export function AccountPanel() {
  const t = useT();
  const account = useAccount();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [keepEmail, setKeepEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<StringKey | null>(null);

  if (account.status === "off" || account.status === "loading") return null;

  const run = async (action: () => Promise<void>, error: StringKey = "account.error") => {
    setBusy(true);
    setFailed(null);
    try {
      await action();
    } catch {
      setFailed(error);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (codeSent) {
      void run(async () => {
        await verifyCode(email.trim(), code.replace(/\s/g, ""));
        setCode("");
        setCodeSent(false);
      }, "account.codeError");
    } else {
      void run(async () => {
        await sendCode(email.trim());
        setCodeSent(true);
      });
    }
  };

  return (
    <section className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] [&:lang(hi)]:tracking-normal text-muted-foreground">
        {t("account.title")}
      </h3>

      {account.status === "in" ? (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <p className="break-words">{t("account.signedIn", { email: account.email })}</p>
          <p className="text-xs text-muted-foreground">{t("account.synced")}</p>
          {confirming ? (
            <>
              <p>{t("account.deleteConfirm")}</p>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  checked={keepEmail}
                  onChange={(e) => setKeepEmail(e.target.checked)}
                />
                <span>{t("account.keepEmail")}</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirming(false);
                    setKeepEmail(false);
                  }}
                >
                  {t("settings.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(() => deleteAccount(keepEmail)).then(() => setConfirming(false))
                  }
                >
                  {t("account.delete")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
                {t("account.delete")}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(signOut)}>
                {t("account.signOut")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form className="mt-2 flex flex-col gap-2" onSubmit={submit}>
          <p className="text-xs text-muted-foreground">
            {codeSent ? t("account.codeSent", { email }) : t("account.pitch")}
          </p>
          {codeSent ? (
            <input
              className={input}
              aria-label={t("account.code")}
              placeholder={t("account.code")}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          ) : (
            <input
              className={input}
              aria-label={t("account.email")}
              placeholder={t("account.email")}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <Button type="submit" size="sm" disabled={busy}>
            {codeSent ? t("account.verify") : t("account.send")}
          </Button>
          {codeSent && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setFailed(null);
              }}
            >
              {t("account.back")}
            </Button>
          )}
        </form>
      )}

      {failed && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t(failed)}
        </p>
      )}

      <a
        href={`${SITE_URL}/privacy`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block text-xs text-muted-foreground underline underline-offset-2"
      >
        {t("privacy.title")}
      </a>
    </section>
  );
}
