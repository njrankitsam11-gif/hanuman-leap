# 00 — Overview

## Product

**Hanuman's Leap to Lanka** — a one-tap flying game retelling the Sundarkand of Tulsidas's
_Ramcharitmanas_. Ten story chapters (Jambavan's call → return to Ram), each with its own
obstacle mechanic and a verified verse on clear; plus two post-story modes (Endless Flight,
Today's Leap), 17 achievements, journey stats, a share card, Hindi/English UI, sahaj (easy)
mode, offline PWA, and a Capacitor shell for iOS/Android (not yet compiled).

Free, ad-free, devotional. Owner decisions are in `docs/ROADMAP.md` §6.

Live: https://hanuman-leap.vercel.app · Repo: GitHub `njrankitsam11-gif/hanuman-leap` (Lovable-connected;
linear history only).

## Stack

| Layer     | Choice                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| Runtime   | Bun (scripts, lockfile), Node-compatible                                                    |
| Web app   | TanStack Start 1.168 (file routes, SSR) + TanStack Router; nitro server; Vercel hosting     |
| UI        | React 19, Tailwind v4 (`@tailwindcss/vite`), shadcn-style primitives in `src/components/ui` |
| Game      | Hand-rolled Canvas 2D engine, fixed-step simulation, Web Audio synthesis (no audio files)   |
| Fonts     | `@fontsource/noto-sans-devanagari` (self-hosted; Latin uses the system stack)               |
| Native    | Capacitor 8 (`@capacitor/{app,core,haptics,preferences,share,splash-screen,status-bar}`)    |
| Tests     | vitest 5, `environment: node`, 83 tests; standalone `vitest.config.ts`                      |
| Lint/fmt  | eslint 9 (typescript-eslint, react-hooks, prettier), prettier 3                             |
| Analytics | `@vercel/analytics` behind `src/lib/analytics.ts`                                           |

`tsconfig.json` is strict with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noPropertyAccessFromIndexSignature` — index with `["key"]` on `Record<string, unknown>`, and
spread optional props conditionally (`{...(x !== undefined ? { x } : {})}`).

## Repo layout

```
CLAUDE.md, AGENTS.md, README.md          session entry · Lovable notice · player docs
docs/ROADMAP.md, docs/spec/              plan + decisions · these specs
src/game/                                the game, framework-free (see 01–03, 05)
  engine.ts constants.ts types.ts kinds.ts mechanics.ts rng.ts fx.ts audio.ts haptics.ts
  assets.ts viewport.ts storage.ts achievements.ts share.ts
  chapters/{index,types,verses}.ts       chapter data + verses
  obstacles/registry.ts                  per-kind behaviour hooks
  render/{index,background,sky,hero,obstacles,scene}.ts
  __tests__/*.test.ts
src/components/HanumanLeap.tsx           the React shell: loop, state machine, event dispatch
src/components/game/*.tsx                screens, HUD, settings, toasts, share button
src/components/ui/*.tsx                  badge, button, dialog, progress, switch (shadcn)
src/i18n/{index.tsx,strings.ts}          LangProvider, useT, bilingual UI strings
src/platform/{index,capacitor}.ts        host seam (web defaults / Capacitor impl)
src/native/{main.tsx,NativeApp.tsx}      Capacitor entry (no router/SSR)
src/lib/{analytics,sw,utils,error-*}.ts  telemetry, SW registration, cn(), Lovable error pages
src/routes/{__root,index}.tsx            TanStack file routes (`?chapter=n` deep link)
src/{router,server,start}.ts             router factory, SSR error wrapper, middleware
public/{sw.js,manifest.webmanifest,icons/,og.jpg}
native/index.html · vite.native.config.ts · capacitor.config.ts · ios/ · android/ · assets/
```

## Two build entries

1. **Web** — `vite.config.ts` via `@lovable.dev/vite-tanstack-config` (adds TanStack Start,
   React, Tailwind, tsconfig-paths, nitro, `@` alias). Injects `__BUILD_ID__` (git sha / Vercel
   sha) used to version the service worker. Output `.output/`.
2. **Native** — `vite.native.config.ts`: plain Vite SPA rooted at `native/`, `base: "./"`,
   `__BUILD_ID__ = "native"`, output `dist-native/` = Capacitor `webDir`. Mounts
   `<HanumanLeap/>` inside `NativeApp` after `installCapacitor()`.

Both mount the same `HanumanLeap` component; it imports nothing from the router or `window.location`.

## Data flow at a glance

```
pointer/keys ──▶ HanumanLeap.requestFlap ──▶ pendingFlapRef
rAF frame ──▶ accumulate dt ──▶ engine.step(world, {flap}, 1/120, vp) × n ──▶ GameEvent[]
        └─▶ updateFx ──▶ render(ctx, world, vp, assets, {fx})
GameEvent[] ──▶ dispatch(): React state (HUD), sfx, haptics, fx bursts, analytics,
                            achievements.evaluate, storage.saveGame/updateStats, GameState change
GameState ──▶ which overlay screen renders (Start / Intro / Clear / Over / Won / Pause / Settings)
```

Units: every vertical quantity in the engine is a fraction of logical height `H` (560 landscape,
768 portrait); sprites/columns are absolute logical px. See 01.
