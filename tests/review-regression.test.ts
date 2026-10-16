import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Game } from "../src/game";
import type { Enemy } from "../src/game";

function stationaryEnemy(id: number, x: number, radius = 16): Enemy {
  return {
    id,
    x,
    y: 100,
    radius,
    kind: "stalker",
    hp: 1,
    maxHp: 1,
    speed: 0,
    angle: 0,
    hit: 0,
  };
}
function projectileGame(): Game {
  const g = new Game(() => 0.5);
  g.start();
  // Far from the player: automatic shooting cannot mask the collision under test.
  g.bullets.push({
    x: 100,
    y: 100,
    previous: { x: 100, y: 100 },
    vx: 740,
    vy: 0,
    life: 1,
  });
  return g;
}
describe("PR review regressions", () => {
  it.each([false, true])(
    "hits the nearer enemy regardless of spawn order (farther first: %s)",
    (fartherFirst) => {
      const g = projectileGame();
      const near = stationaryEnemy(1, 115),
        far = stationaryEnemy(2, 130);
      g.enemies = fartherFirst ? [far, near] : [near, far];
      g.step(0.05);
      expect(near.hp).toBe(0);
      expect(far.hp).toBe(1);
      expect(g.kills).toBe(1);
      expect(g.shotsFired).toBe(0);
    },
  );
  it("orders hits by the first circle surface, not center distance", () => {
    const g = projectileGame();
    const small = stationaryEnemy(1, 125, 4),
      large = stationaryEnemy(2, 140, 24);
    g.enemies = [small, large];
    g.step(0.05);
    expect(large.hp).toBe(0);
    expect(small.hp).toBe(1);
    expect(g.kills).toBe(1);
  });
  it("preserves an inset canvas keyboard-focus indicator", () => {
    const css = readFileSync(
      new URL("../src/style.css", import.meta.url),
      "utf8",
    );
    expect(css).not.toMatch(/canvas\s*\{[^}]*outline:\s*none\s*!important/s);
    expect(css).toMatch(
      /canvas:focus-visible\s*\{[^}]*outline-offset:\s*-4px/s,
    );
  });
});
