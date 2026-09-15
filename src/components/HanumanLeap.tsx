import { useCallback, useEffect, useRef, useState } from "react";
import { loadAssets } from "@/game/assets";
import { playSfx, setAmbience, setMuted, unlockAudio } from "@/game/audio";
import { chapterAt, LAST_CHAPTER } from "@/game/chapters";
import { DEATH_COOLDOWN_MS, MAX_DT, MAX_SUBSTEPS, STEP } from "@/game/constants";
import { createWorld, resizeWorld, retryChapter, startChapter, step } from "@/game/engine";
import { SURASA_SHRINK } from "@/game/obstacles/registry";
import { burst, createFx, flapFx, hitFx, updateFx, wipeFx } from "@/game/fx";
import { render } from "@/game/render";
import { sceneHeroX } from "@/game/render/scene";
import { loadSave, saveGame } from "@/game/storage";
import type { Assets, GameEvent, Viewport, World } from "@/game/types";
import { applyViewport, computeViewport, DEFAULT_VIEWPORT } from "@/game/viewport";
import { cn } from "@/lib/utils";
import { Hud } from "./game/Hud";
import {
  ChapterClear,
  ChapterIntro,
  GameOver,
  PauseMenu,
  StartScreen,
  WinScreen,
} from "./game/Screens";

type GameState = "ready" | "intro" | "playing" | "chapterClear" | "over" | "won";

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
  const overAtRef = useRef(0);
  const bestRef = useRef(0);
  const mutedRef = useRef(false);
  const fxRef = useRef(createFx());
  const lastScaleRef = useRef(1);

  const [state, setState] = useState<GameState>("ready");
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [passes, setPasses] = useState(0);
  const [punya, setPunya] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [best, setBest] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  /** CSS size of the canvas box once the container has been measured. */
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  stateRef.current = state;
  pausedRef.current = paused;

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

  /** Go to a chapter's intro card. `fresh` starts a brand-new run. */
  const goToChapter = useCallback(
    (index: number, fresh: boolean) => {
      if (fresh) worldRef.current = createWorld(vpRef.current);
      startChapter(worldRef.current, index, vpRef.current);
      pendingFlapRef.current = false;
      wipeFx(fxRef.current);
      setPaused(false);
      setCanContinue(false);
      syncHud();
      setState("intro");
    },
    [syncHud],
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
    pendingFlapRef.current = false;
    setPaused(false);
    setCanContinue(false);
    syncHud();
    setState("intro");
  }, [syncHud]);

  const toChapters = useCallback(() => {
    worldRef.current = createWorld(vpRef.current);
    setPaused(false);
    syncHud();
    setState("ready");
  }, [syncHud]);

  const requestFlap = useCallback(() => {
    unlockAudio();
    if (pausedRef.current) return;
    switch (stateRef.current) {
      case "playing":
        if (worldRef.current.phase !== "run") return; // finale: hands off
        pendingFlapRef.current = true;
        flapFx(fxRef.current, vpRef.current.heroX, worldRef.current.y);
        playSfx("flap");
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
  }, [beginPlay, goToChapter, retry]);

  const togglePause = useCallback(() => {
    if (stateRef.current !== "playing") return;
    setPaused((p) => !p);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMutedState(next);
    setMuted(next);
    saveGame({ muted: next });
  }, []);

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
    setBest(save.best);
    setUnlocked(save.unlockedChapter);
    setMutedState(save.muted);
    setMuted(save.muted);
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
        switch (ev.type) {
          case "pass":
            setPasses(ev.passes);
            setPunya(ev.punya);
            playSfx("pass");
            break;
          case "collect":
            setPunya(ev.punya);
            burst(fxRef.current, "sparkle", vpRef.current.heroX, worldRef.current.y, 18);
            playSfx("collect");
            break;
          case "hit":
            hitFx(fxRef.current);
            overAtRef.current = now;
            setCanContinue(false);
            setDeaths(worldRef.current.deaths);
            recordBest(ev.punya);
            setState("over");
            playSfx("hit");
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
            setState("chapterClear");
            playSfx("chapter");
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
            setState("won");
            playSfx("win");
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
  }, [drawFrame, recordBest]);

  // Keyboard: flap / pause / mute. Ignore auto-repeat and anything typed into a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
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

  return (
    <div ref={containerRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
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
            muted={muted}
            showPause={state === "playing"}
            onMute={toggleMute}
            onPause={togglePause}
          />
        )}

        {state === "playing" && !paused && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[85%] -translate-x-1/2 rounded-full bg-background/70 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur sm:bottom-4">
            {ch.caption}
          </div>
        )}

        {state === "playing" && paused && (
          <PauseMenu
            muted={muted}
            onResume={() => setPaused(false)}
            onRestart={retry}
            onChapters={toChapters}
            onMute={toggleMute}
          />
        )}
        {state === "ready" && (
          <StartScreen
            unlocked={unlocked}
            onStart={() => goToChapter(0, true)}
            onSelect={(i) => goToChapter(i, true)}
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
      </div>
    </div>
  );
}
