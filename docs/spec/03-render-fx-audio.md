# 03 — Viewport, render, fx, audio, haptics, assets

## Viewport (`src/game/viewport.ts`)

`computeViewport(containerW, containerH, dpr, prevPortrait?) → Viewport {w, h, cssW, cssH, dpr,
portrait, heroX, seaH, speedMul}`.

- Orientation by aspect with hysteresis (flip to portrait below 0.95, back above 1.05) so a
  near-square window doesn't thrash `resizeWorld`.
- Logical H fixed per orientation; logical W = H × clamp(aspect); CSS box is the contain-fit.
- `dpr` clamped to `[1, MAX_DPR=2]`. `applyViewport(canvas, ctx, vp)` sizes the backing store and
  sets the transform (this clears the canvas — redraw after).
- `DEFAULT_VIEWPORT` = canonical 900×560 for SSR / first client frame.
- The shell re-computes on `ResizeObserver` and on DPR change (`matchMedia(resolution)` re-armed
  after each change).

## Render pipeline (`src/game/render/index.ts`)

`render(ctx, world, vp, assets, {now, idle, fx})` draws one frame in **flow space** (obstacles
always come from the right). Order:

1. `save`; shake translate (fx); if `world.dir === −1` → translate(W,0)+scale(−1,1) (the whole
   world pass is mirrored on the return leg).
2. `drawBackground` — cover-fit ocean image, horizon anchored at 58 %, tiled with `scroll × 0.25`
   parallax; flat saffron fallback until the image is ready.
3. `drawSky` — flat tint per `SkyId` (`SKY_TINT`; `day` = none). Endless uses `endlessSky(passes)`
   cycling morning→day→dusk→night→dawn every `ENDLESS_DAY = 40` passes.
4. `drawScene` — finale set pieces behind the hero (Sita's tree, Ram's shore, capture darkening).
5. `drawObstacle` for each; `drawSea` (cached vertical gradient per ctx/viewport + wave strokes);
   `drawObstacleFx` (Simhika's shadow/tendril, drawn over the sea).
6. `drawParticles(fx)`; `drawHero` (tilt from `vy`, squash/stretch from `fx.squash`, scale by
   `heroScale`, idle bob when `idle`, x from `sceneHeroX` which drifts toward the set piece in a finale).
7. `drawSceneFront` — ring in flight / astra + coils above the hero. `restore`.
8. `drawObstacleLabel` un-mirrored so names read correctly when flying home.
9. Flash overlay (`fx.flash`) and the saffron iris wipe (`fx.wipe`, evenodd circle around the hero).

`render/obstacles.ts` has one drawer per kind (`drawCloud, drawWave, drawMainaka, drawSurasa,
drawSimhika, drawRakshasa, drawLankini, drawTree, drawHouse, drawVriksha, drawAstra, drawTower`)
dispatched from `drawObstacle` by `o.kind`. Column-body gradients are cached per ctx in a
`WeakMap` keyed by `w:top:bottom` and drawn under a translate (position-independent). Radial glows
are not cached (position-dependent). `drawHouse` paints decoys from `o.decoys` and the राम lintel
on the real door; `drawVriksha` draws the fallen state when `o.smashed`.

`render/scene.ts`: `isSceneActive`, `sceneHeroX`, scenes keyed by `ChapterGoal.finale.scene`;
timings `RING_FROM/TO = 1.2/2.0 s`, `ASTRA_FROM/HIT = 0.9/1.5 s`, slide-in eased over
`FINALE_SLOW_S`.

Rule: the renderer **never reads React state** and never mutates `world` (it may call
`Math.random` for shake only).

## Fx (`src/game/fx.ts`) — cosmetics outside the engine

`Fx {particles, flash, shake, wipe, squash, reducedMotion, *Acc}`; `MAX_PARTICLES = 200` (oldest
dropped). Particle kinds: `spark` (trail / flap), `sparkle` (collect), `ember` (fire sky),
`flame` (tail fire), `leaf` (smash).

- `flapFx` → squash 1 + 8 sparks; `hitFx` → flash 1, shake `SHAKE_PX = 12` (0 if reduced motion);
  `wipeFx` → wipe 1 (0 if reduced motion); `burst(fx, kind, x, y, n)` general.
- `updateFx(fx, dt, world, vp, {heroX, fireSky, running})` decays flash (0.3 s), shake (0.35 s),
  wipe (`WIPE_S = 0.6`), squash (exp), and runs the steady emitters: trail at 14/s while running,
  flames at 40/s when `tailFire`, embers at 10/s under a fire sky. Particles integrate; sparks fall.
- Particle positions are in flow space so mirroring is free.
- `reducedMotion` mirrors `prefers-reduced-motion` (shell effect).

## Audio (`src/game/audio.ts`) — Web Audio synthesis, zero files

- `unlockAudio()` must run inside a user gesture (the shell calls it in `requestFlap`); creates the
  context lazily, suspends/resumes with `visibilitychange`.
- `playSfx(name)`: `flap` (rate-limited 50 ms, band-passed noise + sine chirp), `pass` (two
  triangle notes), `collect` (three rising sines), `smash` (crack + rustle), `hit` (sub thud +
  low-passed noise), `shrink` (descending sine; fired by the shell when `heroScale` first becomes
  `SURASA_SHRINK`), `chapter` (FM bells), `win` (arpeggio through a feedback delay + bell),
  `fire` (unused by the shell today).
- `setAmbience("fire" | null)`: looped brown-noise fire, only while actually playing Dahan
  (shell effect keyed on `state/paused/chapter`).
- `setMuted` ramps the master gain; `isMuted`.

## Haptics (`src/game/haptics.ts`)

`haptic(name)` with `HapticName = hit | collect | chapter | win`. Web backend = `navigator.vibrate`
patterns (`hit 60 ms`, `collect 15`, `chapter [20,40,20]`, `win [30,50,30,50,60]`); the native
build swaps in Capacitor Haptics via `setHapticBackend`. `hapticsSupported()` decides whether the
settings toggle shows (desktop / iOS Safari: hidden). Flaps never buzz.

## Assets (`src/game/assets.ts`, `src/assets/`)

`loadAssets()` (client-only) returns `{hero, bg}` `HTMLImageElement`s: `hanuman.webp` (761×460,
already cropped to the alpha bbox — `HERO_SRC` is the full image) and `ocean-bg.webp`. `isReady(img)`
gates every draw; both have painted fallbacks. Images were converted with `sharp` (cwebp is broken
on this Mac). Native icons/splash live in `assets/` (Capacitor assets source).

## Tests

`render.test.ts` proxies a `CanvasRenderingContext2D` that throws on any non-finite numeric
argument and iterates every chapter × kind × viewport, both scene timelines, mirrored + tail-fire,
missing assets, and a long collision-free run. `fx.test.ts` covers the pool cap, decay, reduced
motion, emitters. `viewport.test.ts` covers canonical sizes, clamps, hysteresis, fallback. Audio and
haptics are not unit-tested (browser-only); keep them side-effect-free on the server.
