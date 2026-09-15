import { useCallback, useEffect, useRef, useState } from "react";
import hanumanSrc from "@/assets/hanuman.png";
import oceanSrc from "@/assets/ocean-bg.jpg";

type Kind = 0 | 1 | 2 | 3 | 4;

type Obstacle = {
  x: number;
  gapY: number;
  gapH: number;
  kind: Kind;
  passed: boolean;
  baseGapY: number;
  phase: number;
};

const W = 900;
const H = 560;
const GRAVITY = 1500;
const FLAP = -430;
const HERO_X = 170;
const HERO_R = 28;

/** Obstacles follow the order of the Sundara Kanda crossing. */
const KINDS = [
  { name: "Mainaka", top: "#8a5a2b", bottom: "#5a3617" },
  { name: "Surasa", top: "#7b2d4a", bottom: "#4a1529" },
  { name: "Simhika", top: "#2f5d63", bottom: "#163036" },
  { name: "Rakshasa", top: "#5b1620", bottom: "#2a070c" },
  { name: "Lankini", top: "#4a2a6b", bottom: "#1f0f33" },
] as const;

/** Five stages of the Sundara Kanda leap. */
const STAGES = [
  {
    name: "Mahendra Parvata",
    line: "Hanuman swells in size and springs from the mountain toward the sea.",
    speed: 210,
    spawn: 1.7,
    gap: 220,
    kinds: [0, 0, 1] as Kind[],
  },
  {
    name: "Sagara's Waters",
    line: "Mainaka rises to offer rest; Hanuman touches it in respect and flies on.",
    speed: 235,
    spawn: 1.55,
    gap: 205,
    kinds: [0, 1, 1] as Kind[],
  },
  {
    name: "Surasa's Mouth",
    line: "Mother of serpents bars the way — grow vast, then shrink to a thumb and slip through.",
    speed: 255,
    spawn: 1.45,
    gap: 190,
    kinds: [1, 1, 2] as Kind[],
  },
  {
    name: "Simhika's Shadow",
    line: "The shadow-seizer drags him down; he tears through her and rises again.",
    speed: 275,
    spawn: 1.35,
    gap: 178,
    kinds: [2, 2, 3] as Kind[],
  },
  {
    name: "Shores of Lanka",
    line: "Rakshasa sentries patrol the ramparts and Lankini guards the golden gate.",
    speed: 300,
    spawn: 1.2,
    gap: 168,
    kinds: [3, 3, 4] as Kind[],
  },
] as const;

const stageFor = (leaps: number) => Math.min(STAGES.length - 1, Math.floor(leaps / 5));

export default function HanumanLeap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"ready" | "playing" | "over">("ready");
  const [leaps, setLeaps] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);

  const world = useRef({
    y: H / 2,
    vy: 0,
    t: 0,
    scroll: 0,
    obstacles: [] as Obstacle[],
    leaps: 0,
    score: 0,
    level: 0,
    running: false,
  });

  const reset = useCallback(() => {
    world.current = {
      y: H / 2,
      vy: 0,
      t: 0,
      scroll: 0,
      obstacles: [],
      leaps: 0,
      score: 0,
      level: 0,
      running: true,
    };
    setLeaps(0);
    setScore(0);
    setLevel(0);
    setState("playing");
  }, []);

  const flap = useCallback(() => {
    if (state === "playing") {
      world.current.vy = FLAP;
    } else {
      reset();
    }
  }, [state, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hero = new Image();
    hero.src = hanumanSrc;
    const bg = new Image();
    bg.src = oceanSrc;

    let raf = 0;
    let last = performance.now();
    let spawnTimer = 0;

    const drawRakshasa = (o: Obstacle, top: boolean, y0: number, y1: number) => {
      const h = y1 - y0;
      if (h <= 4) return;
      const body = ctx.createLinearGradient(o.x, y0, o.x + 84, y1);
      body.addColorStop(0, "#6d1a24");
      body.addColorStop(0.55, "#3d0b12");
      body.addColorStop(1, "#1b0407");
      ctx.fillStyle = body;
      ctx.fillRect(o.x, y0, 84, h);

      // armour ribbing
      ctx.fillStyle = "rgba(255,190,110,0.10)";
      for (let y = y0 + 12; y < y1 - 6; y += 26) ctx.fillRect(o.x + 6, y, 72, 6);

      const faceY = top ? y1 - 46 : y0 + 46;
      const dir = top ? -1 : 1;

      // horns
      ctx.fillStyle = "#e3b23c";
      ctx.beginPath();
      ctx.moveTo(o.x + 10, faceY + dir * 14);
      ctx.quadraticCurveTo(o.x + 2, faceY - dir * 16, o.x + 26, faceY - dir * 26);
      ctx.quadraticCurveTo(o.x + 18, faceY - dir * 6, o.x + 24, faceY + dir * 12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(o.x + 74, faceY + dir * 14);
      ctx.quadraticCurveTo(o.x + 82, faceY - dir * 16, o.x + 58, faceY - dir * 26);
      ctx.quadraticCurveTo(o.x + 66, faceY - dir * 6, o.x + 60, faceY + dir * 12);
      ctx.fill();

      // burning eyes
      const glow = ctx.createRadialGradient(o.x + 42, faceY, 1, o.x + 42, faceY, 30);
      glow.addColorStop(0, "rgba(255,140,40,0.55)");
      glow.addColorStop(1, "rgba(255,90,20,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(o.x + 42, faceY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb545";
      for (const ex of [o.x + 28, o.x + 56]) {
        ctx.beginPath();
        ctx.ellipse(ex, faceY, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#320404";
      for (const ex of [o.x + 28, o.x + 56]) {
        ctx.beginPath();
        ctx.ellipse(ex, faceY, 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // fanged jaw facing the gap
      const jawY = top ? y1 : y0;
      ctx.fillStyle = "#f1e2c4";
      for (let i = 0; i < 6; i++) {
        const fx = o.x + 8 + i * 13;
        ctx.beginPath();
        ctx.moveTo(fx, jawY);
        ctx.lineTo(fx + 6, jawY + (top ? 14 : -14));
        ctx.lineTo(fx + 12, jawY);
        ctx.fill();
      }
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = world.current;
      const stage = STAGES[w.level] ?? STAGES[0]!;

      if (w.running) {
        w.t += dt;
        w.scroll += stage.speed * dt;
        w.vy += GRAVITY * dt;
        w.y += w.vy * dt;

        spawnTimer += dt;
        if (spawnTimer >= stage.spawn) {
          spawnTimer = 0;
          const gapH = Math.max(150, stage.gap - w.leaps);
          const gapY = 80 + Math.random() * (H - 170 - gapH);
          const kind = (stage.kinds[Math.floor(Math.random() * stage.kinds.length)] ?? 0) as Kind;
          w.obstacles.push({
            x: W + 60,
            gapY,
            gapH,
            kind,
            passed: false,
            baseGapY: gapY,
            phase: Math.random() * Math.PI * 2,
          });
        }

        for (const o of w.obstacles) {
          o.x -= stage.speed * dt;
          if (o.kind === 3 || o.kind === 4) {
            const amp = Math.min(
              o.kind === 4 ? 110 : 85,
              o.baseGapY - 20,
              H - 50 - o.gapH - o.baseGapY - 20,
            );
            o.gapY = o.baseGapY + Math.sin(w.t * 2.2 + o.phase) * Math.max(0, amp);
          }
          if (!o.passed && o.x + 84 < HERO_X) {
            o.passed = true;
            w.leaps += 1;
            w.score += 10 + w.level * 5 + (o.kind >= 3 ? 15 : 0);
            const nextLevel = stageFor(w.leaps);
            w.level = nextLevel;
            setLeaps(w.leaps);
            setScore(w.score);
            setLevel(nextLevel);
          }
        }
        w.obstacles = w.obstacles.filter((o) => o.x > -140);

        const hit =
          w.y - HERO_R < 0 ||
          w.y + HERO_R > H - 50 ||
          w.obstacles.some(
            (o) =>
              HERO_X + HERO_R > o.x &&
              HERO_X - HERO_R < o.x + 84 &&
              (w.y - HERO_R < o.gapY || w.y + HERO_R > o.gapY + o.gapH),
          );

        if (hit) {
          w.running = false;
          setState("over");
          setBest((b) => Math.max(b, w.score));
        }
      }

      // background
      if (bg.complete && bg.naturalWidth) {
        const off = (w.scroll * 0.25) % W;
        ctx.drawImage(bg, -off, 0, W, H);
        ctx.drawImage(bg, W - off, 0, W, H);
      } else {
        ctx.fillStyle = "#f3b45a";
        ctx.fillRect(0, 0, W, H);
      }
      // dusk deepens as Lanka nears
      ctx.fillStyle = `rgba(${90 + w.level * 20}, ${70 - w.level * 8}, ${40 + w.level * 10}, ${0.10 + w.level * 0.05})`;
      ctx.fillRect(0, 0, W, H);

      // obstacles
      for (const o of w.obstacles) {
        const k = KINDS[o.kind];
        const y1 = o.gapY;
        const y2 = o.gapY + o.gapH;

        if (o.kind === 3 || o.kind === 4) {
          drawRakshasa(o, true, 0, y1);
          drawRakshasa(o, false, y2, H - 50);
        } else {
          const grad = ctx.createLinearGradient(o.x, 0, o.x + 84, 0);
          grad.addColorStop(0, k.top);
          grad.addColorStop(1, k.bottom);
          ctx.fillStyle = grad;
          ctx.fillRect(o.x, 0, 84, y1);
          ctx.fillRect(o.x, y2, 84, H - y2);
          ctx.fillStyle = "rgba(255,215,120,0.85)";
          ctx.fillRect(o.x - 6, y1 - 16, 96, 16);
          ctx.fillRect(o.x - 6, y2, 96, 16);
        }

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "600 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(k.name, o.x + 42, Math.max(20, y1 - 24));
      }

      // sea strip
      const seaGrad = ctx.createLinearGradient(0, H - 50, 0, H);
      seaGrad.addColorStop(0, "#1f7d8c");
      seaGrad.addColorStop(1, "#0d4a57");
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, H - 50, W, 50);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < W; i += 30) {
        const x = (i - (w.scroll % 30)) % W;
        ctx.moveTo(x, H - 44 + Math.sin((i + w.scroll) / 25) * 3);
        ctx.lineTo(x + 16, H - 44 + Math.sin((i + w.scroll) / 25) * 3);
      }
      ctx.stroke();

      // hero
      const tilt = Math.max(-0.4, Math.min(0.7, w.vy / 900));
      ctx.save();
      ctx.translate(HERO_X, w.y);
      ctx.rotate(tilt);
      if (hero.complete && hero.naturalWidth) {
        ctx.drawImage(hero, -46, -40, 92, 80);
      } else {
        ctx.fillStyle = "#e07c28";
        ctx.beginPath();
        ctx.arc(0, 0, HERO_R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stage = STAGES[level] ?? STAGES[0]!;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        className="relative w-full max-w-[900px] overflow-hidden rounded-2xl border border-border shadow-2xl"
        onPointerDown={(e) => {
          e.preventDefault();
          flap();
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
                reset();
              }}
              className="mt-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
            >
              {state === "ready" ? "Begin the leap" : "Leap again"}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Space / tap to rise · five levels, from Mahendra Parvata to the shores of Lanka · rakshasas are worth extra punya
      </p>
    </div>
  );
}
