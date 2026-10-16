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
/** First contact along a swept projectile segment (0 = its start, 1 = its end). */
export function segmentCircleEntryTime(
  a: Vec,
  b: Vec,
  c: Vec,
  radius: number,
): number | null {
  const ox = a.x - c.x;
  const oy = a.y - c.y;
  const r2 = radius * radius;
  if (ox * ox + oy * oy <= r2) return 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const magnitude2 = dx * dx + dy * dy;
  if (magnitude2 === 0) return null;
  const projection = ox * dx + oy * dy;
  const discriminant =
    projection * projection - magnitude2 * (ox * ox + oy * oy - r2);
  if (discriminant < 0) return null;
  const entry = (-projection - Math.sqrt(discriminant)) / magnitude2;
  return entry >= 0 && entry <= 1 ? entry : null;
}

/** Swept collision prevents fast projectiles from tunneling through small enemies. */
export function segmentHitsCircle(
  a: Vec,
  b: Vec,
  c: Vec,
  radius: number,
): boolean {
  return segmentCircleEntryTime(a, b, c, radius) !== null;
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
