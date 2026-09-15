import { afterEach, describe, expect, it } from "vitest";
import {
  bumpChapter,
  DEFAULT_SAVE,
  DEFAULT_STATS,
  loadSave,
  migrate,
  restoreSave,
  saveGame,
  setStorageMirror,
  type SaveV1,
} from "../storage";

describe("migrate", () => {
  it("returns the default for garbage", () => {
    for (const raw of [null, undefined, 3, "x", {}, { v: 9 }, { v: 2, best: "10" }]) {
      expect(migrate(raw)).toEqual(DEFAULT_SAVE);
    }
  });

  it("uses the fresh-save factory so a new player gets the detected language", () => {
    expect(migrate(null, () => ({ ...DEFAULT_SAVE, lang: "hi" })).lang).toBe("hi");
  });

  it("carries v1 progress and preferences forward", () => {
    const v1: SaveV1 = { v: 1, best: 420, muted: true, unlockedChapter: 3 };
    const s = migrate(v1);
    expect(s.v).toBe(3);
    expect(s.best).toBe(420);
    expect(s.muted).toBe(true);
    expect(s.unlockedChapter).toBe(3);
    expect(s.hinted).toBe(true); // a returning player skips the tap hint
    expect(s.stats).toEqual(DEFAULT_STATS);
  });

  it("keeps a brand-new v1 player eligible for the hint", () => {
    expect(migrate({ v: 1, best: 0, muted: false, unlockedChapter: 0 }).hinted).toBe(false);
  });

  it("remaps v2 chapter indices onto the ten-chapter arc", () => {
    // v2: 0 prelude … 4 lankini, 5 vatika, 6 dahan, 7 return
    const v2 = {
      ...DEFAULT_SAVE,
      v: 2,
      unlockedChapter: 6,
      stats: {
        ...DEFAULT_STATS,
        chapters: [
          { clears: 1, deaths: 0 },
          { clears: 0, deaths: 0 },
          { clears: 0, deaths: 0 },
          { clears: 0, deaths: 0 },
          { clears: 0, deaths: 0 },
          { clears: 2, deaths: 3 },
          { clears: 0, deaths: 5 },
        ],
      },
    };
    const s = migrate(v2);
    expect(s.v).toBe(3);
    expect(s.unlockedChapter).toBe(8); // dahan moved from 6 to 8
    expect(s.stats.chapters[6]).toEqual({ clears: 2, deaths: 3 }); // vatika 5 → 6
    expect(s.stats.chapters[8]).toEqual({ clears: 0, deaths: 5 }); // dahan 6 → 8
    expect(s.stats.chapters[5]).toEqual({ clears: 0, deaths: 0 }); // vibhishana: fresh
    expect(migrate({ ...DEFAULT_SAVE, v: 2, unlockedChapter: 7 }).unlockedChapter).toBe(9);
    expect(migrate({ ...DEFAULT_SAVE, v: 2, unlockedChapter: 4 }).unlockedChapter).toBe(4);
    expect(migrate({ v: 1, best: 1, muted: false, unlockedChapter: 5 }).unlockedChapter).toBe(6);
  });

  it("passes a valid v3 through and back-fills fields added since", () => {
    const early = { ...DEFAULT_SAVE, best: 7, stats: { runs: 2 } } as Record<string, unknown>;
    delete early["endlessBest"];
    delete early["daily"];
    delete early["achievements"];
    const s = migrate(early);
    expect(s.best).toBe(7);
    expect(s.stats).toEqual({ ...DEFAULT_STATS, runs: 2 });
    expect(s.endlessBest).toBe(0);
    expect(s.daily).toEqual({ date: "", best: 0 });
    expect(s.achievements).toEqual([]);
  });
});

describe("bumpChapter", () => {
  it("grows the per-chapter array as needed without mutating the input", () => {
    const a = bumpChapter(DEFAULT_STATS, 2, "deaths");
    expect(a.chapters).toEqual([
      { clears: 0, deaths: 0 },
      { clears: 0, deaths: 0 },
      { clears: 0, deaths: 1 },
    ]);
    expect(DEFAULT_STATS.chapters).toEqual([]);
    const b = bumpChapter(a, 2, "clears");
    expect(b.chapters[2]).toEqual({ clears: 1, deaths: 1 });
  });
});

describe("native storage mirror", () => {
  function fakeWindow() {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    (globalThis as { window?: unknown }).window = { localStorage };
    return store;
  }
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    setStorageMirror(null);
  });

  it("every write is mirrored; restore only fills an empty localStorage", () => {
    const store = fakeWindow();
    const mirrored: string[] = [];
    setStorageMirror((json) => mirrored.push(json));
    saveGame({ best: 12 });
    expect(mirrored).toHaveLength(1);
    expect(JSON.parse(mirrored[0]!).best).toBe(12);
    // a backup must not clobber live progress …
    restoreSave(JSON.stringify({ ...DEFAULT_SAVE, best: 99 }));
    expect(loadSave().best).toBe(12);
    // … but does seed a wiped store
    store.clear();
    restoreSave(JSON.stringify({ ...DEFAULT_SAVE, best: 99 }));
    expect(loadSave().best).toBe(99);
  });
});
