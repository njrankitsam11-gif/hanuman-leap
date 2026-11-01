import hanumanImg from "@/assets/hanuman.webp";
import oceanImg from "@/assets/ocean-bg.webp";
import { VERSES } from "@/game/chapters/verses";
import { useLang, useT } from "@/i18n";

/**
 * The first page a visitor sees: a painted dawn over the sea with Hanuman mid-leap
 * toward Lanka. Pure DOM/CSS/SVG — the game canvas only mounts after "Play".
 */
export default function Landing({ onPlay }: { onPlay: () => void }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const verse = VERSES.launch;
  return (
    <main
      lang={lang}
      className="landing relative flex h-dvh w-full flex-col items-center overflow-hidden text-center"
    >
      {/* Sky */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#3b1d4a_0%,#a8423a_32%,#f08a3c_55%,#ffd58a_72%,#fff0c9_100%)]" />
      {/* Sun */}
      <div className="landing-glow absolute left-1/2 top-[44%] h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fff7d6_0%,#ffd36b_30%,rgba(255,170,60,0.35)_55%,transparent_70%)]" />
      {/* Clouds */}
      <div className="landing-drift absolute left-[-10%] top-[22%] h-10 w-72 rounded-full bg-white/25 blur-xl" />
      <div className="landing-drift-slow absolute right-[-8%] top-[34%] h-8 w-96 rounded-full bg-white/20 blur-xl" />
      {/* Birds */}
      <svg
        className="landing-drift absolute left-[18%] top-[16%] w-24 opacity-70"
        viewBox="0 0 100 30"
        aria-hidden
      >
        <path
          d="M5 15 q8-8 16 0 q8-8 16 0M50 8 q6-6 12 0 q6-6 12 0M70 22 q5-5 10 0 q5-5 10 0"
          stroke="#3b1d4a"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      {/* Lanka on the horizon */}
      <svg
        className="absolute bottom-[30%] right-[4%] w-[38vmin] max-w-[340px]"
        viewBox="0 0 200 90"
        aria-hidden
      >
        <path
          fill="#5a2340"
          opacity="0.75"
          d="M0 90 L0 70 Q30 55 55 62 L60 40 L64 40 L66 28 L70 40 L74 40 L78 58 L92 58 L95 30 L100 12 L105 30 L108 58 L122 56 L126 36 L130 36 L133 22 L136 36 L140 36 L144 60 Q175 52 200 68 L200 90 Z"
        />
        <circle cx="100" cy="9" r="2.5" fill="#ffd36b" />
      </svg>
      {/* Sea */}
      <div
        className="absolute inset-x-0 bottom-0 h-[32%] bg-cover bg-bottom"
        style={{ backgroundImage: `url(${oceanImg})` }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,rgba(255,200,120,0.55),rgba(30,60,90,0.35))]" />
      {/* Hanuman mid-leap */}
      <div className="landing-float absolute left-[6%] top-[46%] w-[34vmin] max-w-[300px] md:left-[12%]">
        <div className="absolute inset-0 scale-125 rounded-full bg-[radial-gradient(circle,rgba(255,220,120,0.8),transparent_65%)]" />
        <img
          src={hanumanImg}
          alt=""
          className="relative w-full -rotate-12 drop-shadow-[0_10px_20px_rgba(90,30,20,0.45)]"
        />
      </div>

      {/* Copy */}
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "hi" : "en")}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur"
      >
        {lang === "en" ? "हिन्दी" : "English"}
      </button>
      <div className="relative z-10 mt-[max(3.5rem,env(safe-area-inset-top))] px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-200 [&:lang(hi)]:tracking-normal">
          {t("app.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_3px_12px_rgba(60,10,30,0.6)] sm:text-6xl">
          {t("app.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-amber-50/90 sm:text-lg">
          {t("app.tagline")}
        </p>
      </div>

      <div className="relative z-10 mt-auto mb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3 px-4">
        <figure className="max-w-md rounded-2xl bg-black/25 px-5 py-3 text-amber-50 backdrop-blur-sm">
          <figcaption className="text-[10px] uppercase tracking-[0.3em] text-amber-200/80">
            {t("landing.verseLabel")} · {verse.ref}
          </figcaption>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{verse.devanagari}</p>
        </figure>
        <button
          type="button"
          autoFocus
          onClick={onPlay}
          className="landing-pulse rounded-full bg-gradient-to-b from-orange-400 to-orange-600 px-12 py-4 text-xl font-bold text-white shadow-[0_8px_30px_rgba(234,88,12,0.6)] transition hover:scale-105 active:scale-95"
        >
          {t("landing.play")}
        </button>
        <p className="text-xs font-medium text-white/85">{t("landing.facts")}</p>
      </div>
    </main>
  );
}
