# 07 — Testing and verification

## Baseline

`bun run test` → **16 files, 130 tests**, ~0.3 s, node environment, no DOM. `bunx tsc --noEmit`
clean. `bun run lint` 0 errors (7 react-refresh warnings from files that export helpers next to
components — acceptable).

## Suites (`src/game/__tests__/`, `src/lib/__tests__/`)

| File                   | Pins                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.test.ts`       | world lifecycle, gravity/flap magnitudes, orientation-invariant apex, spawning limits, boss sequencing, pass/punya, clear + win bonuses, collisions (walls, gap, killer name), `resizeWorld`, sahaj mode, endless ramp, seeded reproducibility |
| `mechanics.test.ts`    | Mainaka (never lethal, single collect, rise), Surasa (monotone mouth, swell/shrink), Simhika pull, Lankini sequence, Dahan tail+ramp, mirrored return, effect reset, house decoys, vriksha smash, astra gap, capture finale → Dahan            |
| `chapters.test.ts`     | ten chapters in order ending on `return`, goal/roster/difficulty sanity, bilingual prose (Devanagari check), one boss chapter, verses complete + dandas + **`verified: true`**, endless chapter shape, sky cycle                               |
| `render.test.ts`       | every kind × chapter × viewport draws with finite args; both scene timelines; mirrored + tail fire; missing assets; long run stays finite                                                                                                      |
| `fx.test.ts`           | particle cap, decay to zero, reduced motion, emitters                                                                                                                                                                                          |
| `viewport.test.ts`     | canonical sizes, portrait, clamps/letterbox, hysteresis, unmeasured fallback                                                                                                                                                                   |
| `storage.test.ts`      | migrate garbage/v1/v2/v3, `music` backfill, fresh factory, chapter remap, backfill, `bumpChapter` purity, native mirror/restore                                                                                                                |
| `achievements.test.ts` | bilingual/unique ids, first_leap once, kind/chapter rules, win rules, totals and mode milestones                                                                                                                                               |
| `music.test.ts`        | every chapter + Endless has a tune, five-note scales on Sa, tanpura on Sa/Pa, phrase deterministic, in scale and range, fits the first half-loop, ends on Sa                                                                                   |
| `playthrough.test.ts`  | a look-ahead bot, tapping at human speed, finishes every chapter in both orientations (seeded)                                                                                                                                                 |
| `rng.test.ts`          | mulberry32 determinism/range/uniformity, IST day key, seed stability                                                                                                                                                                           |
| `share.test.ts`        | card draws for every mode × language, text per mode with Indian grouping                                                                                                                                                                       |
| `i18n.test.ts`         | Hindi covers every key in Devanagari, identical placeholders, `format`                                                                                                                                                                         |
| `sw.test.ts`           | precache from HTML+CSS, cache-first assets, network-first navigation with offline fallback, ignores cross-origin/non-GET, purges old caches                                                                                                    |

## Harness patterns (copy these, don't invent new ones)

- **Viewport**: `computeViewport(CANON_LANDSCAPE.w, CANON_LANDSCAPE.h, 1)`; portrait via `CANON_PORTRAIT`.
- **Deterministic rng**: `const fixed = (v) => () => v;` or `mulberry32(seed)`.
- **Running world**: `createWorld(vp, rng); startChapter(w, i, vp); w.running = true`.
- **Step safely**: loop `step(w, {flap:false}, 1/120, vp)` re-pinning `w.y = vp.h/2; w.vy = 0`
  each step so walls never kill the hero while testing spawns/passes.
- **Force a pass**: `spawnObstacle(...)`, set `o.x = vp.heroX - OB_W + 1`, centre the gap on `w.y`,
  push, step once.
- **Canvas stub** (`render.test.ts` `stubContext`): a Proxy whose every method is a recording
  no-op that throws on non-finite numbers; gradients are inert. Reuse it (share.test.ts does).
- **Images**: `{complete, naturalWidth, naturalHeight}` casts; test both ready and not.
- **localStorage**: a `Map`-backed fake assigned to `globalThis.window.localStorage` in
  `beforeEach` (storage.test.ts).
- **Service worker**: read `public/sw.js`, run in `node:vm` with fake `self/caches/fetch`, then
  invoke the captured `install/activate/fetch` handlers.

## Definition of done for a feature

1. Unit tests for any new pure module or rule (engine/mechanics/chapters/storage/achievements).
2. Render smoke coverage for any new kind/scene (usually automatic — `render.test.ts` iterates
   `CHAPTERS`/`KINDS`; add a case only for new scene timelines or flags).
3. `bun run test`, `bunx tsc --noEmit`, `bun run lint` all green.
4. If the change is visible: a production-ish check (`bun run build` at least; for overlays and
   static frames, screenshot via the Browser pane at `http://localhost:8091`).
5. Specs updated (see `CLAUDE.md` rule; `STATUS.md` test count bumped).

## What cannot be tested here (and what to do instead)

- The live rAF loop, Web Audio, haptics, Web Share, and the service worker in a real browser: the
  desktop-app pane throttles rAF when hidden and blocks SW registration. Rely on the pure-module
  tests, and for visuals render static frames (a throwaway route or the `?chapter=n` intro overlay).
- iOS/Android builds: no toolchains on this machine. Keep `build:native` green
  (`bun run build:native`) so the shell at least bundles.
