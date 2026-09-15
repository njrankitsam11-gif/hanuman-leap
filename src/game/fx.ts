import type { Viewport, World } from "./types";

/**
 * Cosmetic state: particles, flash, shake, wipe, squash. Updated in the frame loop,
 * never inside the engine, so the simulation stays deterministic and testable.
 * Particle positions live in flow space so the mirrored return leg just works.
 */

export type ParticleKind = "spark" | "sparkle" | "ember" | "flame" | "leaf";

export type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export type Fx = {
  particles: Particle[];
  /** 0..1 white→red overlay after a hit. */
  flash: number;
  /** Screen-shake amplitude in px. */
  shake: number;
  /** 0..1 saffron iris between chapters (1 = fully covered). */
  wipe: number;
  /** 0..1 stretch on flap. */
  squash: number;
  /** Honour prefers-reduced-motion: no shake, no wipe. */
  reducedMotion: boolean;
  /** Accumulators for steady emitters. */
  trailAcc: number;
  emberAcc: number;
  flameAcc: number;
};

export const MAX_PARTICLES = 200;
export const FLASH_S = 0.3;
export const SHAKE_PX = 12;
export const WIPE_S = 0.6;

export function createFx(reducedMotion = false): Fx {
  return {
    particles: [],
    flash: 0,
    shake: 0,
    wipe: 0,
    squash: 0,
    reducedMotion,
    trailAcc: 0,
    emberAcc: 0,
    flameAcc: 0,
  };
}

function push(fx: Fx, p: Particle) {
  if (fx.particles.length >= MAX_PARTICLES) fx.particles.shift();
  fx.particles.push(p);
}

/** Emit `n` particles of `kind` around (x, y). */
export function burst(
  fx: Fx,
  kind: ParticleKind,
  x: number,
  y: number,
  n: number,
  rng: () => number = Math.random,
) {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const sp = kind === "sparkle" ? 60 + rng() * 120 : 40 + rng() * 90;
    const life = kind === "sparkle" ? 0.6 + rng() * 0.5 : 0.35 + rng() * 0.35;
    push(fx, {
      kind,
      x,
      y,
      vx: Math.cos(a) * sp - (kind === "spark" ? 60 : 0),
      vy: Math.sin(a) * sp,
      life,
      maxLife: life,
      size: kind === "sparkle" ? 3 + rng() * 3 : 2 + rng() * 2.5,
    });
  }
}

export function flapFx(fx: Fx, heroX: number, heroY: number, rng?: () => number) {
  fx.squash = 1;
  burst(fx, "spark", heroX - 30, heroY + 8, 8, rng);
}

export function hitFx(fx: Fx) {
  fx.flash = 1;
  fx.shake = fx.reducedMotion ? 0 : SHAKE_PX;
}

export function wipeFx(fx: Fx) {
  fx.wipe = fx.reducedMotion ? 0 : 1;
}

/** Advance all cosmetics by `dt` seconds. */
export function updateFx(
  fx: Fx,
  dt: number,
  world: World,
  vp: Viewport,
  opts: { heroX: number; fireSky: boolean; running: boolean },
  rng: () => number = Math.random,
) {
  fx.flash = Math.max(0, fx.flash - dt / FLASH_S);
  fx.shake = Math.max(0, fx.shake - (SHAKE_PX / 0.35) * dt);
  fx.wipe = Math.max(0, fx.wipe - dt / WIPE_S);
  fx.squash *= Math.exp(-8 * dt);

  if (opts.running) {
    // golden trail behind the hero
    fx.trailAcc += dt * 14;
    while (fx.trailAcc >= 1) {
      fx.trailAcc -= 1;
      push(fx, {
        kind: "spark",
        x: opts.heroX - 34,
        y: world.y + (rng() - 0.5) * 14,
        vx: -40 - rng() * 30,
        vy: (rng() - 0.5) * 20,
        life: 0.45,
        maxLife: 0.45,
        size: 1.5 + rng() * 1.5,
      });
    }
    if (world.tailFire) {
      fx.flameAcc += dt * 40;
      while (fx.flameAcc >= 1) {
        fx.flameAcc -= 1;
        push(fx, {
          kind: "flame",
          x: opts.heroX - 40 - rng() * 10,
          y: world.y - 8 + (rng() - 0.5) * 10,
          vx: -60 - rng() * 60,
          vy: -30 - rng() * 50,
          life: 0.35 + rng() * 0.3,
          maxLife: 0.65,
          size: 4 + rng() * 5,
        });
      }
    }
  }
  if (opts.fireSky) {
    fx.emberAcc += dt * 10;
    while (fx.emberAcc >= 1) {
      fx.emberAcc -= 1;
      push(fx, {
        kind: "ember",
        x: rng() * vp.w,
        y: vp.h - vp.seaH - rng() * 40,
        vx: -20 - rng() * 40,
        vy: -40 - rng() * 60,
        life: 1.5 + rng() * 1.5,
        maxLife: 3,
        size: 1.5 + rng() * 2,
      });
    }
  }

  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === "spark" || p.kind === "sparkle") p.vy += 120 * dt;
    if (p.kind === "ember") p.vx += Math.sin(p.life * 6) * 30 * dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
}

const COLORS: Record<ParticleKind, (a: number) => string> = {
  spark: (a) => `rgba(255, 214, 110, ${a})`,
  sparkle: (a) => `rgba(255, 240, 180, ${a})`,
  ember: (a) => `rgba(255, 140, 40, ${a})`,
  flame: (a) => `rgba(255, ${120 + Math.round(100 * a)}, 40, ${a})`,
  leaf: (a) => `rgba(${90 + Math.round(60 * a)}, 150, 60, ${a})`,
};

/** Particles only; flash/shake/wipe are applied by the renderer around the world pass. */
export function drawParticles(ctx: CanvasRenderingContext2D, fx: Fx) {
  for (const p of fx.particles) {
    const a = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = COLORS[p.kind](a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.kind === "flame" ? a : 1), 0, Math.PI * 2);
    ctx.fill();
  }
}
