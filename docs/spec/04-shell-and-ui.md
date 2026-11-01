# 04 — React shell, screens, HUD, i18n

## `src/components/HanumanLeap.tsx` (≈860 lines) — the only stateful game component

Props: `{ initialChapter?: number }` (from `?chapter=n`; native ignores it).

### Refs vs state

Per-frame mutable data lives in refs (`worldRef, vpRef, fxRef, pendingFlapRef, stateRef,
pausedRef, settingsOpenRef, modeRef, statsRef, bestRef, mutedRef, easyRef, langRef, hintedRef,
unflushedLeapsRef, achievedRef, deathsAtChapterStartRef, overAtRef, lastScaleRef, readyRef`).
React state changes only on discrete events (HUD numbers, `GameState`, overlays, settings, stats).
Mirror refs are re-assigned from state on every render (`stateRef.current = state` …).

### `GameState` machine

`"ready" → "intro" → "playing" → ("chapterClear" → "intro" …) | "over" | "won"`

| Transition             | Trigger                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| ready → intro          | `goToChapter(i, fresh)` (Start button, chapter card, tap on ready) or `startMode(endless\|daily)` |
| intro → playing        | `beginPlay()` on the first tap/Space (sets `running`, queues a flap)                              |
| playing → chapterClear | `chapterClear` event                                                                              |
| playing → over         | `hit` event                                                                                       |
| playing → won          | `won` event                                                                                       |
| chapterClear → intro   | Continue → `goToChapter(chapter+1, false)` (keeps punya/deaths)                                   |
| over → intro           | `retry()` after `DEATH_COOLDOWN_MS` (story: `retryChapter`; modes: `startMode` again)             |
| any → ready            | `toChapters()` (fresh world, story mode)                                                          |
| paused (orthogonal)    | P/Esc, HUD button, tab hidden / window blur, Android back                                         |

`requestFlap()` is the single input funnel: unlocks audio, ignores input when paused or the
settings sheet is open, and acts per state (playing → queue flap + fx + sfx + hint counter; intro →
begin; ready → chapter 0; over → retry after cooldown; clear/won → buttons only). Flaps are ignored
during a finale (`world.phase !== "run"`).

Input sources: `onPointerDown` on the game box (`preventDefault`), keyboard `Space/ArrowUp/Enter`
(flap), `KeyP/Escape` (pause), `KeyM` (mute) — ignoring repeats and focused controls. Overlay
controls call `stopPointer` so a button press never doubles as a flap.

### Frame loop

`requestAnimationFrame` → clamp wall dt to `MAX_DT`, accumulate, run `step` in `STEP` slices up to
`MAX_SUBSTEPS` (drop the remainder if capped), `dispatch(events)`, Surasa shrink cue, `updateFx`,
`render`, and on the first frame `platform().ready()` (hides the native splash). Paused frames
still render (with `dt = 0` for fx).

### `dispatch(events)` — side effects per event

| Event        | Effects                                                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pass         | HUD, `unflushedLeaps++`, mark hinted, sfx, `award(pass)`                                                                                                                                      |
| collect      | HUD, sparkle burst, sfx, haptic, `award(collect)`                                                                                                                                             |
| smash        | HUD, leaf+spark burst at event x/y, sfx, haptic, `award(smash)`                                                                                                                               |
| hit          | `hitFx`, cooldown start, story: `recordBest`, stats deaths + chapter deaths; endless/daily: stats deaths, mode best (+`modeNewBest`), `track(death)`, `award(hit)`, state `over`, sfx, haptic |
| chapterClear | HUD, `recordBest`, unlock next chapter (`saveGame`), stats chapter clears, `award(clear)`, `track`, state `chapterClear`, sfx, haptic                                                         |
| won          | HUD, `recordBest`, unlock last, stats wins/flawless/clears, `track(won)`, `award(won)`, state `won`, sfx, haptic                                                                              |
| finale       | nothing (renderer reacts to `world.phase`)                                                                                                                                                    |

`commitStats(fn)` folds `unflushedLeaps` into `stats.leaps` and writes via `updateStats`.
`award(event)` runs `achievements.evaluate` with `{world, chapter, mode, chapterDeaths, totalLeaps}`,
persists new ids, queues toasts, tracks.

### Effects (in order in the file)

reduced-motion → fire ambience → **load save after hydration** (sets every ref/state, then jumps to
`initialChapter`) → viewport sizing (ResizeObserver + DPR) → main loop + asset load → keyboard →
Android back button (settings → pause → chapters → exit) → auto-pause on hidden/blur → death cooldown.

### Modes

`mode: "story" | "endless" | "daily"`. `startMode` creates a world with `Math.random` (endless) or
`mulberry32(dailySeed(dailyKey()))` (daily) at `ENDLESS_INDEX`. Best per mode lives in the save
(`endlessBest`, `daily{date,best}`); `modes.unlocked = unlocked ≥ MODES_UNLOCK_AT (4)`.

### Share

`share()` builds `ShareData` from the world and current state (chapter number/title, verse first
line, IST date) and calls `shareResult` (05).

## Screens (`src/components/game/`)

| Component          | Shown when                    | Notes                                                                                                                       |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `StartScreen`      | ready                         | title, Begin, `ChapterSelect` (4-col grid, locked > `unlocked`), `ModeCards`, settings gear                                 |
| `ChapterIntro`     | intro                         | chapter N of 10 (or mode eyebrow), title, intro prose, optional `introVerse` (compact), tap hint                            |
| `FirstRunHint`     | playing, `!hinted`, < 3 flaps | "Tap to rise" pulse; `hinted` persists after 3 flaps or the first pass                                                      |
| `ChapterClear`     | chapterClear                  | verse (`VerseBlock`), punya, Continue                                                                                       |
| `GameOver`         | over, story                   | punya/chapter, Retry (enabled after cooldown), Chapters, `ShareButton`                                                      |
| `EndlessOver`      | over, endless/daily           | leaps/punya, best / best today, New best!, Retry, Chapters, Share                                                           |
| `WinScreen`        | won                           | Chudamani eyebrow, final verse, punya/best, flawless badge, Play again, Chapters, Share                                     |
| `PauseMenu`        | playing && paused             | Resume, Restart chapter, Chapters, Settings                                                                                 |
| `SettingsSheet`    | `settingsOpen` (Dialog)       | Sound, Vibration (if supported), Language, Sahaj, journey stats, per-chapter table, achievements `n of 17`, Reset (confirm) |
| `Hud`              | not ready/won                 | punya, progress `passes/totalSteps` (or Leaps in endless), best, mute, pause, chapter title (hi)                            |
| `AchievementToast` | always mounted                | plays the `toasts` queue one at a time, 3.2 s each                                                                          |
| `Overlay`          | wrapper                       | full-cover blurred panel; `stopPointer` helper                                                                              |
| `VerseBlock`       | in screens                    | Devanagari + (en: transliteration) + meaning in UI language + ref badge                                                     |

Caption pill (chapter `caption`) shows under the canvas while playing and unpaused.

## i18n (`src/i18n/`)

- `Lang = "hi" | "en"` persisted in the save; `detectLang()` picks Hindi when `navigator.languages`
  starts with `hi`. Server renders English; `LangProvider` applies the saved language after hydration.
- `useT()` → `t(key, params)`; `STRINGS[lang][key]` with `{name}` placeholders (`format` leaves
  unknown names visible). `i18n.test.ts` enforces that Hindi covers every key in Devanagari with the
  same placeholders.
- `pick(lang, {hi,en})` for chapter prose and achievement text. Verse Devanagari is always shown;
  Hindi readers get `meaningHi` and no transliteration.
- Digits stay Western in both languages. `[&:lang(hi)]:tracking-normal` removes letter-spacing on
  Devanagari; `font-devanagari` utility applies Noto Sans Devanagari.

## Layout

Web route `src/routes/index.tsx` first renders `Landing` (full-screen artwork + Play; skipped when `?chapter=n` is set), then the game: `h-dvh` column, safe-area padding; desktop landscape adds a
header/footer and caps the box at 1000 px. Native `NativeApp` is the same shell without the header.
The game box is sized from `computeViewport` (`box` state); before measurement it falls back to
`aspect-[900/560]`.

## UI primitives

`src/components/ui/{badge,button,dialog,progress,switch}.tsx` — shadcn/radix; theme tokens in
`src/styles.css` (`@theme inline`, oklch colours, `--primary` saffron `#e07c28`-ish). Unused
primitives were pruned in Phase 0; add new ones only when needed.
