# Hanuman's Leap — Roadmap: next phase, backlog, and the mobile app

_Drafted 2026-09-15 against `main` @ c4bb80c (Phases 0–5 shipped, 45 tests green, live at
https://hanuman-leap.vercel.app)._

## 0. Where we are, and what makes the next steps cheap

| Fact about the code                                                                                   | What it unlocks                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.ts` is pure and runs a fixed 1/120 s step with an injectable `rng` (`createWorld(vp, rng)`)   | Seeded daily challenges, ghost replays, and a cheat-resistant online leaderboard (server re-simulates the flap log) with almost no engine changes |
| `HanumanLeap.tsx` imports nothing from the router or `window.location`                                | A native (Capacitor) build can mount the component from a tiny non-SSR Vite entry and leave the TanStack Start web app untouched                  |
| Chapter behaviour is data + registries (`chapters/index.ts`, `obstacles/registry.ts`, `mechanics.ts`) | New chapters are mostly data + one verified verse; an endless mode is one synthetic chapter + a ramp hook                                         |
| Save is a validated `SaveV1` in `storage.ts`                                                          | A `v2` migration can add stats, achievements, settings, and per-chapter bests safely                                                              |
| Audio is Web Audio synthesis, no files                                                                | Music and new cues stay asset-free (or can be swapped for files later)                                                                            |

Known gaps carried over: no service worker (the PWA is installable but not offline), the Devanagari font
is fetched from Google Fonts at runtime, `hanuman.png` ships as a 596 KB 816² RGBA PNG of which only a
761×460 crop is drawn, and there is no telemetry — we don't know which chapter kills players.

Effort labels below: **S** ≈ one focused session, **M** ≈ 2–3 sessions, **L** ≈ a week or more.

---

## 1. Phase 6 — Foundations — **shipped 2026-09-15** (branch `claude/next-phase-mobile-planning-178c16`)

Small, unglamorous, and every item is either a prerequisite for the app or fixes something players hit
today. All nine items below are implemented; notes on what differed from the plan:

- 6.1 `vite-plugin-pwa` was not used — a hand-written `public/sw.js` that populates its own precache
  from the SSR HTML avoids any coupling to nitro's output. Versioned by `__BUILD_ID__` on the
  registration URL. Verified by a vm-sandboxed test suite (the embedded browser can't install workers).
- 6.4 Vercel Web Analytics behind `src/lib/analytics.ts`; custom events need Pro, page views don't.
- 6.5 Save v2 also records journey stats (runs, leaps, deaths, wins, per-chapter clears/deaths),
  shown in the Settings sheet — which covers most of 8.5 already.
- 6.8 Only the position-independent gradients (sea strip, column bodies) are cached; the radial glows
  depend on position/pulse and were left alone.
- Still open from this phase: nothing. `vite preview` doesn't work with the nitro output (pre-existing);
  use `NITRO_PRESET=node-server bun run build && PORT=8092 node .output/server/index.mjs` to try a
  production build locally.

| #   | Item                                                                                                                                                                                                                                                                                                                                                                           | Effort | Why now                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 6.1 | **Offline / service worker.** Hand-written `public/sw.js` (precache `/` + hashed `/assets/*`, network-first for the shell, cache-first for assets, versioned by build hash) registered from a client-only effect. Add `vercel.json` header `Cache-Control: no-cache` for `/sw.js`. Spike `vite-plugin-pwa` first — if it plays well with the Lovable/nitro wrapper, prefer it. | S–M    | Makes the PWA real (offline on trains, temples, low-signal), and the native shell needs the same asset strategy    |
| 6.2 | **Self-host Noto Sans Devanagari** via `@fontsource/noto-sans-devanagari` (400/600/700, Devanagari + Latin subsets). Remove the Google Fonts `<link>`.                                                                                                                                                                                                                         | S      | Offline and native both break without it; also removes a third-party request                                       |
| 6.3 | **Asset diet.** Crop `hanuman.png` to `HERO_SRC` and export WebP (+PNG fallback) — expected ≈ 40–60 KB; re-encode `ocean-bg.jpg` at 1600 px / q75 WebP. Update `HERO_SRC`/`HERO_DRAW`.                                                                                                                                                                                         | S      | First paint on 3G; battery on phones                                                                               |
| 6.4 | **Telemetry funnel.** Events: `run_start`, `chapter_start{i}`, `chapter_clear{i,deaths}`, `death{i,kind,passes}`, `won{deaths}`, `install`. Provider decision: Vercel Web Analytics (page views free; custom events need Pro) vs PostHog free tier vs a `events` table on Neon. No PII; respect DNT.                                                                           | S      | Every later tuning decision (gap sizes, Surasa timing, which chapter to add) should be driven by where players die |
| 6.5 | **Save v2 + settings.** `{v:2, best, bestPerChapter[], unlockedChapter, muted, music, haptics, lang, difficulty, reducedMotion?, stats{runs,leaps,deaths,seconds}, achievements[], daily{date,score}}` with a v1→v2 migration and a Settings sheet reachable from Start and Pause.                                                                                             | M      | Everything in Phases 7–9 writes to it                                                                              |
| 6.6 | **First-run hint.** Ghost "tap" hand + "Tap to rise" pulse until the first flap; slightly delayed first spawn on a fresh install.                                                                                                                                                                                                                                              | S      | Flappy clones lose most players on death #1                                                                        |
| 6.7 | **Haptics (web).** `navigator.vibrate` on hit (50 ms) and chapter clear (pattern); off by default on desktop, toggle in settings. Native haptics come with Phase 7.                                                                                                                                                                                                            | S      | Cheap feel win on Android                                                                                          |
| 6.8 | **Render perf.** Cache the 11 per-frame gradients (sky per chapter/viewport; column gradient per kind drawn at x=0 under a translate). Verify with the render smoke tests, not by eye.                                                                                                                                                                                         | S      | Low-end Android WebViews are the floor for the app                                                                 |
| 6.9 | **Hindi / English UI toggle.** `chapter.intro`/`caption` become `{hi,en}`; screens read strings from a small `i18n.ts`; persisted in save; default from `navigator.language`.                                                                                                                                                                                                  | M      | The audience for a Sundarkand game is substantially Hindi-first; today only titles and verses are in Hindi         |

Exit criteria: Lighthouse PWA/offline passes, hero asset < 80 KB, funnel visible in the analytics
dashboard, settings persist across reloads, `bun test` green, and the Lovable-connected branch stays
linear (no force-push — see `AGENTS.md`).

---

## 2. Phase 7 — The mobile app

### 2.1 Options compared

| Path                              | Stores                           | Code reuse                                                                            | Effort | Verdict                                                                                                                                         |
| --------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **PWA hardening** (6.1–6.3)       | None — "Add to Home Screen" only | 100 %                                                                                 | S      | Do regardless; it is the base of every other path                                                                                               |
| **TWA** (Bubblewrap / PWABuilder) | Google Play only                 | 100 %                                                                                 | S      | Quick Android-only listing on top of the PWA; no iOS, no native haptics/share sheet control                                                     |
| **Capacitor** (WebView shell)     | App Store + Play                 | ~100 % (web build + a small platform adapter)                                         | M      | **Recommended.** Canvas 2D at 60 fps is fine in WKWebView/Chrome WebView for this game; native haptics, share, preferences, splash, back button |
| **Expo / React Native + Skia**    | App Store + Play                 | ~60 % (engine, mechanics, chapters, fx are portable; renderer, audio, and UI are not) | L      | Best native feel, but a rewrite of `render/`, `audio.ts`, and every screen for no visible gain on a 2D one-tap game                             |

### 2.2 Capacitor plan — **steps 1–4 done 2026-09-15**; 5–8 need the owner's machine and accounts

Status: `native/` + `src/native/` entry, `vite.native.config.ts`, `src/platform/` seam with
`capacitor.ts` (haptics via Haptics plugin, Android back button → settings/pause/chapters/exit,
splash hidden on first frame, save mirrored to Preferences and restored if localStorage is wiped),
`capacitor.config.ts`, `ios/` (SPM, no CocoaPods) and `android/` generated with Capacitor 8 and
synced, icons + splash generated from `assets/`. This machine has no Xcode, CocoaPods, Android
Studio, or JDK, so nothing native has been compiled yet. To continue: install Xcode (+ iOS
platform) and Android Studio, run `bun run cap:ios` / `bun run cap:android`, build to the
simulator/emulator, and check: safe-area padding under the notch, haptics on hit, back button on
Android, orientation changes mid-run, audio after the first tap, and that the splash hides.

1. **Native entry, no SSR.** `native/index.html` + `src/native/main.tsx` that mounts `<HanumanLeap/>`
   in a full-screen shell (no header, ignores `?chapter`). A separate `vite.native.config.ts`
   (react, tailwind, tsconfig-paths, `base: "./"`, `outDir: "dist-native"`) and a `build:native`
   script. The TanStack Start web app is untouched.
2. **Platform adapter** `src/platform/` with one interface — `haptic(kind)`, `share(card)`,
   `storage.get/set`, `isNative`, `onBackButton`, `onBackground` — a web implementation (vibrate /
   `navigator.share` / localStorage) used by the web entry and a Capacitor implementation used only
   by the native entry, so the web bundle never ships Capacitor.
3. **Capacitor 7+** — `cap init`, `cap add ios`, `cap add android`; commit `ios/` and `android/`
   (Capacitor's recommendation). Plugins: `@capacitor/haptics`, `@capacitor/status-bar` (overlay,
   light content), `@capacitor/splash-screen`, `@capacitor/preferences` (replaces localStorage in
   the native build, one-time migration from localStorage), `@capacitor/share`, `@capacitor/app`
   (Android back → pause / chapters instead of exit; background → pause), `@capacitor/screen-orientation`.
4. **Icons and splash** from a 1024² master with `@capacitor/assets` (we have 512; need a 1024
   source and a splash artwork — the OG image's composition works).
5. **iOS.** Xcode 16+, Apple Developer Program (US$99/yr). No permissions needed. Supported
   orientations: portrait + landscape (the game already handles both) — or portrait-locked on iPhone,
   see decisions. Test in the iOS Simulator (drivable from this environment). Known caveat: Web Audio
   in WKWebView respects the ringer switch; most casual games accept this.
6. **Android.** Android Studio, a release keystore the owner generates and keeps out of git,
   current target SDK. **Gotcha:** new personal Play developer accounts must run a closed test with
   ≥ 12 testers for 14 days before production access — start that clock early.
7. **Store listing kit.** Screenshots (6.7″ phone at minimum; add 12.9″ iPad only if iPad is
   supported), hi + en descriptions, a `/privacy` page on the Vercel site (both stores require a
   URL even with zero data collection), age rating 4+/Everyone, category Games › Casual (secondary:
   Education).
8. **Release flow.** TestFlight → App Review; Play internal → closed → production. `cap sync` per
   release; version bumps in one place (`package.json` → native projects via a small script).

Sequencing recommendation: get a **TestFlight / Play-internal build out immediately after Phase 6** to
surface WebView issues early, but hold the **public** store launch until Phase 8 lands so the listing
can advertise a daily challenge and achievements rather than a bare eight-chapter run.

### 2.3 Risks

- App Store guideline 4.2 (minimum functionality) is aimed at wrapped websites; a game with offline
  play, haptics, and a share sheet is normally fine. Game Center leaderboards/achievements
  (community plugin `capacitor-game-connect`) would remove any doubt — optional.
- Two build entries means two places to break: add `build:native` to CI alongside `build` and a
  smoke test that the native bundle contains no `/_server` or router chunks.
- Lovable syncs the whole repo; `ios/` and `android/` add weight but nothing Lovable needs to touch.

---

## 3. Phase 8 — Replayability (before the public store launch) — **8.1–8.6 shipped 2026-09-15**

Shipped: `src/game/rng.ts` (mulberry32, FNV seed, IST day key), the `ENDLESS` chapter at
`ENDLESS_INDEX` with a speed ramp (`mechanics.ts`) and cycling sky (`render/sky.ts`), Today's Leap
(same seed per IST day, unlimited attempts, best-of-day in the save), 15 bilingual achievements
(`achievements.ts`, evaluated on game events, toasted, listed in Settings), per-chapter stats table,
and the share card (`share.ts`; image via Web Share files, else text+link, else clipboard; native
uses `@capacitor/share`). Modes unlock at `MODES_UNLOCK_AT = 4` (Lankini's gate) rather than on the
first win, so the daily is reachable earlier. **Not done:** 8.7 ghost replay — the flap log it needs
is the same one Phase 9's leaderboard verification needs, so both land together.

| #   | Item                                                                                                                             | Effort | Design notes                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | **Seeded PRNG** (`mulberry32`) behind `createWorld`'s existing `rng` parameter; production keeps `Math.random` for the story run | S      | Zero engine change; tests already inject rng                                                                                                                                                                              |
| 8.2 | **Endless mode — "अखंड उड़ान"**                                                                                                  | M      | One synthetic chapter with `goal: {kind: "endless"}`, a roster mixing every kind, and a `mechanics.ts` ramp (speed ↑, gap ↓ toward `gapMin`, sky cycling morning→night→dawn). Unlocks on first win                        |
| 8.3 | **Daily Leap**                                                                                                                   | S–M    | Endless mode with `seed = hash(YYYY-MM-DD, IST)`, one life, score = punya; local best per day in save; "share" card. Identical obstacle sequence for everyone that day                                                    |
| 8.4 | **Achievements** (~15)                                                                                                           | M      | e.g. Flawless chapter, Mainaka touched every time, Surasa cleared at minimum size, Simhika without a shadow pull, 100 leaps, 1 000 punya, all verses read. Emitted from engine events; stored in save v2; toast on unlock |
| 8.5 | **Stats & per-chapter bests**                                                                                                    | S      | Screen off Start: runs, leaps, deaths by chapter (this is also the offline version of the funnel)                                                                                                                         |
| 8.6 | **Share card**                                                                                                                   | S      | Canvas-drawn 1080×1080 card (chapter reached, punya, verse line) → Web Share API with files (mobile), download on desktop                                                                                                 |
| 8.7 | **Ghost replay**                                                                                                                 | M      | Record flap step indices per run; replay best run as a translucent Hanuman. Same log the leaderboard uses                                                                                                                 |

---

## 4. Phase 9 — Online (optional, needs a backend decision)

**Leaderboard with replay verification.** A submitted run is `{seed, vp:{w,h}, flaps: number[] /* step indices */, punya}`.
A TanStack Start server function re-runs `engine.step` with the same seed, viewport, and inputs and
rejects any mismatch — the deterministic engine makes this a few dozen lines and removes most cheating
without obfuscation. Store in Neon Postgres (`daily_scores(day, initials, punya, replay jsonb, created_at)`),
rate-limit by IP, and use **3-letter arcade initials** to sidestep name moderation. Runs that resized
mid-flight are flagged invalid client-side. Weekly and all-time boards fall out of the same table.

Effort: M. Depends on 8.1, 8.3, 8.7.

---

## 5. Phase 10 — Content and art — **the two chapters shipped 2026-09-15**

Shipped: **विभीषण मिलन** (index 5; `house` columns with a Tulsi/राम-marked door and painted decoy
doorways, rakshasa sentries; verses दोहा 5 · चौपाई 6.1 and intro चौपाई 5.8) and **वाटिका विध्वंस**
(index 7; `vriksha` trees are torn down for `SMASH_PUNYA` via a new `smash` collision result, `astra`
volleys with a narrower gap, and a `capture` finale where the Brahmastra binds Hanuman before Lanka
Dahan; verses चौपाई 18.1–18.2 and दोहा 19). All four verses were cross-checked against
drikpanchang.com and shrirammitramandal.com. Save v3 remaps chapter indices from the 8-chapter arc.
Remaining here: Madhuvan, Setu-bandh, the Verse Pothi, the art pass, music, kid mode.

New chapters in Tulsidas's order, each needing a verified verse (same cross-check process as
`verses.ts`, `verified: true` enforced by tests):

| Proposed chapter                                                          | Where it slots             | Mechanic                                                                                                                           |
| ------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **विभीषण मिलन** (Vibhishana's house)                                      | between Lankini and Vatika | Rows of rakshasa houses; only the one marked with Tulsi and Ram-naam is safe to pass through                                       |
| **वाटिका विध्वंस / ब्रह्मास्त्र** (garden smashing, Meghnad's Brahmastra) | between Vatika and Dahan   | Inverted rule: crashing into trees _scores_; dodge arrows; scripted capture at the end explains "captured and set alight" in Dahan |
| **मधुवन** (Madhuvan)                                                      | after the return crossing  | Relaxed collect-the-honey chapter with the vanaras — a breather before Ram                                                         |
| **सेतु बंध** (Nal–Nil's bridge)                                           | epilogue                   | Floating stones as platforms; could double as the endless-mode backdrop                                                            |

Also:

- **Verse Pothi (पोथी)** — a library of every verse seen, unlocked by chapter, with
  transliteration/meaning toggles and share; recitation audio only if the owner supplies recordings.
- **Art pass** — 3–4 frame flap animation, parallax sea/clouds, per-chapter backgrounds. Needs an
  artist or generated assets; procedural improvements can start without them.
- **Music** — synthesized tanpura drone + a pentatonic motif per chapter (keeps the zero-asset
  policy), with a separate "music" toggle in settings.
- **Kid-friendly difficulty** (wider gaps, slower Surasa) as a settings option rather than an
  automatic downgrade.

---

## 6. Decisions (made 2026-09-15 — owner delegated)

| #   | Question              | Decision                                                                                                                                                                                 | Rationale                                                                             |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Store presence        | **Yes — Capacitor (Phase 7), after Phase 6.** Native scaffolding can be prepared without accounts; store submission waits for the owner's Apple/Google developer accounts                | The web/PWA path is the base either way; the app is the main new reach                |
| 2   | Devices / orientation | **iPhone + iPad, free rotation**                                                                                                                                                         | The game already handles both orientations well; iPad landscape is the desktop layout |
| 3   | Online leaderboard    | **Local-only for now; Phase 9 is gated on telemetry showing retention**                                                                                                                  | Needs a Neon account and moderation policy; the daily challenge works offline first   |
| 4   | Analytics             | **Provider-agnostic `track()` in `src/lib/analytics.ts`, wired to Vercel Web Analytics** (page views on Hobby; custom events flow once on Pro). Swapping to PostHog is a one-file change | Vercel is already the host; no new account or key                                     |
| 5   | Art                   | **Procedural-only until an artist is available**; art pass stays in Phase 10                                                                                                             | Don't block shipping on assets                                                        |
| 6   | New chapters          | **Vibhishana (विभीषण मिलन) and Vatika-vidhvans/Brahmastra first**, Phase 10                                                                                                              | Most story-faithful; the second one also fixes the abrupt jump into Dahan             |
| 7   | Monetization          | **Free, no ads, no IAP**                                                                                                                                                                 | Devotional content; nothing in the roadmap depends on revenue                         |
| 8   | Bundle id             | **`app.hanumanleap`** (placeholder; change before the first store upload if the owner prefers)                                                                                           | Trivial to rename before publishing                                                   |

## 7. Suggested order

Phase 6 ✅ → Phase 7 to TestFlight/Play-internal (≈ 1 week; needs Xcode/Android Studio and the
developer accounts) → Phase 8 (≈ 1–2 weeks) → public store launch → Phase 9 and 10 as appetite and
telemetry dictate.

**Phase 7 is blocked on toolchains** (Xcode, Android Studio) and accounts; **Phase 8 and the two
Phase 10 chapters are shipped**. Next unblocked work: the Verse Pothi and synthesized music (Phase 10),
or Phase 9 once a Neon account exists.
