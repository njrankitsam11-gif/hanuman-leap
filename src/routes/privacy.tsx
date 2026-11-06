import { createFileRoute, Link } from "@tanstack/react-router";
import { LangProvider, useLang, useT, type StringKey } from "@/i18n";

const SECTIONS: [title: StringKey, body: StringKey][] = [
  ["privacy.collectTitle", "privacy.collect"],
  ["privacy.deviceTitle", "privacy.device"],
  ["privacy.servicesTitle", "privacy.services"],
  ["privacy.deleteTitle", "privacy.delete"],
];

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy - Hanuman's Leap to Lanka" }] }),
  component: () => (
    <LangProvider>
      <Privacy />
    </LangProvider>
  ),
});

function Privacy() {
  const t = useT();
  const { lang } = useLang();
  return (
    <main lang={lang} className="mx-auto min-h-dvh max-w-xl bg-background px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("privacy.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("privacy.intro")}</p>
      {SECTIONS.map(([title, body]) => (
        <section key={title} className="mt-6">
          <h2 className="text-lg font-semibold text-foreground">{t(title)}</h2>
          <p className="mt-1 text-muted-foreground">{t(body)}</p>
        </section>
      ))}
      <Link to="/" className="mt-8 inline-block font-semibold text-primary underline">
        {t("privacy.back")}
      </Link>
    </main>
  );
}
