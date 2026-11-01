# STATUS — living state of Hanuman's Leap

_Update this file after every completed module or feature (see `CLAUDE.md`). Newest session-log
entries go at the bottom of §5._

## 1. Verified baseline (2026-09-16)

| Check               | Result                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Branch / commit     | `claude/codebase-spec-files-c279b8` @ 93233d2 + specs (fast-forwarded onto `claude/next-phase-mobile-planning-178c16`) |
| `main`              | c4bb80c — Phase 5 (8 chapters, no modes); 17 commits behind the feature branch, **unmerged, unpushed**                 |
| `bun run test`      | 12 files, **83 tests** green                                                                                           |
| `bunx tsc --noEmit` | clean                                                                                                                  |
| `bun run lint`      | 0 errors, 7 react-refresh warnings                                                                                     |
| Live site           | https://hanuman-leap.vercel.app (deployed from `main`, i.e. Phase 5)                                                   |

## 2. Shipped (by phase — details in `docs/ROADMAP.md`)

| Phase     | Content                                                                                                                                                                                    | Where          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| 0–5       | Module split, responsive retina canvas, ·H physics, 8 chapters + verses, win condition, game feel, audio, PWA manifest/icons/OG, README                                                    | `main`         |
| 6         | WebP assets, self-hosted Devanagari, save v2 + Settings sheet, hi/en UI, sahaj mode, web haptics, first-run hint, analytics seam, hand-written service worker + vm tests, gradient caching | feature branch |
| 7         | Capacitor shell: native Vite entry, platform seam, config, `ios/` (SPM) + `android/`, icons/splash. **Not compiled** (no toolchains)                                                       | feature branch |
| 8         | Seeded PRNG, Endless Flight, Today's Leap (IST), 17 achievements + toasts, share card, per-chapter stats; modes unlock at chapter 4                                                        | feature branch |
| 10 (part) | Two new chapters — विभीषण मिलन (5) and वाटिका विध्वंस (7): kinds `house/vriksha/astra`, `smash` result, `capture` finale; save v3 remap                                                    | feature branch |
| Landing   | Full-screen first page (`src/components/Landing.tsx`): painted dawn, Hanuman mid-leap, Lanka skyline, launch verse, Play → game; `?chapter=n` skips it; web + native shell           | this branch    |
| Specs     | `CLAUDE.md` + `docs/spec/*` (this set)                                                                                                                                                     | this branch    |

## 3. In flight

_(nothing)_

## 4. Next unblocked work (owner-delegated order; see ROADMAP §7)

1. **Merge** the feature branch into `main` and push (fast-forward; Lovable-safe) so the live site
   gets Phases 6–10. Needs owner go-ahead for the push.
2. Phase 10 remainder: Verse Pothi (verse library), synthesized music (tanpura drone + motif,
   separate toggle), kid mode, Madhuvan / Setu-bandh chapters, art pass.
3. Phase 8.7 ghost replay + Phase 9 leaderboard — together, once a Neon account exists (flap log
   - server re-simulation).
4. Phase 7 steps 5–8 (TestFlight / Play internal, store kit, `/privacy` page) — blocked on the
   owner's Xcode/Android Studio and developer accounts.

## 5. Session log (append-only)

- **2026-09-15** — Phases 0–5 built from the Lovable mock and pushed to `main`; live on Vercel.
- **2026-09-15** — Roadmap written; owner delegated decisions (ROADMAP §6). Phase 6, 7 (scaffold),
  8 (8.1–8.6), and the two Phase 10 chapters shipped on `claude/next-phase-mobile-planning-178c16`
  (17 commits). 83 tests.
- **2026-09-16** — Read the whole codebase; fast-forwarded `claude/codebase-spec-files-c279b8`
  onto the feature branch; wrote `CLAUDE.md` and `docs/spec/{README,00–07,STATUS}.md` as the
  cross-session memory; established the update-after-each-feature rule. Verified baseline above.
- **2026-11-01** — Landing page: `src/components/Landing.tsx` (CSS/SVG artwork reusing
  `hanuman.webp` + `ocean-bg.webp`, launch verse from `VERSES`), `landing.*` strings (en/hi),
  keyframes in `styles.css` (off under reduced motion); `routes/index.tsx` shows it until Play.
  Native shell unchanged. 83 tests. Note: `tsc` flags `__root.tsx` ErrorComponent typing after
  the TanStack 1.168.60 bump (pre-existing, not from this change).
- **2026-11-01** — Native shell (`src/native/NativeApp.tsx`) now shows the same `Landing` before
  the game. `build:native` OK; still not compiled on device (no Xcode/Android Studio here).
