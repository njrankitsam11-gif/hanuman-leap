import { useCallback, useEffect, useRef, useState } from "react";
import { loadAssets } from "@/game/assets";
import { playSfx, setAmbience, setMuted, unlockAudio } from "@/game/audio";
import { chapterAt, LAST_CHAPTER } from "@/game/chapters";
import { DEATH_COOLDOWN_MS, MAX_DT, MAX_SUBSTEPS, STEP } from "@/game/constants";
import { createWorld, resizeWorld, retryChapter, startChapter, step } from "@/game/engine";
import { SURASA_SHRINK } from "@/game/obstacles/registry";
import { burst, createFx, flapFx, hitFx, updateFx, wipeFx } from "@/game/fx";
import { haptic, hapticsSupported, setHapticsEnabled } from "@/game/haptics";
import { render } from "@/game/render";
import { sceneHeroX } from "@/game/render/scene";
import {
  bumpChapter,
  DEFAULT_STATS,
  loadSave,
  resetProgress,
  saveGame,
  updateStats,
  type Stats,
} from "@/game/storage";
import type { Assets, GameEvent, Viewport, World } from "@/game/types";
import { applyViewport, computeViewport, DEFAULT_VIEWPORT } from "@/game/viewport";
import { pick, useLang } from "@/i18n";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Hud } from "./game/Hud";
import {
  ChapterClear,
  ChapterIntro,
  FirstRunHint,
  GameOver,
  PauseMenu,
  StartScreen,
  WinScreen,
} from "./game/Screens";
import { SettingsSheet, type Settings } from "./game/SettingsSheet";

type GameState = "ready" | "intro" | "playing" | "chapterClear" | "over" | "won";

/** Flaps before the first-run hint gives up on its own. */
const HINT_FLAPS = 3;

export default function HanumanLeap({ initialChapter }: { initialChapter?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const assetsRef = useRef<Assets | null>(null);

  // Mutable per-frame state lives in refs; React state only changes on discrete events.
  const vpRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  const worldRef = useRef<World>(createWorld(DEFAULT_VIEWPORT));
  const pendingFlapRef = useRef(false);
  const stateRef = useRef<GameState>("ready");
  const pausedRef = useRef(false);
  const settingsOpenRef = useRef(false);
  const overAtRef = useRef(0);
  const bestRef = useRef(0);
  const mutedRef = useRef(false);
  const easyRef = useRef(false);
  const langRef = useRef<"hi" | "en">("en");
  const hintedRef = useRef(true);
  const hintFlapsRef = useRef(0);
  /** Passes not yet folded into the persisted stats; flushed on death, clear, and win. */
  const unflushedLeapsRef = useRef(0);
  const fxRef = useRef(createFx());
  const lastScaleRef = useRef(1);

  const { lang } = useLang();
  langRef.current = lang;
  const [state, setState] = useState<GameState>("ready");
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [passes, setPasses] = useState(0);
  const [punya, setPunya] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [best, setBest] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [settings, setSettings] = useState<Settings>({ muted: false, haptics: true, easy: false });
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [hapticsAvailable, setHapticsAvailable] = useState(false);
  const [hinted, setHinted] = useState(true);
  const [hintFlaps, setHintFlaps] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  /** CSS size of the canvas box once the container has been measured. */
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  stateRef.current = state;
  pausedRef.current = paused;
  settingsOpenRef.current = settingsOpen;

  const drawFrame = useCallback((now: number) => {
    const ctx = ctxRef.current;
    const assets = assetsRef.current;
    if (!ctx || !assets) return;
    const s = stateRef.current;
    render(ctx, worldRef.current, vpRef.current, assets, {
      now,
      idle: s === "ready" || s === "intro",
      fx: fxRef.current,
    });
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    setChapter(w.chapter);
    setPasses(w.passes);
    setPunya(w.punya);
    setDeaths(w.deaths);
  }, []);

  const recordBest = useCallback((value: number) => {
    if (value <= bestRef.current) return;
    bestRef.current = value;
    setBest(value);
    saveGame({ best: value });
  }, []);

  const markHinted = useCallback(() => {
    if (hintedRef.current) return;
    hintedRef.current = true;
    setHinted(true);
    saveGame({ hinted: true });
  }, []);

  /** Fold buffered passes plus one more change into the stored stats. */
  const commitStats = useCallback((fn: (s: Stats) => Stats) => {
    const leaps = unflushedLeapsRef.current;
    unflushedLeapsRef.current = 0;
    const next = updateStats((s) => fn({ ...s, leaps: s.leaps + leaps }));
    setStats(next.stats);
  }, []);

  /** Go to a chapter's intro card. `fresh` starts a brand-new run. */
  const goToChapter = useCallback(
    (index: number, fresh: boolean) => {
      if (fresh) {
        worldRef.current = createWorld(vpRef.current);
        commitStats((s) => ({ ...s, runs: s.runs + 1 }));
        track({
          name: "run_start",
          chapter: index,
          fresh,
          easy: easyRef.current,
          lang: langRef.current,
        });
      }
      worldRef.current.easy = easyRef.current;
      startChapter(worldRef.current, index, vpRef.current);
      track({ name: "chapter_start", chapter: index });
      pendingFlapRef.current = false;
      wipeFx(fxRef.current);
      setPaused(false);
      setCanContinue(false);
      syncHud();
      setState("intro");
    },
    [commitStats, syncHud],
  );

  const beginPlay = useCallback(() => {
    worldRef.current.running = true;
    pendingFlapRef.current = true;
    flapFx(fxRef.current, vpRef.current.heroX, worldRef.current.y);
    playSfx("flap");
    setState("playing");
  }, []);

  const retry = useCallback(() => {
    retryChapter(worldRef.current, vpRef.current);
    track({ name: "chapter_start", chapter: worldRef.current.chapter });
    pendingFlapRef.current = false;
    setPaused(false);
    setCanContinue(false);
    syncHud();
    setState("intro");
  }, [syncHud]);

  const toChapters = useCallback(() => {
    worldRef.current = createWorld(vpRef.current);
    worldRef.current.easy = easyRef.current;
    setPaused(false);
    syncHud();
    setState("ready");
  }, [syncHud]);

  const requestFlap = useCallback(() => {
    unlockAudio();
    if (pausedRef.current || settingsOpenRef.current) return;
    switch (stateRef.current) {
      case "playing":
        if (worldRef.current.phase !== "run") return; // finale: hands off
        pendingFlapRef.current = true;
        flapFx(fxRef.current, vpRef.current.heroX, worldRef.current.y);
        playSfx("flap");
        if (!hintedRef.current) {
          hintFlapsRef.current += 1;
          setHintFlaps(hintFlapsRef.current);
          if (hintFlapsRef.current >= HINT_FLAPS) markHinted();
        }
        return;
      case "intro":
        beginPlay();
        return;
      case "ready":
        goToChapter(0, true);
        return;
      case "over":
        if (performance.now() - overAtRef.current >= DEATH_COOLDOWN_MS) retry();
        return;
      default:
        return; // chapterClear / won: use the buttons
    }
  }, [beginPlay, goToChapter, markHinted, retry]);

  const togglePause = useCallback(() => {
    if (stateRef.current !== "playing") return;
    setPaused((p) => !p);
  }, []);

  const applyMuted = useCallback((next: boolean) => {
    mutedRef.current = next;
    setSettings((s) => ({ ...s, muted: next }));
    setMuted(next);
    saveGame({ muted: next });
  }, []);

  const toggleMute = useCallback(() => {
    applyMuted(!mutedRef.current);
    track({ name: "settings", key: "muted", value: String(!mutedRef.current) });
  }, [applyMuted]);

  const changeSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (patch.muted !== undefined) {
        applyMuted(patch.muted);
        track({ name: "settings", key: "muted", value: String(patch.muted) });
      }
      if (patch.haptics !== undefined) {
        setHapticsEnabled(patch.haptics);
        setSettings((s) => ({ ...s, haptics: patch.haptics! }));
        saveGame({ haptics: patch.haptics });
        if (patch.haptics) haptic("collect");
        track({ name: "settings", key: "haptics", value: String(patch.haptics) });
      }
      if (patch.easy !== undefined) {
        easyRef.current = patch.easy;
        worldRef.current.easy = patch.easy; // future spawns only; columns on screen stay put
        setSettings((s) => ({ ...s, easy: patch.easy! }));
        saveGame({ easy: patch.easy });
        track({ name: "settings", key: "easy", value: String(patch.easy) });
      }
    },
    [applyMuted],
  );

  const eraseProgress = useCallback(() => {
    const next = resetProgress();
    bestRef.current = 0;
    hintedRef.current = false;
    hintFlapsRef.current = 0;
    unflushedLeapsRef.current = 0;
    setBest(0);
    setUnlocked(0);
    setStats(next.stats);
    setHinted(false);
    setHintFlaps(0);
    setSettingsOpen(false);
    toChapters();
  }, [toChapters]);

  // Honour prefers-reduced-motion for shake and wipes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      fxRef.current.reducedMotion = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Fire ambience only while actually playing Lanka Dahan.
  useEffect(() => {
    const fire = state === "playing" && !paused && chapterAt(chapter).sky === "fire";
    setAmbience(fire ? "fire" : null);
  }, [state, paused, chapter]);

  // Persisted values are read on the client only, after hydration.
  useEffect(() => {
    const save = loadSave();
    bestRef.current = save.best;
    mutedRef.current = save.muted;
    easyRef.current = save.easy;
    hintedRef.current = save.hinted;
    worldRef.current.easy = save.easy;
    setBest(save.best);
    setUnlocked(save.unlockedChapter);
    setSettings({ muted: save.muted, haptics: save.haptics, easy: save.easy });
    setStats(save.stats);
    setHinted(save.hinted);
    setMuted(save.muted);
    setHapticsEnabled(save.haptics);
    setHapticsAvailable(hapticsSupported());
    if (initialChapter !== undefined) {
      goToChapter(Math.max(0, Math.min(LAST_CHAPTER, initialChapter)), true);
    }
  }, [initialChapter, goToChapter]);

  // Size the logical viewport from the container; re-run on resize and DPR change.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const apply = () => {
      const rect = container.getBoundingClientRect();
      const prev = vpRef.current;
      const next = computeViewport(rect.width, rect.height, window.devicePixelRatio, prev.portrait);
      if (
        next.w === prev.w &&
        next.h === prev.h &&
        next.dpr === prev.dpr &&
        next.cssW === prev.cssW &&
        next.cssH === prev.cssH
      ) {
        return;
      }
      resizeWorld(worldRef.current, prev, next);
      vpRef.current = next;
      applyViewport(canvas, ctx, next);
      setBox({ w: next.cssW, h: next.cssH });
      drawFrame(performance.now());
    };

    const ro = new ResizeObserver(apply);
    ro.observe(container);
    apply();

    let mq: MediaQueryList | null = null;
    const onDpr = () => {
      apply();
      watchDpr();
    };
    const watchDpr = () => {
      mq?.removeEventListener("change", onDpr);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onDpr);
    };
    watchDpr();

    return () => {
      ro.disconnect();
      mq?.removeEventListener("change", onDpr);
    };
  }, [drawFrame]);

  // Main loop: fixed-step simulation, render every animation frame.
  useEffect(() => {
    assetsRef.current = loadAssets();
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const dispatch = (events: GameEvent[], now: number) => {
      for (const ev of events) {
        const world = worldRef.current;
        switch (ev.type) {
          case "pass":
            setPasses(ev.passes);
            setPunya(ev.punya);
            unflushedLeapsRef.current += 1;
            markHinted();
            playSfx("pass");
            break;
          case "collect":
            setPunya(ev.punya);
            burst(fxRef.current, "sparkle", vpRef.current.heroX, world.y, 18);
            playSfx("collect");
            haptic("collect");
            break;
          case "hit":
            hitFx(fxRef.current);
            overAtRef.current = now;
            setCanContinue(false);
            setDeaths(world.deaths);
            recordBest(ev.punya);
            markHinted();
            commitStats((s) =>
              bumpChapter({ ...s, deaths: s.deaths + 1 }, world.chapter, "deaths"),
            );
            track({ name: "death", chapter: world.chapter, kind: ev.by, passes: world.passes });
            setState("over");
            playSfx("hit");
            haptic("hit");
            break;
          case "finale":
            break;
          case "chapterClear": {
            setPunya(ev.punya);
            recordBest(ev.punya);
            const next = ev.chapter + 1;
            setUnlocked((u) => {
              const nu = Math.max(u, next);
              if (nu !== u) saveGame({ unlockedChapter: nu });
              return nu;
            });
            commitStats((s) => bumpChapter(s, ev.chapter, "clears"));
            track({
              name: "chapter_clear",
              chapter: ev.chapter,
              deaths: world.deaths,
              punya: ev.punya,
            });
            setState("chapterClear");
            playSfx("chapter");
            haptic("chapter");
            break;
          }
          case "won":
            setPunya(ev.punya);
            setDeaths(ev.deaths);
            recordBest(ev.punya);
            setUnlocked((u) => {
              const nu = Math.max(u, LAST_CHAPTER);
              if (nu !== u) saveGame({ unlockedChapter: nu });
              return nu;
            });
            commitStats((s) =>
              bumpChapter(
                { ...s, wins: s.wins + 1, flawless: s.flawless + (ev.deaths === 0 ? 1 : 0) },
                world.chapter,
                "clears",
              ),
            );
            track({ name: "won", deaths: ev.deaths, punya: ev.punya, easy: world.easy });
            setState("won");
            playSfx("win");
            haptic("win");
            break;
        }
      }
    };

    const frame = (now: number) => {
      const wall = Math.min((now - last) / 1000, MAX_DT);
      last = now;

      if (pausedRef.current) {
        acc = 0;
      } else {
        acc += wall;
        const events: GameEvent[] = [];
        let n = 0;
        while (acc >= STEP && n < MAX_SUBSTEPS) {
          const flap = pendingFlapRef.current;
          pendingFlapRef.current = false;
          events.push(...step(worldRef.current, { flap }, STEP, vpRef.current));
          acc -= STEP;
          n++;
        }
        if (n === MAX_SUBSTEPS) acc = 0;
        if (events.length) dispatch(events, now);
      }

      const world = worldRef.current;
      const vp = vpRef.current;
      const ch = chapterAt(world.chapter);
      // Surasa: one cue the moment Hanuman shrinks to a thumb
      if (world.heroScale === SURASA_SHRINK && lastScaleRef.current !== SURASA_SHRINK) {
        playSfx("shrink");
      }
      lastScaleRef.current = world.heroScale;
      updateFx(fxRef.current, pausedRef.current ? 0 : wall, world, vp, {
        heroX: sceneHeroX(world, vp, ch),
        fireSky: ch.sky === "fire",
        running: world.running && !pausedRef.current,
      });
      drawFrame(now);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [commitStats, drawFrame, markHinted, recordBest]);

  // Keyboard: flap / pause / mute. Ignore auto-repeat, the settings sheet, and controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || settingsOpenRef.current) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        t.closest("input, textarea, select, button, [contenteditable=true]")
      ) {
        return;
      }
      switch (e.code) {
        case "Space":
        case "ArrowUp":
        case "Enter":
          e.preventDefault();
          requestFlap();
          break;
        case "KeyP":
        case "Escape":
          togglePause();
          break;
        case "KeyM":
          toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestFlap, togglePause, toggleMute]);

  // Pause when the tab is hidden or the window loses focus.
  useEffect(() => {
    const pauseIfPlaying = () => {
      if (stateRef.current === "playing") setPaused(true);
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pauseIfPlaying);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pauseIfPlaying);
    };
  }, []);

  // After a hit, hold the game-over screen briefly before a tap can restart.
  useEffect(() => {
    if (state !== "over") return;
    const t = setTimeout(() => setCanContinue(true), DEATH_COOLDOWN_MS);
    return () => clearTimeout(t);
  }, [state]);

  const ch = chapterAt(chapter);
  const showHint = state === "playing" && !paused && !hinted && hintFlaps < HINT_FLAPS;

  return (
    <div ref={containerRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        lang={lang}
        className={cn(
          "relative overflow-hidden bg-[#0d4a57] md:landscape:rounded-2xl md:landscape:border md:landscape:border-border md:landscape:shadow-2xl",
          !box && "aspect-[900/560] w-full max-w-[900px]",
        )}
        style={box ? { width: box.w, height: box.h } : undefined}
        onPointerDown={(e) => {
          e.preventDefault();
          requestFlap();
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full touch-none select-none" />

        {state !== "ready" && state !== "won" && (
          <Hud
            chapter={ch}
            chapterIndex={chapter}
            passes={passes}
            punya={punya}
            best={best}
            muted={settings.muted}
            showPause={state === "playing"}
            onMute={toggleMute}
            onPause={togglePause}
          />
        )}

        {showHint && <FirstRunHint />}

        {state === "playing" && !paused && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[85%] -translate-x-1/2 rounded-full bg-background/70 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur sm:bottom-4">
            {pick(lang, ch.caption)}
          </div>
        )}

        {state === "playing" && paused && (
          <PauseMenu
            onResume={() => setPaused(false)}
            onRestart={retry}
            onChapters={toChapters}
            onSettings={() => setSettingsOpen(true)}
          />
        )}
        {state === "ready" && (
          <StartScreen
            unlocked={unlocked}
            onStart={() => goToChapter(0, true)}
            onSelect={(i) => goToChapter(i, true)}
            onSettings={() => setSettingsOpen(true)}
          />
        )}
        {state === "intro" && <ChapterIntro chapter={ch} index={chapter} />}
        {state === "chapterClear" && (
          <ChapterClear
            chapter={ch}
            index={chapter}
            punya={punya}
            onContinue={() => goToChapter(chapter + 1, false)}
          />
        )}
        {state === "over" && (
          <GameOver
            chapter={ch}
            index={chapter}
            punya={punya}
            canContinue={canContinue}
            onRetry={retry}
            onChapters={toChapters}
          />
        )}
        {state === "won" && (
          <WinScreen
            chapter={ch}
            punya={punya}
            best={best}
            flawless={deaths === 0}
            onPlayAgain={() => goToChapter(0, true)}
            onChapters={toChapters}
          />
        )}

        <SettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          hapticsAvailable={hapticsAvailable}
          stats={stats}
          onChange={changeSettings}
          onReset={eraseProgress}
        />
      </div>
    </div>
  );
}
