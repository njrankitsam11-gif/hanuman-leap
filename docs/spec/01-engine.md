# 01 — Engine

## Purpose

`src/game/engine.ts` is a **pure, deterministic simulation**: `step(world, input, dt, vp)`
mutates `world` and returns `GameEvent[]`. No DOM, React, timers, or `Math.random` (randomness
comes from `world.rng`). This is what makes seeded dailies, replay verification (Phase 9), and
the whole test suite possible. Keep it that way.

## Files

- `engine.ts` — `createWorld`, `startChapter`, `retryChapter`, `step`, `resizeWorld`, spawn and
  collision helpers, punya constants.
- `constants.ts` — physics and geometry (documented unit per constant).
- `types.ts` — `World`, `Obstacle`, `Viewport`, `Input`, `GameEvent`, `Assets`, `WorldPhase`.
- `kinds.ts` — `KINDS: Record<ObstacleKindId, KindDef>` (name, colours, `style`, `sway`, `bonus`, `boss`).
- `mechanics.ts` — per-chapter hooks (`MECHANICS`), `resetChapterEffects`.
- `obstacles/registry.ts` — per-kind hooks (`BEHAVIOURS`), `columnCollide`, `heroHitbox`, `gapMul`.

## Units and constants (`constants.ts`)

- Logical height is fixed per orientation: `LANDSCAPE_H = 560`, `PORTRAIT_H = 768`. Width follows
  the container aspect within `LANDSCAPE_ASPECT [1.35, 2.1]` / `PORTRAIT_ASPECT [0.45, 0.8]`.
  Canonical sizes: 900×560 and 432×768.
- Anything vertical is `·H` (fraction of H): `GRAVITY_H = 2.679`, `FLAP_H = −0.768`,
  `SEA_H_FRAC`, `SPAWN_MARGIN_*_FRAC`, `MIN_GAP_FRAC`, `GAP_SHRINK_PER_LEAP_FRAC = 1/560`, sway amplitudes.
- Absolute logical px: `HERO_R = 28` (AABB half-size), `OB_W = 84`, `SPAWN_X_OFFSET = 60`,
  `DESPAWN_X = −140`, `HERO_DRAW`/`HERO_SRC` (sprite rects).
- `HERO_X_FRAC = 0.19` of W; `PORTRAIT_SPEED_MUL = 0.72` (columns arrive over less distance).
- Loop: `STEP = 1/120`, `MAX_SUBSTEPS = 8`, `MAX_DT = 0.05`. `DEATH_COOLDOWN_MS = 600`.
- Sahaj: `EASY_GAP_MUL = 1.2`, `EASY_SPEED_MUL = 0.88`. `MAX_DPR = 2`.

Chapter difficulty (`Chapter.difficulty`) is `{speed ·H/s, spawn s, gap ·H, gapMin ·H}`.
`chapterSpeed(ch, vp, world) = speed × vp.h × vp.speedMul × world.speedRamp × (easy ? 0.88 : 1)`.

## `World` (types.ts) — the important fields

| Field                                  | Meaning                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `y, vy`                                | hero centre and vertical velocity (x is fixed at `vp.heroX`)                                      |
| `t, scroll`                            | sim time; horizontal distance scrolled (background/sea parallax)                                  |
| `phase: "run" \| "finale" \| "frozen"` | frozen between chapters; finale = closing glide/scene                                             |
| `chapter, passes, leaps, smashes`      | chapter index (story 0–9, `ENDLESS_INDEX = 10`); passes this chapter; passes this run; trees torn |
| `punya, punyaAtChapterStart`           | score; snapshot for `retryChapter`                                                                |
| `bossSpawned, bossPassed`              | Lankini chapter bookkeeping                                                                       |
| `deaths`                               | run-wide (flawless = 0)                                                                           |
| `heroScale, gravityMul`                | per-step modifiers reset to 1 each step; set by `BEHAVIOURS[kind].affectHero`                     |
| `tailFire, dir, speedRamp`             | chapter effects (Dahan flame; `dir = −1` mirrors the return leg; ramps)                           |
| `easy`                                 | sahaj mode; affects future spawns and speed only                                                  |
| `rng`                                  | `() => number`; `Math.random` in story, `mulberry32(seed)` in Daily, fixed in tests               |

`Obstacle` carries geometry (`x, w, gapY, gapH`) plus base values for sway (`baseGapY/H`,
`phase`) and optional per-kind state (`touched/riseT/targetPeakY` Mainaka, `shadowing` Simhika,
`decoys` house, `smashed` vriksha). Add new per-kind state as optional fields here with a doc comment.

## Lifecycle

- `createWorld(vp, rng?)` → idle, `phase: "frozen"`, `running: false`.
- `startChapter(world, i, vp)` → resets chapter-local counters and obstacles, snapshots punya,
  re-centres hero, `phase: "run"`, `running: false` (the shell sets `running = true` on the first
  tap), calls `resetChapterEffects` then `MECHANICS[id].onEnter`.
- `retryChapter` → punya back to snapshot, `startChapter(same index)`. Deaths are **not** reverted.
- `step` returns `[]` unless `running`.

## One `step` (in order)

1. `MECHANICS[ch.id].onUpdate` (ramps), compute `speed`, `t += dt`.
2. If `phase === "finale"` → `stepFinale` (below) and return.
3. `scroll += speed·dt`; `if input.flap → vy = FLAP_H·H` (edge-triggered; the shell clears the flag).
4. Reset `heroScale = gravityMul = 1`; for each obstacle: `x −= speed·dt`, `BEHAVIOURS.update`,
   `BEHAVIOURS.affectHero`.
5. Integrate: `vy += GRAVITY_H·H·gravityMul·dt; y += vy·dt`.
6. Spawn: when `spawnTimer ≥ difficulty.spawn`, `nextSpawnKind` picks from the weighted roster
   while `passes + pending < targetPasses(ch)`; for boss chapters, spawns `"lankini"` once the
   screen is clear; otherwise null (spawn timer keeps accumulating).
   `spawnObstacle` sets gap = `max(gapMin, gap − passes·SHRINK) × H × gapMul`, random `gapY`
   within margins, then `BEHAVIOURS.init`.
7. Passing: obstacle fully left of `heroX` → `passed`, `passes++`, `leaps++`,
   `punya += passPunya` = `round(PASS_PUNYA × scoreMul) + KINDS.bonus + BEHAVIOURS.passBonus`;
   boss → `bossPassed`. Emits `pass`. Despawn past `DESPAWN_X`.
8. Collision: walls first (`hitsWalls`: ceiling and sea always lethal), then each obstacle's
   `collide ?? columnCollide` → `"hit" | "collect" | "smash" | "none"`. `collect` adds
   `COLLECT_PUNYA = 25`; `smash` adds `SMASH_PUNYA = 30`, `smashes++`, emits with burst position.
   On hit: `running = false`, `deaths++`, emit `hit{by}`, return.
9. Goal: `goalReached` (boss → `bossPassed`; else `passes ≥ targetPasses`) **and** every column is
   behind the hero → `phase = "finale"`, emit `finale`.

### `stepFinale`

Scroll eases to zero over `FINALE_SLOW_S = 1.2 s`, hero drifts to `0.45·H`, obstacles keep
moving/despawning. After `finaleDuration(ch)` (2.4 s for scene finales, 1.0 s otherwise):
`running = false`, `phase = "frozen"`, and either `won` (last chapter: `+WIN_BONUS 500`,
`+FLAWLESS_BONUS 500` if `deaths === 0`) or `chapterClear` (`+CLEAR_BONUS 50 × (chapter+1)`).

## Events (`GameEvent`)

`pass{passes,punya,kind}` · `collect{punya}` · `smash{punya,x,y}` · `hit{punya,by}` ·
`finale{chapter}` · `chapterClear{chapter,punya}` · `won{punya,deaths}`.
The shell (04) is the only consumer; achievements (05) derive from these.

## Punya summary

| Source                    | Value                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| pass                      | `10 × scoreMul` (+ kind bonus: rakshasa 15, lankini 100, house 10, astra 20, tower 15) (+ surasa 10, simhika 15) |
| Mainaka touch (`collect`) | 25 (once per mountain)                                                                                           |
| vriksha torn (`smash`)    | 30                                                                                                               |
| chapter clear             | 50 × (index+1)                                                                                                   |
| win / flawless            | 500 / +500                                                                                                       |

## `resizeWorld(world, from, to)`

Orientation flips change H; vertical quantities scale by `to.h/from.h`, x is left alone. Called
by the shell before swapping `vpRef`.

## Invariants (tests pin these)

- Flap apex height is the same fraction of H in both orientations.
- Never spawns more roster columns than the goal needs; boss chapters spawn exactly one Lankini.
- A pass is counted once; a hit stops the run and names the killer (`by`).
- With a fixed rng, two runs with identical inputs produce identical worlds (Daily / replay).
- `retryChapter` restores punya to the chapter start.

## Extension points

- New obstacle kind → `ObstacleKindId` (chapters/types), `KINDS`, optional `BEHAVIOURS` entry,
  a drawer in `render/obstacles.ts` (`drawObstacle` switch), roster usage, render smoke test.
- New chapter-wide effect → `MECHANICS[chapterId]` + reset in `resetChapterEffects` + `World` field.
- New collision outcome → extend `CollideResult`, handle in `step` step 8, add an event.
