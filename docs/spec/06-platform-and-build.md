# 06 — Web app, PWA/offline, Vercel, native shell, scripts, environment

## Web app (TanStack Start)

- `src/routes/__root.tsx`: `<html lang="en">` shell, meta/OG tags (absolute `og:image` on the
  Vercel domain), manifest + icons links, `QueryClientProvider`, 404 and error components
  (Lovable error reporting). Root effect: `initAnalytics()`, `registerServiceWorker()`, tracks
  `appinstalled`.
- `src/routes/index.tsx`: the only page; `validateSearch` accepts `?chapter=n` (integer ≥ 0,
  clamped to the arc by the shell). Wraps the game in `LangProvider`.
- `src/router.tsx` (router + QueryClient), `src/start.ts` (error + CSRF middleware),
  `src/server.ts` (SSR entry wrapper that turns h3-swallowed 500s into the Lovable error page).
- `routeTree.gen.ts` is generated — don't edit. Don't add `src/pages/` or Next-style layouts
  (`src/routes/README.md`).
- Hosting: Vercel (`.vercel` ignored). Nitro preset defaults to cloudflare in the Lovable config;
  Vercel builds work via the platform. Local prod check:
  `NITRO_PRESET=node-server bun run build && PORT=8092 node .output/server/index.mjs`.

## PWA / offline

- `public/manifest.webmanifest`: standalone, `orientation: any`, theme `#e07c28`, bg `#0d4a57`,
  192/512/maskable icons. `apple-touch-icon` 180.
- `public/sw.js` (hand-written, no vite-plugin-pwa): registered from `src/lib/sw.ts` **in
  production only** as `/sw.js?v=<__BUILD_ID__>` so every deploy is a new worker. Caches
  `shell-<v>` (`/`, manifest, icons) and `assets-<v>` (hashed `/assets/*`). On install it fetches
  `/`, scans the HTML and its CSS for `/assets/...` URLs and precaches them, so one online visit
  enables offline play. Fetch strategy: navigations network-first with a 4 s timeout → cached shell;
  `/assets/*` cache-first; static/icons stale-while-revalidate; cross-origin and non-GET untouched.
  Activate deletes other versions' caches. Tested in a `vm` sandbox (`src/lib/__tests__/sw.test.ts`)
  because the embedded browser can't install workers.
- `__BUILD_ID__` is defined in `vite.config.ts` (Vercel sha → git sha → timestamp) and declared in
  `src/env.d.ts`.

## Native shell (Capacitor 8) — scaffolded, never compiled here

- `capacitor.config.ts`: `appId app.hanumanleap` (placeholder, rename before first upload),
  `appName "Hanuman's Leap"`, `webDir dist-native`, iOS `contentInset never`, splash
  `launchAutoHide: false` (the game hides it on first frame), status bar overlay/light.
- Entry: `native/index.html` → `src/native/main.tsx` → `installCapacitor()` then mount `NativeApp`
  (mount happens even if the plugin wiring rejects).
- `src/platform/index.ts` — the seam: `Platform {isNative, onBackButton, exitApp, ready, share}`
  with web no-op defaults; `installPlatform(partial)`. Game code imports **only** this module.
- `src/platform/capacitor.ts` — on a native platform: restore the save from `Preferences` and
  mirror every write; haptics via `Haptics` (notification/impact per `HapticName`); status bar
  overlay + light; Android back button dispatched to the top-most registered handler (`"exit"` →
  `App.exitApp()`); `ready` hides the splash; `share` uses the native sheet.
- Generated projects: `ios/App` (SPM package `CapApp-SPM`, no CocoaPods), `android/` (Gradle);
  icons/splash generated from `assets/` with `@capacitor/assets`. Both are committed.
- Scripts: `build:native`, `cap:sync` (build + `cap sync`), `cap:ios`, `cap:android`.
- Blocked on this Mac: no Xcode, CocoaPods, Android Studio, or JDK. Remaining steps (roadmap §2.2
  5–8) need the owner's machine and Apple/Google accounts; test list: safe-area under the notch,
  haptics on hit, Android back, rotation mid-run, audio after first tap, splash hides.

## Scripts (`package.json`)

`dev` · `build` · `build:dev` · `preview` (broken with nitro output) · `lint` · `test` (vitest) ·
`format` · `build:native` · `cap:sync` · `cap:ios` · `cap:android`. `bun test` (Bun's runner) also
happens to work on the vitest files, but `bun run test` is canonical.

## Config files

- `vite.config.ts` — Lovable wrapper; only adds `server.entry` and `__BUILD_ID__`. **Do not** add
  React/Tailwind/tsconfig-paths/nitro plugins here (duplicates break the app).
- `vite.native.config.ts` — independent SPA config (react, tailwind, `@` alias, `base ./`).
- `vitest.config.ts` — independent (node env, `@` alias, `src/**/*.test.ts`).
- `eslint.config.js` — ignores `dist, dist-native, .output, .vinxi, ios, android, assets`
  (ESLint hangs without the native dirs ignored). `no-unused-vars` off; react-refresh warnings tolerated.
- `tsconfig.json` — strict flags listed in 00; includes `src/**`, `vite.config.ts`, `eslint.config.js`.
- `.claude/launch.json` — `hanuman-leap` = `bun run dev` on 8080 (the main checkout usually owns
  8080; worktrees should use `--port 8091`).
- `bunfig.toml`, `.prettierrc` (printWidth 100), `components.json` (shadcn).

## Git / process

- Remote `origin` → GitHub `njrankitsam11-gif/hanuman-leap`, default branch `main`, Lovable-connected:
  **no history rewriting** on pushed commits (`AGENTS.md`).
- Work branches: `claude/<topic>-<hash>` in `.claude/worktrees/`. As of 2026-09-16 the feature
  branch `claude/next-phase-mobile-planning-178c16` (Phases 6–8, 10) is 17 commits ahead of `main`
  and unmerged/unpushed; `claude/codebase-spec-files-c279b8` was fast-forwarded onto it and adds
  these specs.
- Commit messages: imperative summary, optional body; end with the Co-Authored-By line the
  session provides.

## Environment gotchas (verified on this Mac / desktop app)

- Browser pane: rAF throttled when hidden (game loop can't be observed live); no service-worker
  registration; static frames and overlays screenshot fine.
- `preview_start` may not launch `bun run dev`; run in background via Bash and `navigate`.
- Port 8080 is usually taken by the main checkout; use `bun run dev -- --port 8091`.
- `cwebp` broken (libtiff) → use `sharp` from the scratchpad.
- WebFetch summarises pages and refuses verbatim verse text → `curl` + grep raw HTML.
