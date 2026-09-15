import { createFileRoute } from "@tanstack/react-router";
import HanumanLeap from "@/components/HanumanLeap";

export const Route = createFileRoute("/")({
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
        content: "A one-tap flying game retelling Hanuman's ocean crossing from the Sundara Kanda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Sundara Kanda
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Hanuman's Leap to Lanka
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            From the Indian shore to Lanka, with Lord Ram's ring for Sita Maa.
          </p>
        </header>
        <HanumanLeap />
      </div>
    </main>
  );
}
