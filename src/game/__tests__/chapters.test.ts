import { describe, expect, it } from "vitest";
import { CHAPTERS, finaleDuration, targetPasses, VERSES, type Chapter } from "../chapters";
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
