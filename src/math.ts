export interface Vec {
  x: number;
  y: number;
}
export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
export const distance = (a: Vec, b: Vec): number =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function normalize(v: Vec): Vec {
  const length = Math.hypot(v.x, v.y);
  return length > 0 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 };
}
/** Swept collision prevents fast projectiles from tunneling through small enemies. */
export function segmentHitsCircle(
  a: Vec,
  b: Vec,
  c: Vec,
  radius: number,
): boolean {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0
      ? 0
      : clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / length2, 0, 1);
  return Math.hypot(a.x + t * dx - c.x, a.y + t * dy - c.y) <= radius;
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
