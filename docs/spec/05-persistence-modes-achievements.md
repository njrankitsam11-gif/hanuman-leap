# 05 — Save, stats, achievements, seeded modes, share, analytics

## Save (`src/game/storage.ts`)

Key `hanuman-leap:v1` in `localStorage` (the key name never changes; the record's `v` does).
Every access is guarded (SSR, Safari private mode, corrupt JSON → fresh save).

### Shapes

- `SaveV1 {v:1, best, muted, unlockedChapter}` — Phases 1–5 (8-chapter arc).
- `SaveV2` — adds `haptics, lang, easy, hinted, stats, endlessBest, daily{date,best}, achievements[]`
  (8-chapter indices).
- `SaveV3 = SaveV2 with v:3` — **10-chapter indices**. `music: boolean` (default `true`) was added
  2026-11-01 without a version bump: `backfill` fills it for older saves. `Save = SaveV3`, `DEFAULT_SAVE`.
- `Stats {runs, leaps, deaths, wins, flawless, chapters: {clears, deaths}[]}`.

### `migrate(raw, fresh)` accepts every shape ever shipped

- v3 → `backfill` (merge defaults, repair `achievements`/`daily`).
- v2 → `remapChaptersV2`: `V2_TO_V3_CHAPTER = [0,1,2,3,4,6,8,9]` applied to `unlockedChapter` and
  `stats.chapters` (v2 index 5 vatika→6, 6 dahan→8, 7 return→9).
- v1 → fresh + `best/muted`, remapped `unlockedChapter`, `hinted = best>0 || unlocked>0`.
- anything else → `fresh()` (which sets `lang = detectLang()`).

**Rule**: inserting/reordering chapters = new `SaveV{n}` + remap + `storage.test.ts` case. Never
delete an old shape's type guard.

### API

`loadSave()`, `saveGame(patch)` (shallow merge, never `v`/`stats`), `updateStats(fn)`,
`resetProgress()` (keeps preferences), `bumpChapter(stats, i, "clears"|"deaths")` (pure).
Native mirror: `setStorageMirror(fn)` receives every write's JSON; `restoreSave(json)` seeds an
empty localStorage at boot (Capacitor Preferences, see 06).

### Who writes what

| Field                      | Written by                                                            |
| -------------------------- | --------------------------------------------------------------------- |
| `best`                     | `recordBest` on hit/clear/won (story only)                            |
| `unlockedChapter`          | chapterClear (`chapter+1`), won (`LAST_CHAPTER`)                      |
| `muted/music/haptics/easy` | `changeSettings` / `toggleMute`                                       |
| `lang`                     | `LangProvider.setLang`                                                |
| `hinted`                   | `markHinted` (3 flaps or first pass/hit)                              |
| `stats`                    | `commitStats` on run start, hit, clear, won (leaps buffered in a ref) |
| `endlessBest/daily`        | hit in the respective mode                                            |
| `achievements`             | `award`                                                               |

## Accounts and cloud save (`src/lib/cloud-save.ts`, `src/lib/cloud-save-server.ts`)

Optional and web-only for now. localStorage stays the source the game reads; the cloud is a
copy. Signed out, offline, or with no `VITE_NEON_AUTH_URL`, nothing changes for the player.

- **Sign-in**: emailed code through Neon Managed Auth (`@neondatabase/auth`), loaded on demand.
  UI is `AccountPanel` in the settings sheet. Local progress stays on sign-out.
- **API**: `/api/save` GET/PUT/DELETE, `Authorization: Bearer <Neon JWT>`. A plain route rather
  than a server function so the native shell can call it cross-origin later. Every query uses
  the verified token's `sub`. Body cap 64 KB; `parseSave` rejects anything but a current save.
- **Storage**: `game_saves(user_id, save jsonb, updated_at)`, `db/schema.sql`, applied by hand.
- **Sync**: `onSaveWrite` schedules a PUT 5 s after a write; also on sign-in and `online`. The
  server merges and returns the result; the client adopts it and tells the shell.
- **`mergeSaves(local, remote)`**: progress takes the furthest value per field, achievements
  union, newer daily, preferences stay `local`'s. Stats use max, not sum, so two devices never
  inflate them (a little play on the behind device can go uncounted).
- **Invariant**: merging can only grow progress, so "Reset progress" must DELETE the cloud row
  first (`eraseCloudSave`) or the next sync restores everything. If that DELETE fails offline,
  progress does come back.
- **A second person signing in on the same device** merges this device's progress into their
  account. Accepted for now.

## Achievements (`src/game/achievements.ts`)

`ACHIEVEMENTS` (17, bilingual `title/desc`), `evaluate(ctx, unlockedSet) → AchievementId[]` — pure,
called by the shell's `award` on `pass | collect | smash | clear | won | hit`.

| id                | Rule                                                   |
| ----------------- | ------------------------------------------------------ |
| first_leap        | any pass                                               |
| mainaka_touch     | collect                                                |
| surasa_pass       | pass kind surasa                                       |
| flawless_chapter  | clear with `chapterDeaths === 0` (story only)          |
| lankini_gate      | pass kind lankini                                      |
| sajjan_home       | clear `vibhishana`                                     |
| ring_delivered    | clear `vatika`                                         |
| vriksha_10        | smash with `world.smashes ≥ 10`                        |
| lanka_burned      | clear `dahan`                                          |
| chudamani         | won                                                    |
| nirvighna         | won with `deaths === 0`                                |
| leaps_100 / _1000 | `totalLeaps` (stats + unflushed) thresholds, any event |
| punya_1000        | `world.punya ≥ 1000`, any event                        |
| endless_25 / _50  | pass in a non-story mode with `passes ≥ 25/50`         |
| daily_first       | hit in daily with `passes ≥ 1`                         |

Add an achievement: id union + entry + rule in `evaluate` + `achievements.test.ts`; the settings
sheet and toast pick it up automatically (`n of ACHIEVEMENTS.length`).

## Seeded randomness and the Daily (`src/game/rng.ts`)

`mulberry32(seed)`, `hashSeed(text)` (FNV-1a), `dailyKey(now)` = `YYYY-MM-DD` in **IST** (UTC+5:30),
`dailySeed(key) = hashSeed("hanuman-leap:daily:" + key)`. Story uses `Math.random`; Endless uses
`Math.random`; Daily injects `mulberry32(dailySeed())` into `createWorld` so everyone gets the same
column sequence for the day (given the same orientation — spawn geometry depends on `vp.h`, and
`speedMul` differs, so portrait and landscape dailies are not identical; acceptable for a local best).

Ghost replay / leaderboard verification (roadmap 8.7 / Phase 9) would log flap step indices and
re-run `step` with the same seed and viewport — not built yet.

## Share (`src/game/share.ts`)

`ShareData {mode, lang, punya, passes, chapter, chapterTitle, chapterCount, won, verseLine, date, hero}`.
`shareText` (per mode/language, `en-IN` digit grouping), `drawShareCard(ctx, d)` (1080², pure
canvas: gradient by mode, hero sprite, headline, big number, subline, verse line, site URL),
`shareResult(d)`: native `platform().share` → Web Share with a PNG `File` if `canShare` → Web
Share text+URL → clipboard (`"copied"`) → `"failed"`. `AbortError` (user dismissed) returns
`"failed"` without falling back. `SITE_URL` is the Vercel domain.

## Analytics (`src/lib/analytics.ts`)

`initAnalytics()` (root route effect; honours DNT) and `track(event)` typed by `AnalyticsEvent`:
`run_start{chapter,fresh,easy,lang,mode}`, `achievement{id}`, `chapter_start{chapter}`,
`chapter_clear{chapter,deaths,punya}`, `death{chapter,kind,passes}`, `won{deaths,punya,easy}`,
`settings{key,value}`, `install`. Provider is Vercel Web Analytics; custom events only display on
the Pro plan (page views on Hobby). No PII. Swapping providers is a one-file change. The native
build calls `track` too but never `initAnalytics`, so it is a no-op there.

## Tests

`storage.test.ts` (migrations v1/v2/v3, backfill, `bumpChapter`, mirror/restore with a fake
localStorage), `achievements.test.ts`, `rng.test.ts` (determinism, uniformity, IST key, seed
stability), `share.test.ts` (card draws for every mode × language with the render stub; text per
mode). Analytics has no tests (thin wrapper).
