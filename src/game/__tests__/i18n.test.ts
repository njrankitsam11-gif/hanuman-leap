import { describe, expect, it } from "vitest";
import { format, STRINGS, translate, type StringKey } from "@/i18n/strings";

describe("strings", () => {
  const keys = Object.keys(STRINGS.en) as StringKey[];

  it("Hindi covers every key with Devanagari text", () => {
    for (const k of keys) {
      expect(STRINGS.hi[k], k).toBeDefined();
      expect(STRINGS.hi[k], k).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("both languages use the same placeholders", () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of keys) expect(names(STRINGS.hi[k]), k).toEqual(names(STRINGS.en[k]));
  });

  it("format fills placeholders and leaves unknown ones visible", () => {
    expect(format("{a}-{b}", { a: 1, b: "x" })).toBe("1-x");
    expect(format("{a}-{zz}", { a: 1 })).toBe("1-{zz}");
    expect(translate("hi", "intro.chapterOf", { n: 2, total: 8 })).toBe("अध्याय 2 / 8");
  });
});
