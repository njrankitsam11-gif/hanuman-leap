# Hanuman's Leap — session entry point

One-tap flying game (Flappy-style) retelling the **Sundarkand** in ten chapters, each closing
with a verified Tulsidas verse. TanStack Start + React 19 + Canvas 2D, Bun, vitest. Live at
https://hanuman-leap.vercel.app. Native (Capacitor) shell scaffolded but never compiled here.

## Read this first, every session

1. `docs/spec/STATUS.md` — what is shipped, what is in flight, the verified baseline, and the
   session log. **Start here.**
2. `docs/spec/README.md` — index of the per-subsystem specs. Open the one(s) for the area you
   are about to touch before reading code.
3. `docs/ROADMAP.md` — the phase plan and the owner's recorded decisions (§6). Do not re-ask
   decided questions.

The specs are the memory between sessions. They describe _intent and invariants_, not a
line-by-line copy of the code; when spec and code disagree, the code is the truth — fix the spec.

## The spec-maintenance rule (mandatory)

After each module or feature is complete — before reporting done — update the specs:

- `docs/spec/STATUS.md`: move the item to _Shipped_, bump the test count, add a dated session-log
  line (what changed, which files, anything learned).
- The subsystem spec(s) whose invariants, types, constants, file lists, or flows changed.
- `docs/ROADMAP.md` only when a phase item's status changes.
- `README.md` only for player-facing changes (controls, chapters, modes).

Commit spec updates in the same commit as the feature (or the one right after it, tagged
`Docs:`). A feature whose spec is stale is not finished.

## Commands (Bun)

```bash
bun install                      # deps (lockfile: bun.lock)
bun run dev -- --port 8091       # web app; 8080 is often held by the main checkout
bun run test                     # vitest: 102 tests, ~0.3 s
bunx tsc --noEmit                # strict typecheck (must stay clean)
bun run lint                     # eslint; 0 errors expected (react-refresh warnings are fine)
bun run build                    # TanStack Start + nitro → .output/
bun run build:native             # plain Vite SPA → dist-native/ (Capacitor webDir)
```

Production build locally (`vite preview` does not work with nitro output):
`NITRO_PRESET=node-server bun run build && PORT=8092 node .output/server/index.mjs`

## Hard rules

- **Never force-push, rebase, amend or squash pushed commits** (Lovable-connected repo — see
  `AGENTS.md`). Linear history only.
- **Verses**: any new `Verse` must be cross-checked against a Gita Press-derived source
  (drikpanchang.com `?page=N`, shrirammitramandal.com raw HTML — curl + grep, WebFetch's
  summariser refuses verbatim quotes) before `verified: true`. The test suite refuses unverified
  text.
- **Engine purity**: `src/game/engine.ts` and everything it imports must not touch DOM, React,
  `window`, `Date`, or `Math.random` directly (use `world.rng`). Cosmetics go in `fx.ts`.
- **Web bundle never imports Capacitor**: only `src/native/` and `src/platform/capacitor.ts` may.
- **Every new game module gets a vitest file** under `src/game/__tests__/` (see
  `docs/spec/07-testing.md` for the stub patterns).
- Chapter indices are persisted: inserting a chapter needs a **save migration** (see
  `docs/spec/05-persistence-modes-achievements.md`).

## Environment gotchas (this Mac / the desktop-app browser pane)

- The embedded Browser pane throttles `requestAnimationFrame` when hidden and cannot register
  service workers. Verify game logic with tests; verify visuals via screenshots of overlays or a
  throwaway static-frame route, not by watching the loop.
- `preview_start` may not spawn `bun run dev`; run it via Bash in the background and `navigate`.
- No Xcode / CocoaPods / Android Studio / JDK: `ios/` and `android/` cannot be built here.
- `cwebp` is broken (libtiff); use `sharp` in the scratchpad for image work.
- ESLint hangs unless `ios`, `android`, `assets`, `dist-native` stay in its `ignores`.
