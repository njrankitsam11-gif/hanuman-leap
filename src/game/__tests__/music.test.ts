import { describe, expect, it } from "vitest";
import { CHAPTERS, ENDLESS } from "../chapters";
import { LOOP_STEPS, phrase, TANPURA, TUNES } from "../music";

const ids = [...CHAPTERS.map((c) => c.id), ENDLESS.id];

describe("music tunes", () => {
  it("gives every chapter (and Endless) a tune", () => {
    for (const id of ids) expect(TUNES[id]).toBeDefined();
  });

  it("uses five-note scales starting on Sa", () => {
    for (const id of ids) {
      const { scale } = TUNES[id];
      expect(scale).toHaveLength(5);
      expect(scale[0]).toBe(0);
    }
  });

  it("keeps the tanpura on Sa and Pa", () => {
    for (const s of TANPURA) expect([0, 7]).toContain(((s % 12) + 12) % 12);
  });
});

describe("phrase", () => {
  it("is deterministic per chapter", () => {
    for (const id of ids) expect(phrase(id)).toEqual(phrase(id));
    expect(phrase("prelude")).not.toEqual(phrase("dahan"));
  });

  it("stays in the chapter's scale and a singable range", () => {
    for (const id of ids) {
      const { scale } = TUNES[id];
      for (const n of phrase(id)) {
        expect(scale).toContain(((n.semis % 12) + 12) % 12);
        expect(n.semis).toBeGreaterThanOrEqual(-12);
        expect(n.semis).toBeLessThanOrEqual(19);
      }
    }
  });

  it("fits in the first half of the loop and lands on Sa", () => {
    for (const id of ids) {
      const notes = phrase(id);
      expect(notes.length).toBeGreaterThan(8);
      for (const n of notes) {
        expect(n.step).toBeGreaterThanOrEqual(0);
        expect(n.step + n.len).toBeLessThanOrEqual(LOOP_STEPS / 2);
      }
      expect(notes.at(-1)!.semis).toBe(0);
    }
  });
});
