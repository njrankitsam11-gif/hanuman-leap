import { describe, expect, it } from "vitest";
import { dailyKey, dailySeed, hashSeed, mulberry32 } from "../rng";

describe("mulberry32", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seq = Array.from({ length: 1000 }, () => a());
    expect(Array.from({ length: 1000 }, () => b())).toEqual(seq);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(43)()).not.toBe(seq[0]);
  });

  it("is roughly uniform", () => {
    const r = mulberry32(7);
    const bins = new Array(10).fill(0);
    for (let i = 0; i < 20_000; i++) bins[Math.floor(r() * 10)]++;
    for (const n of bins) expect(Math.abs(n - 2000)).toBeLessThan(200);
  });
});

describe("daily", () => {
  it("keys the day in IST, so 20:00 UTC is already tomorrow in Bharat", () => {
    expect(dailyKey(new Date("2026-09-15T18:29:00Z"))).toBe("2026-09-15");
    expect(dailyKey(new Date("2026-09-15T18:30:00Z"))).toBe("2026-09-16");
  });

  it("hashes to a stable 32-bit seed that differs by day", () => {
    expect(hashSeed("a")).toBe(hashSeed("a"));
    expect(dailySeed("2026-09-15")).not.toBe(dailySeed("2026-09-16"));
    expect(Number.isInteger(dailySeed("2026-09-15"))).toBe(true);
  });
});
