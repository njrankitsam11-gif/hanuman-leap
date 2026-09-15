/**
 * Seeded randomness for runs that must be reproducible: the Daily Leap (everyone gets
 * the same columns) and, later, replay verification. The story run keeps Math.random.
 */

/** mulberry32 — small, fast, good enough for obstacle placement. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so a date string (or any label) becomes a 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Offset of Indian Standard Time in minutes; the daily resets at midnight in Bharat. */
const IST_OFFSET_MIN = 330;

/** "YYYY-MM-DD" of the given instant in IST. */
export function dailyKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const dailySeed = (key: string = dailyKey()) => hashSeed(`hanuman-leap:daily:${key}`);
