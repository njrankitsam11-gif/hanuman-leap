import { describe, expect, it } from "vitest";
import { drawShareCard, shareText, type ShareData } from "../share";

function stubContext() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, prop: string) => {
      if (prop in target) return target[prop];
      if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
      return (...args: unknown[]) => {
        calls.push(prop);
        for (const a of args) {
          if (typeof a === "number" && !Number.isFinite(a)) {
            throw new Error(`${prop} received a non-finite argument`);
          }
        }
      };
    },
    set: (target, prop: string, value) => {
      target[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const hero = {
  complete: true,
  naturalWidth: 761,
  naturalHeight: 460,
} as unknown as HTMLImageElement;

const base: ShareData = {
  mode: "story",
  lang: "en",
  punya: 1240,
  passes: 31,
  chapter: 6,
  chapterTitle: "अशोक वाटिका",
  chapterCount: 8,
  won: false,
  verseLine: "राम काजु कीन्हें बिनु मोहि कहाँ बिश्राम॥",
  date: "2026-09-15",
  hero,
};

describe("share", () => {
  it("draws a card for every mode/language without throwing", () => {
    for (const mode of ["story", "endless", "daily"] as const) {
      for (const lang of ["en", "hi"] as const) {
        for (const won of [false, true]) {
          const { ctx, calls } = stubContext();
          drawShareCard(ctx, { ...base, mode, lang, won });
          expect(calls).toContain("drawImage");
          expect(calls.filter((c) => c === "fillText").length).toBeGreaterThanOrEqual(6);
        }
      }
    }
  });

  it("phrases the result per mode and language, with Indian digit grouping", () => {
    expect(shareText(base)).toBe("Hanuman's Leap to Lanka: 1,240 punya, chapter 6/8 अशोक वाटिका.");
    expect(shareText({ ...base, won: true, lang: "hi" })).toMatch(/चूड़ामणि/);
    expect(shareText({ ...base, mode: "endless" })).toMatch(/31 leaps/);
    expect(shareText({ ...base, mode: "daily", punya: 123456 })).toMatch(/2026-09-15.*1,23,456/);
  });
});
