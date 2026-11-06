import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/game/AccountPanel";
import HanumanLeap from "@/components/HanumanLeap";
import Landing from "@/components/Landing";
import { LangProvider, useLang, useT } from "@/i18n";
import { canPlay, checkAccount, useAccount } from "@/lib/cloud-save";

/** `?chapter=n` jumps straight to a chapter's intro — handy for testing later chapters. */
function validateSearch(search: Record<string, unknown>): { chapter?: number } {
  const raw = search["chapter"];
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isInteger(n) && n >= 0 ? { chapter: n } : {};
}

export const Route = createFileRoute("/")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Hanuman's Leap to Lanka - Ramayana Flying Game" },
      {
        name: "description",
        content:
          "Fly as Hanuman carrying Lord Ram's ring across the sea to Sita Maa, dodging Mainaka, Surasa and Simhika in this one-tap arcade game.",
      },
      { property: "og:title", content: "Hanuman's Leap to Lanka" },
      {
        property: "og:description",
        content:
          "A one-tap flying game through ten chapters of the Sundarkand, with Tulsidas's verses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://hanuman-leap.vercel.app/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://hanuman-leap.vercel.app/og.jpg" },
    ],
  }),
  component: Index,
});

/**
 * Portrait / small screens: the game fills the viewport and the title lives on its
 * start overlay. Desktop landscape: a header above, the game box contain-fit below.
 */
function Index() {
  return (
    <LangProvider>
      <Page />
    </LangProvider>
  );
}

function Page() {
  const { chapter } = Route.useSearch();
  const { lang } = useLang();
  const t = useT();
  // The landing page greets every visit; `?chapter=n` skips it for testing.
  const [playing, setPlaying] = useState(chapter !== undefined);
  const account = useAccount();
  useEffect(() => {
    if (playing) void checkAccount();
  }, [playing]);
  if (!playing) return <Landing onPlay={() => setPlaying(true)} />;
  if (!canPlay(account)) {
    return (
      <main
        lang={lang}
        className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-4"
      >
        <div className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-center text-2xl font-semibold">
            {account.status === "loading" ? t("account.loading") : t("account.gate")}
          </h1>
          <AccountPanel />
        </div>
      </main>
    );
  }
  return (
    <main
      lang={lang}
      className="flex h-dvh flex-col items-center gap-4 overflow-hidden bg-background p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] md:landscape:px-6 md:landscape:py-6"
    >
      <header className="hidden text-center md:landscape:block">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] [&:lang(hi)]:tracking-normal text-muted-foreground">
          {t("app.eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
          {t("app.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{t("app.tagline")}</p>
      </header>
      <div className="flex min-h-0 w-full flex-1 md:landscape:max-w-[1000px]">
        <HanumanLeap {...(chapter !== undefined ? { initialChapter: chapter } : {})} />
      </div>
      <p className="hidden text-xs text-muted-foreground md:landscape:block">{t("app.footer")}</p>
    </main>
  );
}
