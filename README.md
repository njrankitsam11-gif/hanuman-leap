# Hanuman's Leap to Lanka

A one-tap flying game (Flappy Bird style) that retells the **Sundarkand** — Hanuman's
leap across the sea to find Sita, the burning of Lanka, and the return to Ram — in
eight chapters, each closing with a verse from Tulsidas's *Ramcharitmanas*.

## Play

- **Tap / click / Space / ↑ / Enter** — rise
- **P / Esc** — pause · **M** — mute
- Works in portrait on phones and landscape on desktop; installable as a PWA.
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
chapter clears, finishing, and a flawless (no-death) run. Progress and best score
are saved in the browser.

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
  chapters/         chapter data + verses
  obstacles/        per-kind behaviour hooks (Mainaka, Surasa, Simhika, Lankini …)
  mechanics.ts      per-chapter hooks (tail fire, mirrored return)
  render/           canvas drawing; never reads React state
  fx.ts             particles, flash, shake, wipe
  audio.ts          Web Audio synthesis (no audio files)
  viewport.ts       responsive/retina logical viewport
  storage.ts        localStorage save
src/components/     React shell, HUD and screens
```
