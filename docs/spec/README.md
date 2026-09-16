# Specs — index and maintenance

These files are the cross-session memory for the project. Each describes one subsystem's
purpose, files, types, invariants, and the flows that cross into other subsystems. They are
written so a fresh session can act correctly _without_ re-reading the whole codebase.

| File                                                                         | Covers                                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [STATUS.md](STATUS.md)                                                       | **Living**: baseline, shipped/in-flight/next, session log. Update after every feature.      |
| [00-overview.md](00-overview.md)                                             | Product, stack, repo layout, the two build entries, data flow at a glance                   |
| [01-engine.md](01-engine.md)                                                 | `World`, `step`, constants (·H units), spawning, collision, punya, events, finale, resize   |
| [02-chapters-and-obstacles.md](02-chapters-and-obstacles.md)                 | The ten chapters + Endless, goals, obstacle kinds, `BEHAVIOURS`, `MECHANICS`, verse policy  |
| [03-render-fx-audio.md](03-render-fx-audio.md)                               | Viewport, render pipeline (mirroring, scenes), fx, Web Audio synthesis, haptics, assets     |
| [04-shell-and-ui.md](04-shell-and-ui.md)                                     | `HanumanLeap.tsx` state machine, event dispatch, screens, HUD, i18n, settings sheet         |
| [05-persistence-modes-achievements.md](05-persistence-modes-achievements.md) | Save v1→v3 + migration, stats, achievements, seeded rng / Daily, share card, analytics      |
| [06-platform-and-build.md](06-platform-and-build.md)                         | TanStack Start web app, PWA + service worker, Vercel, Capacitor shell, scripts, env gotchas |
| [07-testing.md](07-testing.md)                                               | Test suites, stub patterns, verification workflow, what a new feature must add              |

Related, outside this folder: `../ROADMAP.md` (phases, backlog, owner decisions), `../../README.md`
(player-facing), `../../CLAUDE.md` (session entry + rules), `../../AGENTS.md` (Lovable notice).

## How to maintain

- **When a feature lands**: update `STATUS.md` (always) and the spec(s) whose content changed.
  Add, don't rewrite history: the session log is append-only.
- **When adding a subsystem**: create `NN-name.md` with the same section skeleton (Purpose ·
  Files · Types & constants · Invariants · Flows · Extension points · Tests) and add a row above.
- **When a spec and the code disagree**: the code wins; fix the spec in the same commit.
- Keep specs about _intent, invariants, and non-obvious decisions_. Don't paste code; reference
  `path:symbol` so the reader can jump.
- Numbers that tests pin (constants, chapter counts, test totals) should be stated once, here or in
  STATUS, and referenced elsewhere.
