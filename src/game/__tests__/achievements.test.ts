import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluate, type AchievementCtx } from "../achievements";
import { chapterAt, ENDLESS_INDEX } from "../chapters";
import { CANON_LANDSCAPE } from "../constants";
import { createWorld, startChapter } from "../engine";
import { computeViewport } from "../viewport";

const vp = computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1);

function ctx(
  over: Partial<Omit<AchievementCtx, "chapter">> & { chapter?: number },
): AchievementCtx {
  const world = createWorld(vp, () => 0.5);
  startChapter(world, over.chapter ?? 0, vp);
  const { chapter: idx, ...rest } = over;
  return {
    event: { type: "pass", kind: "cloud" },
    world,
    chapter: chapterAt(idx ?? 0),
    mode: "story",
    chapterDeaths: 0,
    totalLeaps: 1,
    ...rest,
  };
}

describe("achievements", () => {
  it("are bilingual and uniquely identified", () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.hi).toMatch(/[ऀ-ॿ]/);
      expect(a.desc.hi).toMatch(/[ऀ-ॿ]/);
      expect(a.title.en).not.toBe("");
      expect(a.desc.en).not.toBe("");
    }
  });

  it("the first pass earns first_leap once", () => {
    const c = ctx({});
    expect(evaluate(c, new Set())).toEqual(["first_leap"]);
    expect(evaluate(c, new Set(["first_leap"]))).toEqual([]);
  });

  it("kind- and chapter-specific ones", () => {
    expect(
      evaluate(ctx({ event: { type: "pass", kind: "surasa" } }), new Set(["first_leap"])),
    ).toEqual(["surasa_pass"]);
    expect(evaluate(ctx({ event: { type: "collect" } }), new Set())).toEqual(["mainaka_touch"]);
    expect(evaluate(ctx({ event: { type: "clear" }, chapter: 5 }), new Set())).toEqual([
      "flawless_chapter",
      "ring_delivered",
    ]);
    expect(
      evaluate(ctx({ event: { type: "clear" }, chapter: 6, chapterDeaths: 2 }), new Set()),
    ).toEqual(["lanka_burned"]);
  });

  it("winning: chudamani always, nirvighna only without deaths", () => {
    const c = ctx({ event: { type: "won" } });
    expect(evaluate(c, new Set())).toEqual(["chudamani", "nirvighna"]);
    c.world.deaths = 1;
    expect(evaluate(c, new Set())).toEqual(["chudamani"]);
  });

  it("totals and mode milestones", () => {
    const c = ctx({ chapter: ENDLESS_INDEX, mode: "endless", totalLeaps: 1000 });
    c.world.passes = 50;
    c.world.punya = 1200;
    expect(evaluate(c, new Set(["first_leap"]))).toEqual([
      "endless_25",
      "endless_50",
      "leaps_100",
      "leaps_1000",
      "punya_1000",
    ]);
    const d = ctx({ chapter: ENDLESS_INDEX, mode: "daily", event: { type: "hit" } });
    expect(evaluate(d, new Set())).toEqual([]); // no passes yet: not a finished daily
    d.world.passes = 3;
    expect(evaluate(d, new Set())).toEqual(["daily_first"]);
    // a flawless story chapter is not awarded in endless
    expect(
      evaluate(
        ctx({ chapter: ENDLESS_INDEX, mode: "endless", event: { type: "clear" } }),
        new Set(),
      ),
    ).toEqual([]);
  });
});
