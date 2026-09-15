import { describe, expect, it } from "vitest";
import {
  CHAPTERS,
  chapterAt,
  ENDLESS,
  ENDLESS_INDEX,
  finaleDuration,
  isEndless,
  targetPasses,
  VERSES,
  type Chapter,
} from "../chapters";
import { ENDLESS_DAY, endlessSky } from "../render/sky";
import { KINDS } from "../kinds";

describe("chapter data", () => {
  it("has eight chapters in Sundarkand order, ending on the return", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([
      "prelude",
      "mainaka",
      "surasa",
      "simhika",
      "lankini",
      "vatika",
      "dahan",
      "return",
    ]);
  });

  it("every chapter has a positive goal, a non-empty roster of known kinds, and sane difficulty", () => {
    for (const ch of CHAPTERS) {
      expect(targetPasses(ch)).toBeGreaterThan(0);
      expect(finaleDuration(ch)).toBeGreaterThan(0);
      expect(ch.roster.length).toBeGreaterThan(0);
      for (const [kind, weight] of ch.roster) {
        expect(KINDS[kind]).toBeDefined();
        expect(weight).toBeGreaterThan(0);
      }
      expect(ch.difficulty.speed).toBeGreaterThan(0);
      expect(ch.difficulty.spawn).toBeGreaterThan(0);
      expect(ch.difficulty.gap).toBeGreaterThan(ch.difficulty.gapMin);
      expect(ch.scoreMul).toBeGreaterThanOrEqual(1);
    }
  });

  it("every chapter's prose exists in both languages, Hindi in Devanagari", () => {
    for (const ch of CHAPTERS as readonly Chapter[]) {
      for (const text of [ch.title, ch.intro, ch.caption]) {
        expect(text.en, ch.id).not.toBe("");
        expect(text.hi, ch.id).toMatch(/[ऀ-ॿ]/);
      }
    }
  });

  it("only the Lankini chapter is a boss chapter, and its boss kind exists", () => {
    const bosses = CHAPTERS.filter((c) => c.goal.kind === "boss");
    expect(bosses.map((c) => c.id)).toEqual(["lankini"]);
    expect(KINDS.lankini.boss).toBe(true);
  });
});

describe("verses", () => {
  const all = Object.entries(VERSES);

  it("every verse is complete", () => {
    for (const [key, v] of all) {
      expect(v.ref, key).not.toBe("");
      expect(v.devanagari, key).toMatch(/[ऀ-ॿ]/);
      expect(v.transliteration, key).not.toBe("");
      expect(v.meaning, key).not.toBe("");
      expect(v.meaningHi, key).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("every line of Devanagari ends in a danda", () => {
    for (const [key, v] of all) {
      for (const line of v.devanagari.split("\n")) {
        expect(line.trim(), `${key}: ${line}`).toMatch(/[।॥]$/);
      }
    }
  });

  it("no unverified verse text ships", () => {
    for (const [key, v] of all) expect(v.verified, `${key} is not verified`).toBe(true);
    for (const ch of CHAPTERS as readonly Chapter[]) {
      expect(ch.verse.verified, ch.id).toBe(true);
      if (ch.introVerse) expect(ch.introVerse.verified, `${ch.id} intro`).toBe(true);
    }
  });
});

describe("endless chapter", () => {
  it("lives outside the arc at ENDLESS_INDEX with every non-boss kind in its roster", () => {
    expect(CHAPTERS.some((c) => c.id === "endless")).toBe(false);
    expect(chapterAt(ENDLESS_INDEX)).toBe(ENDLESS);
    expect(isEndless(ENDLESS)).toBe(true);
    expect(CHAPTERS.some(isEndless)).toBe(false);
    const kinds = ENDLESS.roster.map(([k]) => k);
    for (const k of Object.keys(KINDS) as (keyof typeof KINDS)[]) {
      if (KINDS[k].boss) expect(kinds).not.toContain(k);
      else expect(kinds).toContain(k);
    }
    expect(ENDLESS.verse.verified).toBe(true);
    for (const text of [ENDLESS.title, ENDLESS.intro, ENDLESS.caption]) {
      expect(text.hi).toMatch(/[ऀ-ॿ]/);
      expect(text.en).not.toBe("");
    }
  });

  it("cycles the sky once per ENDLESS_DAY passes", () => {
    expect(endlessSky(0)).toBe("morning");
    expect(endlessSky(ENDLESS_DAY - 1)).toBe("dawn");
    expect(endlessSky(ENDLESS_DAY)).toBe("morning");
    const seen = new Set<string>();
    for (let p = 0; p < ENDLESS_DAY; p++) seen.add(endlessSky(p));
    expect([...seen]).toEqual(["morning", "day", "dusk", "night", "dawn"]);
  });
});
