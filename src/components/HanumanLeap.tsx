import { Pause, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { loadAssets } from "@/game/assets";
import { playSfx, setMuted, unlockAudio } from "@/game/audio";
import { DEATH_COOLDOWN_MS, MAX_DT, MAX_SUBSTEPS, STEP } from "@/game/constants";
import { createWorld, resizeWorld, step } from "@/game/engine";
import { render } from "@/game/render";
import { stageAt } from "@/game/stages";
import { loadSave, saveGame } from "@/game/storage";
import type { Assets, GameEvent, Viewport, World } from "@/game/types";
import { applyViewport, computeViewport, DEFAULT_VIEWPORT } from "@/game/viewport";
import { cn } from "@/lib/utils";

type GameState = "ready" | "playing" | "over";

export default function HanumanLeap() {
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

  const [state, setState] = useState<GameState>("ready");
  const [paused, setPaused] = useState(false);
  const [leaps, setLeaps] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  /** CSS size of the canvas box once the container has been measured. */
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  stateRef.current = state;
  pausedRef.current = paused;

  const drawFrame = useCallback(() => {
    const ctx = ctxRef.current;
    const assets = assetsRef.current;
    if (!ctx || !assets) return;
    render(ctx, worldRef.current, vpRef.current, assets);
  }, []);

  const startRun = useCallback(() => {
    worldRef.current = createWorld(vpRef.current);
    pendingFlapRef.current = false;
    setLeaps(0);
    setScore(0);
    setLevel(0);
    setPaused(false);
    setCanContinue(false);
    setState("playing");
  }, []);

  const requestFlap = useCallback(() => {
    unlockAudio();
    if (pausedRef.current) return;
    const s = stateRef.current;
    if (s === "playing") {
      pendingFlapRef.current = true;
      playSfx("flap");
      return;
    }
    if (s === "over" && performance.now() - overAtRef.current < DEATH_COOLDOWN_MS) return;
    startRun();
  }, [startRun]);

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

  // Persisted values are read on the client only, after hydration.
  useEffect(() => {
    const save = loadSave();
    bestRef.current = save.best;
    mutedRef.current = save.muted;
    setBest(save.best);
    setMutedState(save.muted);
    setMuted(save.muted);
    // The world starts idle behind the "ready" overlay.
    worldRef.current.running = false;
  }, []);

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
      drawFrame();
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
        if (ev.type === "pass") {
          setLeaps(ev.leaps);
          setScore(ev.score);
          setLevel(ev.level);
          playSfx("pass");
        } else {
          overAtRef.current = now;
          setCanContinue(false);
          setState("over");
          playSfx("hit");
          if (ev.score > bestRef.current) {
            bestRef.current = ev.score;
            setBest(ev.score);
            saveGame({ best: ev.score });
          }
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

      drawFrame();
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [drawFrame]);

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

  const stage = stageAt(level);
  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();

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

        {/* HUD */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2 sm:left-4 sm:top-4">
          <div className="rounded-full bg-background/70 px-3 py-1 text-sm font-semibold text-foreground backdrop-blur sm:px-4 sm:py-1.5">
            Punya {score}
          </div>
          <div className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur sm:px-4 sm:py-1.5">
            Leaps {leaps}
          </div>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-background/70 px-3 py-1 text-sm font-semibold text-foreground backdrop-blur sm:px-4 sm:py-1.5">
              Best {best}
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label={muted ? "Unmute" : "Mute"}
              className="pointer-events-auto h-8 w-8 rounded-full bg-background/70 backdrop-blur"
              onPointerDown={stopPointer}
              onClick={toggleMute}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
            {state === "playing" && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Pause"
                className="pointer-events-auto h-8 w-8 rounded-full bg-background/70 backdrop-blur"
                onPointerDown={stopPointer}
                onClick={togglePause}
              >
                <Pause />
              </Button>
            )}
          </div>
          <div className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur sm:px-4 sm:py-1.5">
            Level {level + 1} · {stage.name}
          </div>
        </div>

        {state === "playing" && !paused && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[85%] -translate-x-1/2 rounded-full bg-background/70 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur sm:bottom-4">
            {stage.line}
          </div>
        )}

        {/* Pause menu */}
        {state === "playing" && paused && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/70 px-6 text-center backdrop-blur-sm"
            onPointerDown={stopPointer}
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Paused</h2>
            <div className="flex gap-2">
              <Button size="lg" onClick={() => setPaused(false)}>
                Resume
              </Button>
              <Button size="lg" variant="outline" onClick={startRun}>
                Restart
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={muted} onCheckedChange={toggleMute} /> Mute sounds
            </label>
            <p className="text-xs text-muted-foreground">P or Esc to resume · M to mute</p>
          </div>
        )}

        {/* Start / game-over */}
        {state !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {state === "ready" ? "Hanuman's Leap — Sundara Kanda" : "The leap ended"}
            </h2>
            <p className="max-w-lg text-sm text-muted-foreground">
              {state === "ready"
                ? "Bearing Lord Ram's ring for Sita Maa, spring from Mahendra Parvata across the hundred yojanas of sea. Honour Mainaka, outwit Surasa, tear past Simhika, and break through the rakshasa sentries and Lankini at Lanka's gate."
                : `Punya ${score} over ${leaps} leap${leaps === 1 ? "" : "s"} — you reached Level ${level + 1}, ${stage.name}. The ring is still in your hand.`}
            </p>
            <Button
              size="lg"
              className="mt-2 rounded-full px-7 shadow-lg transition-transform hover:scale-105"
              onPointerDown={stopPointer}
              onClick={startRun}
            >
              {state === "ready" ? "Begin the leap" : "Leap again"}
            </Button>
            <p
              className={cn(
                "text-xs text-muted-foreground transition-opacity duration-300",
                state === "over" && !canContinue ? "opacity-0" : "opacity-100",
              )}
            >
              Space or tap to {state === "ready" ? "begin" : "leap again"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
