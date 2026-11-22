import type { FridgeSpot } from '../../data/fridge-layout';

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small deterministic PRNG (mulberry32) so auto layouts and tilts are the
// same on every load.
export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tiltFor(id: string): number {
  return Math.round((seededRandom(`tilt:${id}`)() * 8 - 4) * 10) / 10;
}

/**
 * Places magnets that have no saved spot into the free cells of a jittered
 * grid, in a shuffled (but fixed) order so the door looks casually filled
 * rather than sorted. Cells near an already-placed magnet are skipped.
 */
export function autoFridgeLayout(
  ids: string[],
  taken: FridgeSpot[],
  cols: number,
  rows: number,
): Record<string, FridgeSpot> {
  const rng = seededRandom(`fridge:${cols}x${rows}`);
  const step = (n: number) => (n > 1 ? 1 / (n - 1) : 0);
  const sx = step(cols);
  const sy = step(rows);
  const at = (i: number, n: number, s: number) => (n > 1 ? i * s : 0.5);

  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: clamp01(at(c, cols, sx) + (rng() - 0.5) * sx * 0.28),
        y: clamp01(at(r, rows, sy) + (rng() - 0.5) * sy * 0.28),
      });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // Distance in "cells", so the check works the same on wide and tall doors.
  const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot((a.x - b.x) / (sx || 1), (a.y - b.y) / (sy || 1)) < 0.7;
  const free = cells.filter((cell) => !taken.some((t) => near(cell, t)));

  const out: Record<string, FridgeSpot> = {};
  ids.forEach((id, i) => {
    const cell = free[i] ?? { x: seededRandom(`x:${id}`)(), y: seededRandom(`y:${id}`)() };
    out[id] = { x: round3(cell.x), y: round3(cell.y), rotation: tiltFor(id) };
  });
  return out;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const clamp01 = (n: number) => clamp(n, 0, 1);
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Where a magnet should rest on the door, in door pixels. */
export interface MagnetTarget {
  x: number;
  y: number;
  rot: number;
  w: number;
  h: number;
}
