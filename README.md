# Hanuman's Leap to Lanka

**Play it: https://hanuman-leap.vercel.app**

A one-tap flying game (Flappy Bird style) that retells the **Sundarkand** — Hanuman's
leap across the sea to find Sita, the burning of Lanka, and the return to Ram — in
eight chapters, each closing with a verse from Tulsidas's *Ramcharitmanas*.

## Play

- **Tap / click / Space / ↑ / Enter** — rise
- **P / Esc** — pause · **M** — mute
- Works in portrait on phones and landscape on desktop; installable as a PWA and
  playable offline after the first visit.
- **Settings** (gear on the start screen, or from Pause): sound, vibration,
  *Sahaj* mode (wider gaps, slower sea), Hindi / English UI, journey stats, reset.
- `?chapter=n` (0–7) opens a chapter directly.

## Chapters

| # | Chapter | What happens |
|---|---|---|
| 1 | जामवंत का उत्साह | Spring from Mahendra Parvata through the clouds |
| 2 | मैनाक का सत्कार | Mainaka rises to offer rest — touch the peak for punya |
| 3 | सुरसा की परीक्षा | Her mouth closes as you near; shrink to a thumb and slip through |
| 4 | सिंहिका की छाया | Her shadow drags you down; flap harder |
| 5 | लंकिनी का द्वार | Past the rakshasa sentries to the guardian of the gate |
| 6 | अशोक वाटिका | Thread the Ashoka trees; drop the ring to Sita |
| 7 | लंका दहन | Tail afire, leap the towers as Lanka burns |
| 8 | प्रभु मिलन | Carry the Chudamani home to Ram |

Punya is scored per obstacle (scaled by chapter), with bonuses for story beats,
chapter clears, finishing, and a flawless (no-death) run. Progress, settings, and
journey stats are saved in the browser (`storage.ts`, versioned with migrations).

## Languages

The UI, chapter prose, and verse meanings exist in Hindi and English
(`src/i18n/strings.ts`, `src/game/chapters`). The language defaults to the
browser's and can be switched in Settings. Verse text itself is always Devanagari.

## Verses

Verse text is from the Sundarkand of Tulsidas's *Ramcharitmanas* (Gita Press
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

### Layout

```
src/game/
  engine.ts         pure simulation: step(world, input, dt, viewport) → events
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
docs/ROADMAP.md     next phases and the mobile-app plan
```

Analytics events are anonymous (chapter indices, obstacle kinds, counts, UI
language) and respect Do-Not-Track. Custom events show up on Vercel's Pro plan;
page views on every plan.
