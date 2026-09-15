# Hanuman's Leap to Lanka

**Play it: https://hanuman-leap.vercel.app**

A one-tap flying game (Flappy Bird style) that retells the **Sundarkand** — Hanuman's
leap across the sea to find Sita, the burning of Lanka, and the return to Ram — in
ten chapters, each closing with a verse from Tulsidas's _Ramcharitmanas_.

## Play

- **Tap / click / Space / ↑ / Enter** — rise
- **P / Esc** — pause · **M** — mute
- Works in portrait on phones and landscape on desktop; installable as a PWA and
  playable offline after the first visit.
- **Settings** (gear on the start screen, or from Pause): sound, vibration,
  _Sahaj_ mode (wider gaps, slower sea), Hindi / English UI, journey stats, reset.
- `?chapter=n` (0–7) opens a chapter directly.

## Chapters

| #   | Chapter          | What happens                                                                           |
| --- | ---------------- | -------------------------------------------------------------------------------------- |
| 1   | जामवंत का उत्साह | Spring from Mahendra Parvata through the clouds                                        |
| 2   | मैनाक का सत्कार  | Mainaka rises to offer rest — touch the peak for punya                                 |
| 3   | सुरसा की परीक्षा | Her mouth closes as you near; shrink to a thumb and slip through                       |
| 4   | सिंहिका की छाया  | Her shadow drags you down; flap harder                                                 |
| 5   | लंकिनी का द्वार  | Past the rakshasa sentries to the guardian of the gate                                 |
| 6   | विभीषण मिलन      | Night streets of Lanka — only the door marked with Tulsi and राम is open               |
| 7   | अशोक वाटिका      | Thread the Ashoka trees; drop the ring to Sita                                         |
| 8   | वाटिका विध्वंस   | Tear down the trees for punya, dodge Meghnad's arrows — until the Brahmastra binds you |
| 9   | लंका दहन         | Tail afire, leap the towers as Lanka burns                                             |
| 10  | प्रभु मिलन       | Carry the Chudamani home to Ram                                                        |

Punya is scored per obstacle (scaled by chapter), with bonuses for story beats,
chapter clears, finishing, and a flawless (no-death) run. Progress, settings, and
journey stats are saved in the browser (`storage.ts`, versioned with migrations).

## Languages

The UI, chapter prose, and verse meanings exist in Hindi and English
(`src/i18n/strings.ts`, `src/game/chapters`). The language defaults to the
browser's and can be switched in Settings. Verse text itself is always Devanagari.

## Modes

- **Story** — the ten chapters above, with progress and best punya saved.
- **अखंड उड़ान · Endless Flight** — every obstacle kind returns on a random sea that
  speeds up with distance while the sky cycles through the day; score is punya.
- **आज की उड़ान · Today's Leap** — Endless with one seed per IST calendar day, so
  everyone flies the same sea today; best-of-day is saved locally.

Both unlock once Lankini's gate (chapter 5) is reachable. Seventeen achievements
(bilingual) are earned along the way and listed in Settings with a per-chapter
clears/falls table. Results can be shared as an image card (Web Share API), or as
text and a link where images aren't supported.

## Verses

Verse text is from the Sundarkand of Tulsidas's _Ramcharitmanas_ (Gita Press
edition numbering). Each entry in `src/game/chapters/verses.ts` carries a
`verified` flag; the test suite refuses unverified text. Transliteration is
IAST-style and meanings are short renderings, not literal glosses.

## Develop

```bash
bun install
bun run dev        # http://localhost:8080
bun test           # engine, mechanics, chapters/verses, render smoke tests
bun run build      # production build (TanStack Start + nitro)
bun run preview
```

### Mobile app (Capacitor)

The same game ships as an iOS/Android app through a second, plain-Vite entry
(`native/index.html` → `src/native/main.tsx`) with no router, SSR, or service
worker. `src/platform/` is the seam: the web build uses its defaults, the native
entry installs Capacitor implementations (haptics, back button, splash, a
Preferences mirror of the save). The web bundle never contains Capacitor.

```bash
bun run build:native   # dist-native/
bun run cap:sync       # build + copy into ios/ and android/
bun run cap:ios        # … and open Xcode        (needs Xcode + iOS platform)
bun run cap:android    # … and open Android Studio (needs Android Studio + a JDK)
```

Icons and splash screens are generated from `assets/` with
`bunx capacitor-assets generate --ios --android` (already committed). The bundle
id `app.hanumanleap` is a placeholder — rename in `capacitor.config.ts`,
`ios/App/App.xcodeproj`, and `android/app/build.gradle` before the first store
upload. Never commit a release keystore (`*.jks` / `*.keystore` are ignored).

### Layout

```
src/game/
  engine.ts         pure simulation: step(world, input, dt, viewport) → events
  rng.ts            mulberry32 + IST daily seed
  achievements.ts   achievement rules (pure)
  share.ts          share card + Web Share / clipboard
  chapters/         chapter data + verses (bilingual prose, Hindi भावार्थ)
  obstacles/        per-kind behaviour hooks (Mainaka, Surasa, Simhika, Lankini …)
  mechanics.ts      per-chapter hooks (tail fire, mirrored return)
  render/           canvas drawing; never reads React state
  fx.ts             particles, flash, shake, wipe
  audio.ts          Web Audio synthesis (no audio files)
  haptics.ts        vibration cues; backend swappable for the native build
  viewport.ts       responsive/retina logical viewport
  storage.ts        versioned localStorage save (v1 → v2 migration)
src/i18n/           en/hi strings, LangProvider, useT()
src/lib/analytics.ts  provider-agnostic track(); Vercel Web Analytics today
src/lib/sw.ts + public/sw.js  offline service worker (production only)
src/components/     React shell, HUD, screens, settings sheet
src/platform/       host seam (web defaults; capacitor.ts for the app)
src/native/         Capacitor entry + shell; vite.native.config.ts builds it
ios/, android/      generated Capacitor projects (commit them; web assets inside are ignored)
docs/ROADMAP.md     next phases and the mobile-app plan
```

Analytics events are anonymous (chapter indices, obstacle kinds, counts, UI
language) and respect Do-Not-Track. Custom events show up on Vercel's Pro plan;
page views on every plan.
