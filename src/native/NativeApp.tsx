import { useState } from "react";
import HanumanLeap from "@/components/HanumanLeap";
import Landing from "@/components/Landing";
import { LangProvider, useLang } from "@/i18n";

export function NativeApp() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}

/** Full-bleed game box padded by the device's safe areas (notch, home indicator). */
function Shell() {
  const { lang } = useLang();
  // Same title page as the web: shown on every launch until Play.
  const [playing, setPlaying] = useState(false);
  if (!playing) return <Landing onPlay={() => setPlaying(true)} />;
  return (
    <main
      lang={lang}
      className="flex h-dvh flex-col items-center overflow-hidden bg-background p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]"
    >
      <div className="flex min-h-0 w-full flex-1">
        <HanumanLeap />
      </div>
    </main>
  );
}
