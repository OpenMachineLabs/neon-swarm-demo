import { describe, expect, it } from "vitest";
import {
  clamp,
  distance,
  normalize,
  seededRandom,
  segmentHitsCircle,
} from "../src/math";
import { canvasPoint, keyboardVector, towardDestination } from "../src/input";

describe("geometry", () => {
  it("handles zero-length normalization", () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it("normalizes vectors to unit magnitude", () => {
    expect(distance(normalize({ x: 3, y: 4 }), { x: 0, y: 0 })).toBeCloseTo(1);
  });
  it("clamps inside and outside bounds", () => {
    expect([clamp(-1, 0, 10), clamp(5, 0, 10), clamp(11, 0, 10)]).toEqual([
      0, 5, 10,
    ]);
  });
  it("detects a swept hit even if both endpoints are outside", () => {
    expect(
      segmentHitsCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }, 4),
    ).toBe(true);
  });
  it("rejects circles beyond the segment", () => {
    expect(
      segmentHitsCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 120, y: 0 }, 4),
    ).toBe(false);
  });
  it("handles a zero-length segment", () => {
    expect(
      segmentHitsCircle({ x: 2, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 2 }, 1),
    ).toBe(true);
  });
  it("makes seeded simulations reproducible", () => {
    const a = seededRandom(42),
      b = seededRandom(42);
    expect(Array.from({ length: 20 }, a)).toEqual(
      Array.from({ length: 20 }, b),
    );
  });
});
describe("real control mapping", () => {
  it.each([
    ["KeyW", 0, -1],
    ["KeyS", 0, 1],
    ["KeyA", -1, 0],
    ["KeyD", 1, 0],
    ["ArrowUp", 0, -1],
    ["ArrowDown", 0, 1],
    ["ArrowLeft", -1, 0],
    ["ArrowRight", 1, 0],
  ])("maps %s", (key, x, y) => {
    expect(keyboardVector(new Set([key as string]))).toEqual({ x, y });
  });
  it("cancels opposite directions", () => {
    expect(keyboardVector(new Set(["KeyW", "KeyS"]))).toEqual({ x: 0, y: 0 });
  });
  it("does not double speed when WASD and arrows are combined", () => {
    expect(keyboardVector(new Set(["KeyW", "ArrowUp"]))).toEqual({
      x: 0,
      y: -1,
    });
  });
  it("maps CSS-scaled pointer coordinates into world space", () => {
    expect(
      canvasPoint(
        { x: 310, y: 190 },
        { left: 10, top: 20, width: 600, height: 340 },
      ),
    ).toEqual({ x: 600, y: 340 });
  });
  it("clamps pointer targets to safe arena bounds", () => {
    expect(
      canvasPoint(
        { x: -500, y: 5000 },
        { left: 0, top: 0, width: 1200, height: 680 },
      ),
    ).toEqual({ x: 30, y: 650 });
  });
  it("stops near the destination rather than oscillating", () => {
    expect(
      towardDestination({ x: 10, y: 10 }, { x: 11, y: 11 }, 0.05, 245),
    ).toEqual({ x: 0, y: 0 });
  });
});
