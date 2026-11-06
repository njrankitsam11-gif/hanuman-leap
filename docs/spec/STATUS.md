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
| Landing   | Full-screen first page (`src/components/Landing.tsx`): painted dawn, Hanuman mid-leap, Lanka skyline, launch verse, Play → game; `?chapter=n` skips it; web + native shell                 | this branch    |
| Music     | Tanpura drone + per-chapter raga phrase, synthesized (`src/game/music.ts`); Music switch in Settings; `save.music`                                                                         | this branch    |
| Specs     | `CLAUDE.md` + `docs/spec/*` (this set)                                                                                                                                                     | this branch    |

## 3. In flight

**Compulsory sign-in** (branch `claude/compulsory-sign-in`). Sign-in + cloud save is live as
optional since 2026-11-06 (PR 4); this branch makes it compulsory on the web. A real email-code
sign-in has not been completed yet (needs the owner's inbox). Before compulsory goes live:

- Owner completes sign-in, sync and delete-account once. `deleteUser` is unproven on Managed Auth.
- Custom SMTP for Neon Auth: the shared sender is for development only.
- A `/privacy` page, since the site now stores email addresses.

## 4. Next unblocked work (owner-delegated order; see ROADMAP §7)

1. **Merge** the feature branch into `main` and push (fast-forward; Lovable-safe) so the live site
   gets Phases 6–10. Needs owner go-ahead for the push.
2. Phase 10 remainder: Verse Pothi (verse library), kid mode, Madhuvan / Setu-bandh chapters, art pass.
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
- **2026-11-01** — Background music: new `src/game/music.ts` (pure `TUNES`/`phrase`/`TANPURA` +
  look-ahead Web Audio scheduler on `audio.ts`'s master via new `audioGraph()`), `save.music`
  (backfilled, no version bump), Music switch in `SettingsSheet` (disabled while Sound is off),
  `settings.music` strings, `track` key `music`, shell effect in `HanumanLeap.tsx`. New
  `music.test.ts` + storage case → 13 files, 90 tests. Verified in the pane: tanpura plucks
  scheduled while flying, none while paused or with Music off; setting persists. Gotcha: port
  8091 can be held by another checkout's dev server — Vite silently moves to 8092, so check the
  log before testing.
- **2026-11-06** — Fixed cloud save never sending: `auth.token()` returned no token because the
  SDK answers "/token" from its session cache. `api()` now uses `getSession()`'s JWT; found from
  the owner's real sign-in, which left a user row but no save. New end-to-end client test.
- **2026-11-06** — Compulsory sign-in on the web: `checkAccount` + `canPlay` in
  `src/lib/cloud-save.ts`, sign-in screen in `src/routes/index.tsx`, new
  `src/lib/__tests__/cloud-save.test.ts`. Unreachable auth now means `off`, not `out`, so an
  outage or offline player can still play. Native stays exempt.
- **2026-11-05** — Backend and sign-in (web only). Owner chose cloud save over a leaderboard, and
  email code over Google. Neon (free plan, `sin1`, project connected through the Vercel
  Marketplace) with Managed Auth. New `src/routes/api/save.ts`, `src/lib/cloud-save-server.ts`
  (bearer JWT, EdDSA, `game_saves` table, `db/schema.sql` applied by hand), `src/lib/cloud-save.ts`
  (client sync, 5 s debounce), `AccountPanel.tsx`; `mergeSaves`/`parseSave`/`onSaveWrite`/
  `replaceSave` in `storage.ts`. 14 files, 102 tests. Verified: API 401s without a valid token;
  Neon accepted a code request from the panel. Gotchas: Neon rejects `capacitor://localhost` as a
  trusted domain, so sign-in is switched off in the native shell; `vercel` CLI 59 has no `--yes`
  on `integration add`; run eslint on `src` (a bare `bun run lint` here walked build output and
  reported 27k formatting errors). `tsc` `__root.tsx` error is still the pre-existing one.
