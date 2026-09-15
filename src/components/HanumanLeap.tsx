import { useCallback, useEffect, useRef, useState } from "react";
import { loadAssets } from "@/game/assets";
import { H, MAX_DT, W } from "@/game/constants";
import { createWorld, step } from "@/game/engine";
import { render } from "@/game/render";
import { stageAt } from "@/game/stages";
import type { Viewport } from "@/game/types";

type GameState = "ready" | "playing" | "over";

/** Phase 0: fixed logical viewport. Phase 1 derives this from the container. */
const VP: Viewport = { w: W, h: H, dpr: 1 };

export default function HanumanLeap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<GameState>("ready");
  const [leaps, setLeaps] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);

  // Mutable per-frame state lives in refs; React state only changes on discrete events.
  const worldRef = useRef(createWorld(VP));
  const pendingFlapRef = useRef(false);
  const stateRef = useRef<GameState>("ready");
  stateRef.current = state;

  const startRun = useCallback(() => {
    worldRef.current = createWorld(VP);
    pendingFlapRef.current = false;
    setLeaps(0);
    setScore(0);
    setLevel(0);
    setState("playing");
  }, []);

  const requestFlap = useCallback(() => {
    if (stateRef.current === "playing") {
      pendingFlapRef.current = true;
    } else {
      startRun();
    }
  }, [startRun]);

  useEffect(() => {
    // The world starts idle behind the "ready" overlay.
    worldRef.current.running = false;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        requestFlap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestFlap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const assets = loadAssets();
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;

      const world = worldRef.current;
      const events = step(world, { flap: pendingFlapRef.current }, dt, VP);
      pendingFlapRef.current = false;

      for (const ev of events) {
        if (ev.type === "pass") {
          setLeaps(ev.leaps);
          setScore(ev.score);
          setLevel(ev.level);
        } else {
          setState("over");
          setBest((b) => Math.max(b, ev.score));
        }
      }

      render(ctx, world, VP, assets);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stage = stageAt(level);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        className="relative w-full max-w-[900px] overflow-hidden rounded-2xl border border-border shadow-2xl"
        onPointerDown={(e) => {
          e.preventDefault();
          requestFlap();
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full touch-none select-none"
        />

        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
          <div className="rounded-full bg-background/70 px-4 py-1.5 text-sm font-semibold text-foreground backdrop-blur">
            Punya score: {score}
          </div>
          <div className="rounded-full bg-background/70 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            Leaps cleared: {leaps}
          </div>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2">
          <div className="rounded-full bg-background/70 px-4 py-1.5 text-sm font-semibold text-foreground backdrop-blur">
            Best: {best}
          </div>
          <div className="rounded-full bg-background/70 px-4 py-1.5 text-xs font-medium text-foreground backdrop-blur">
            Level {level + 1} · {stage.name}
          </div>
        </div>

        {state === "playing" && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-[80%] -translate-x-1/2 rounded-full bg-background/70 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur">
            {stage.line}
          </div>
        )}

        {state !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 text-center backdrop-blur-sm">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {state === "ready" ? "Hanuman's Leap — Sundara Kanda" : "The leap ended"}
            </h2>
            <p className="max-w-lg text-sm text-muted-foreground">
              {state === "ready"
                ? "Bearing Lord Ram's ring for Sita Maa, spring from Mahendra Parvata across the hundred yojanas of sea. Honour Mainaka, outwit Surasa, tear past Simhika, and break through the rakshasa sentries and Lankini at Lanka's gate."
                : `Punya score ${score} over ${leaps} leap${leaps === 1 ? "" : "s"} — you reached Level ${level + 1}, ${stage.name}. The ring is still in your hand. Leap again.`}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRun();
              }}
              className="mt-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
            >
              {state === "ready" ? "Begin the leap" : "Leap again"}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Space / tap to rise · five levels, from Mahendra Parvata to the shores of Lanka · rakshasas
        are worth extra punya
      </p>
    </div>
  );
}
