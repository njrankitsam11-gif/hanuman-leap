# 02 — Chapters, obstacle kinds, behaviours, verses

## Files

- `src/game/chapters/types.ts` — `ObstacleKindId`, `SkyId`, `Verse`, `ChapterGoal`, `ChapterId`,
  `Localized {hi,en}`, `Chapter`.
- `src/game/chapters/index.ts` — `CHAPTERS` (the arc, `as const satisfies`), `ENDLESS`,
  `ENDLESS_INDEX = CHAPTER_COUNT`, `chapterAt(i)`, `chapterIndex(id)`, `targetPasses`,
  `totalSteps`, `finaleDuration`, `isEndless`.
- `src/game/chapters/verses.ts` — `VERSES` record + `VerseKey`.
- `src/game/kinds.ts` — visual/scoring facts per kind.
- `src/game/obstacles/registry.ts` — `BEHAVIOURS` hooks and their constants.
- `src/game/mechanics.ts` — `MECHANICS` chapter hooks.

## The arc (`CHAPTERS`, index = save's `unlockedChapter` / `stats.chapters[i]`)

| #   | id           | Title (hi / en)                          | Goal                      | Roster              | Sky     | ×   | Mechanic                                                              | Verse (clear · intro)   |
| --- | ------------ | ---------------------------------------- | ------------------------- | ------------------- | ------- | --- | --------------------------------------------------------------------- | ----------------------- |
| 0   | `prelude`    | जामवंत का उत्साह / Jambavan's Call       | passes 5                  | cloud               | morning | 1   | plain columns                                                         | launch                  |
| 1   | `mainaka`    | मैनाक का सत्कार / Mainaka's Offering     | passes 6                  | wave 2, mainaka 1   | day     | 1   | Mainaka rises, never lethal, touch peak = collect                     | mainaka                 |
| 2   | `surasa`     | सुरसा की परीक्षा / Surasa's Test         | passes 6                  | surasa              | day     | 1.2 | mouth closes on approach; hero swells then shrinks (hitbox ×0.5)      | surasa                  |
| 3   | `simhika`    | सिंहिका की छाया / Simhika's Shadow       | passes 7                  | simhika             | dusk    | 1.4 | shadow band → gravity ×1.6                                            | simhika                 |
| 4   | `lankini`    | लंकिनी का द्वार / Lankini's Gate         | boss after 5              | rakshasa            | night   | 1.6 | swaying sentries, then one wide swaying boss                          | lankini                 |
| 5   | `vibhishana` | विभीषण मिलन / Vibhishana's House         | passes 7                  | house 3, rakshasa 1 | night   | 1.7 | houses with painted decoy doors; only the marked gap is real          | vibhishana · harimandir |
| 6   | `vatika`     | अशोक वाटिका / Ashok Vatika               | finale 8, scene `sita`    | tree                | night   | 1.8 | trees; ring-drop scene                                                | ring                    |
| 7   | `vidhvans`   | वाटिका विध्वंस / The Garden Torn         | finale 8, scene `capture` | vriksha 3, astra 2  | morning | 2   | smash trees for punya; arrows have a narrower gap; Brahmastra capture | brahmastra · vidhvans   |
| 8   | `dahan`      | लंका दहन / Lanka Ablaze                  | passes 10                 | tower               | fire    | 2.5 | `tailFire`, speed ramps +25 % with progress, fire ambience            | dahan                   |
| 9   | `return`     | प्रभु मिलन / Return to Ram               | finale 6, scene `ram`     | cloud               | dawn    | 2   | `dir = −1` (world mirrored); Ram/Lakshman shore scene                 | ram · chudamani         |
| 10  | `endless`    | अखंड उड़ान / Endless Flight (not in arc) | endless                   | every non-boss kind | cycles  | 1.5 | speed ramps +60 % over 60 passes; sky cycles every 40 passes          | (mainaka, unused)       |

`MODES_UNLOCK_AT = 4` (in `HanumanLeap.tsx`): Endless and Daily unlock when chapter 4 is reachable.

Difficulty ramps roughly `speed 0.34 → 0.56`, `spawn 1.9 → 1.2 s`, `gap 0.42 → 0.30` across the
arc; `gapMin = 0.268` everywhere (endless 0.25). Changing chapter order or inserting a chapter
**requires a save migration** (05) because indices are persisted.

## Goals (`ChapterGoal`)

- `passes {count}` — clear N roster columns → 1 s glide → `chapterClear`.
- `boss {after}` — N sentries, then `"lankini"` spawns once the screen is clear; passing it ends the chapter.
- `finale {passes, scene}` — after N passes spawning stops; a 2.4 s scripted scene (`render/scene.ts`)
  plays: `sita` (ring flies to Sita), `ram` (shore with Ram & Lakshman), `capture` (arrow, then coils).
- `endless` — `targetPasses = Infinity`; only a hit ends it.

## Obstacle kinds (`KINDS`) and behaviours (`BEHAVIOURS`)

| Kind     | style    | sway ·H | bonus | Behaviour hooks                                                                                                                                                                             |
| -------- | -------- | ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cloud    | column   |         |       | none (plain lethal column)                                                                                                                                                                  |
| wave     | column   |         |       | none                                                                                                                                                                                        |
| mainaka  | column   |         |       | `init`: bottom-only (`gapY=0`), peak target `0.45–0.65·H`; `update`: eases up over `MAINAKA_RISE_S=1` once on screen; `collide`: circle test at peak (`MAINAKA_PEAK_R=30`) → `collect` once |
| surasa   | column   |         |       | `update`: gap = base × lerp(1.5 → 0.55) over `SURASA_APPROACH=0.45·W` (smoothstep); `affectHero`: swell ×1.25 approaching, shrink ×0.5 within ±40 px; `passBonus` 10                        |
| simhika  | column   |         |       | `affectHero`: within `SIMHIKA_BAND=60` px → `gravityMul=1.6`, sets `o.shadowing`; `passBonus` 15                                                                                            |
| rakshasa | rakshasa | 0.152   | 15    | `update`: sway (amplitude clamped to stay on screen)                                                                                                                                        |
| lankini  | rakshasa | 0.196   | 100   | boss; `init`: width ×1.6, fixed gap `0.3·H×gapMul`, centred; `update`: sway                                                                                                                 |
| house    | column   | 0.1     | 10    | `init`: 1–2 `decoys` (·H) painted on solid wall above/below the gap, `HOUSE_DECOY_MARGIN=0.06`; `update`: sway                                                                              |
| tree     | column   |         |       | none                                                                                                                                                                                        |
| vriksha  | column   |         |       | `collide`: first overlap → `smashed`, returns `smash` (never lethal after)                                                                                                                  |
| astra    | column   |         | 20    | `init`: gap × `ASTRA_GAP_MUL=0.85`, re-centred                                                                                                                                              |
| tower    | column   |         | 15    | none                                                                                                                                                                                        |

Hook contract (`ObstacleBehaviour`): `init(o, world, vp, ch)`, `update(o, world, vp, dt)`,
`affectHero(o, world, vp)` (only via `world.heroScale`/`gravityMul`), `collide(o, hero, vp) →
CollideResult`, `passBonus(o, world)`. A kind without an entry is a plain lethal column.

## Chapter mechanics (`MECHANICS`)

- `dahan`: `onEnter` → `tailFire = true`; `onUpdate` → `speedRamp = 1 + 0.25 × progress`.
- `return`: `onEnter` → `dir = −1`.
- `endless`: `onUpdate` → `speedRamp = 1 + 0.6 × min(1, passes/60)`.
- `resetChapterEffects` restores `tailFire=false, dir=1, speedRamp=1, heroScale=1, gravityMul=1`
  before every chapter's `onEnter`.

## Verses (`verses.ts`) — policy

`Verse = {ref, devanagari, transliteration, meaning, meaningHi, verified}`. Lines are `\n`-separated;
every Devanagari line ends in `।` or `॥` (test). Refs use the Gita Press convention "N.M" = M-th
chaupai after doha N−1. Keys in use: `launch, mainaka, surasa, simhika, lankini, harimandir,
vibhishana, ring, vidhvans, brahmastra, dahan, chudamani, ram` — all `verified: true`, cross-checked
2026-09-15 against drikpanchang.com and shrirammitramandal.com (Gita Press-derived; where they
differ on a word, Gita Press reading wins).

**Adding a verse**: fetch both sources with `curl` and grep for the exact line (WebFetch's
summariser will not return verbatim text); set `verified: true` only after both agree; add
`meaning` (en) and `meaningHi` (भावार्थ); `chapters.test.ts` fails on `verified: false`.

## Adding a chapter — checklist

1. `ChapterId` union + entry in `CHAPTERS` at the right index (bilingual `title/intro/caption`).
2. Verified verse(s) in `verses.ts`; optional `introVerse`.
3. New kinds: `ObstacleKindId`, `KINDS`, `BEHAVIOURS`, drawer in `render/obstacles.ts`,
   maybe `drawObstacleFx`; add to `ENDLESS.roster` if not a boss.
4. New sky → `SkyId` + `SKY_TINT` in `render/sky.ts`.
5. New scene → `ChapterGoal.finale.scene` union + `render/scene.ts` (`drawScene`/`drawSceneFront`).
6. **Save migration** (bump `SaveV*`, remap `unlockedChapter` and `stats.chapters`).
7. Achievements that reference the chapter (`achievements.ts`), analytics untouched (indices only).
8. Tests: `chapters.test.ts` chapter count/order, `mechanics.test.ts` for behaviour, `render.test.ts`
   already iterates every chapter/kind; `storage.test.ts` for the migration.
9. README chapter table, `docs/ROADMAP.md` §5, this spec's table, `STATUS.md`.
