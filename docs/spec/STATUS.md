# STATUS — living state of Hanuman's Leap

_Update this file after every completed module or feature (see `CLAUDE.md`). Newest session-log
entries go at the bottom of §5._

## 1. Verified baseline (2026-11-06)

| Check               | Result                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `main`              | Everything below is merged and live (through PR 8)               |
| `bun run test`      | 17 files, **138 tests** green                                    |
| `bunx tsc --noEmit` | clean                                                            |
| `bunx eslint src`   | 0 errors, 7 react-refresh warnings                               |
| Live site           | https://hanuman-leap.vercel.app (deployed from `main` by Vercel) |

## 2. Shipped (by phase — details in `docs/ROADMAP.md`)

| Phase     | Content                                                                                                                                                                                    | Where  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 0–5       | Module split, responsive retina canvas, ·H physics, 8 chapters + verses, win condition, game feel, audio, PWA manifest/icons/OG, README                                                    | `main` |
| 6         | WebP assets, self-hosted Devanagari, save v2 + Settings sheet, hi/en UI, sahaj mode, web haptics, first-run hint, analytics seam, hand-written service worker + vm tests, gradient caching | `main` |
| 7         | Capacitor shell: native Vite entry, platform seam, config, `ios/` (SPM) + `android/`, icons/splash. **Not compiled** (no toolchains)                                                       | `main` |
| 8         | Seeded PRNG, Endless Flight, Today's Leap (IST), 17 achievements + toasts, share card, per-chapter stats; modes unlock at chapter 4                                                        | `main` |
| 10 (part) | Two new chapters — विभीषण मिलन (5) and वाटिका विध्वंस (7): kinds `house/vriksha/astra`, `smash` result, `capture` finale; save v3 remap                                                    | `main` |
| Landing   | Full-screen first page (`src/components/Landing.tsx`): painted dawn, Hanuman mid-leap, Lanka skyline, launch verse, Play → game; `?chapter=n` skips it; web + native shell                 | `main` |
| Music     | Tanpura drone + per-chapter raga phrase, synthesized (`src/game/music.ts`); Music switch in Settings; `save.music`                                                                         | `main` |
| Specs     | `CLAUDE.md` + `docs/spec/*` (this set)                                                                                                                                                     | `main` |

## 3. In flight

**Compulsory sign-in** is live on the web (PRs 4 to 6). The `/privacy` page shipped 2026-11-06.
Still open:

- Owner completes sign-in, refresh, sync and delete-account once on a real iPhone. Sessions rely on
  a cookie from Neon's domain, which Safari may block; `verifyCode` now lets the player in without
  cloud save if so, but they would be asked to sign in on every visit. `deleteUser` is unproven on
  Managed Auth.
- Custom SMTP for Neon Auth: the shared sender is for development only.
- A contact line on `/privacy`: left out until the owner chooses a public address.
- Neon Data API must stay off, or the table protected: `game_saves` in `public` now holds emails.
- Consider moving the Vercel function region from `iad1` to Singapore, next to the database.

## 4. Next unblocked work (owner-delegated order; see ROADMAP §7)

1. Phase 10 remainder: Verse Pothi (verse library), kid mode, Madhuvan / Setu-bandh chapters, art pass.
2. Phase 8.7 ghost replay + Phase 9 leaderboard — together, now that Neon exists (flap log
   - server re-simulation).
3. Phase 7 steps 5–8 (TestFlight / Play internal, store kit) — blocked on the
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
- **2026-11-06** — Pre-share refinement. Fixed: the invisible game-over buttons took panic taps, and
  Endless/Daily had no cooldown (`canContinue`); tall overlays clipped their top (`justify-center-safe`);
  landing clipped Play on sideways phones; root `ErrorComponent` typing (`tsc` clean again).
  Cloud save: a push response no longer overwrites progress written while it was in flight, such a
  write now queues another push, auth calls time out after 8 s, a wrong code gets its own message,
  and a right code with no readable session opens the game. New `/privacy` page (linked from
  `AccountPanel`, public, bilingual); `sw.js` caches only `/` as the shell. Surasa's narrowest mouth
  0.55 → 0.7: a look-ahead bot showed chapter 3 harder than Dahan. New `playthrough.test.ts` proves
  every chapter finishable in both orientations. `bun audit fix` applied; `better-auth` stays flagged
  because `@neondatabase/auth` pins it, and the flagged OAuth and magic-link paths are not used here.
  16 files, 129 tests. Not observed live: the game-over cooldown (pane throttles rAF). The owner's Neon
  console shows five rows in `game_saves`, so saves are reaching production. Emails also live in Neon's
  `neon_auth.user` table. `player_profiles`, also in the console,
  is not used by this repo.
- **2026-11-06** — `game_saves.email`: the owner wants emails beside saves in the Neon console. The
  save API stores the verified token's `email` claim. `ensureEmailColumn` adds the column and
  backfills from `neon_auth."user"` on the first write per server instance; email trouble is logged
  and never fails a save. `player_profiles` (`user_id`, `instagram`, empty) is still used by no code.
- **2026-11-06** — Final audit, then `src/lib/security-headers.ts`: `src/server.ts` adds frame,
  sniffing, referrer and permissions headers to server responses in production only (the Lovable
  editor frames dev). No script CSP on purpose. Brought this file, README and spec 06 up to date.
- **2026-11-06** — Owner confirmed the Data API is off and iPhone sign-in survives a refresh. Owner
  wanted emails kept after Delete account; silently keeping them would contradict the confirm box
  and `/privacy`, so Delete account gained an unticked "keep my email" box. Ticked, `DELETE /api/save`
  gets `{keepEmail: true}` and stores the token's email in `mailing_list` (self-creating, email and
  consent time only). The saved row is always removed.
