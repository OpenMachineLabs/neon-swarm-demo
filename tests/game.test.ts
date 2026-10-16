import { describe, expect, it } from "vitest";
import { DURATION, Game, HEIGHT, PLAYER_SPEED, WIDTH } from "../src/game";
import type { Enemy } from "../src/game";
import { distance, seededRandom } from "../src/math";
import { towardDestination } from "../src/input";

function fresh(seed = 7): Game {
  const game = new Game(seededRandom(seed));
  game.start();
  return game;
}
function enemy(
  game: Game,
  x = game.player.x + 100,
  y = game.player.y,
  hp = 1,
): Enemy {
  const e: Enemy = {
    x,
    y,
    id: 1000 + game.enemies.length,
    kind: hp > 1 ? "tank" : "stalker",
    radius: 16,
    hp,
    maxHp: hp,
    speed: 0,
    angle: 0,
    hit: 0,
  };
  game.enemies.push(e);
  return e;
}
function advance(game: Game, seconds: number): void {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    game.step(1 / 60);
    game.drainEvents();
  }
}

describe("lifecycle and timing", () => {
  it("does not simulate before start", () => {
    const g = new Game();
    g.step(1);
    expect(g.elapsed).toBe(0);
    expect(g.status).toBe("ready");
  });
  it("starts with a healthy centered player", () => {
    const g = fresh();
    expect(g.player).toMatchObject({ hp: 100, x: WIDTH / 2, y: HEIGHT / 2 });
    expect(g.status).toBe("playing");
  });
  it("pauses both simulation and challenge clock", () => {
    const g = fresh();
    g.togglePause();
    g.step(1);
    expect(g.elapsed).toBe(0);
    expect(g.status).toBe("paused");
    g.togglePause();
    g.step(0.02);
    expect(g.elapsed).toBe(0.02);
  });
  it.each([0, -1, NaN, Infinity])("ignores invalid delta %s", (delta) => {
    const g = fresh();
    g.step(delta);
    expect(g.elapsed).toBe(0);
  });
  it("bounds large frame stalls", () => {
    const g = fresh();
    g.step(30);
    expect(g.elapsed).toBe(0.05);
  });
  it("wins at exactly sixty seconds without overshoot", () => {
    const g = fresh();
    g.elapsed = 59.99;
    g.step(0.05);
    expect(g.status).toBe("won");
    expect(g.elapsed).toBe(DURATION);
    expect(g.remaining).toBe(0);
    expect(g.drainEvents()).toContainEqual({ kind: "won" });
  });
  it("gives lethal contact precedence over victory on the final frame", () => {
    const g = fresh();
    g.elapsed = 59.99;
    g.player.hp = 22;
    enemy(g, g.player.x, g.player.y, 99);
    g.step(0.05);
    expect(g.status).toBe("lost");
    expect(g.player.hp).toBe(0);
  });
  it("freezes terminal states and disallows pausing them", () => {
    const g = fresh();
    g.elapsed = 59.99;
    g.step(0.05);
    const snapshot = JSON.stringify(g);
    g.step(0.05);
    g.togglePause();
    expect(JSON.stringify(g)).toBe(snapshot);
  });
  it("fully resets run state on restart", () => {
    const g = fresh();
    enemy(g);
    g.pulse();
    g.elapsed = 42;
    g.player.hp = 12;
    g.damageTaken = 88;
    g.shotsFired = 90;
    g.status = "lost";
    g.start();
    expect(g.player.hp).toBe(100);
    expect([
      g.elapsed,
      g.score,
      g.kills,
      g.combo,
      g.pulseCooldown,
      g.damageTaken,
      g.shotsFired,
    ]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(g.enemies).toEqual([]);
    expect(g.bullets).toEqual([]);
    expect(g.particles).toEqual([]);
    expect(g.pickups).toEqual([]);
    expect(g.events).toEqual([]);
  });
});
describe("movement and enemies", () => {
  it("moves at the intended speed", () => {
    const g = fresh();
    const x = g.player.x;
    g.step(0.05, { x: 1, y: 0 });
    expect(g.player.x - x).toBeCloseTo(PLAYER_SPEED * 0.05);
  });
  it("normalizes diagonal movement", () => {
    const g = fresh();
    const before = { ...g.player };
    g.step(0.05, { x: 1, y: 1 });
    expect(distance(before, g.player)).toBeCloseTo(PLAYER_SPEED * 0.05);
  });
  it("keeps the player inside every arena boundary", () => {
    const g = fresh();
    g.player.x = 30;
    g.player.y = 30;
    g.step(0.05, { x: -1, y: -1 });
    expect(g.player.x).toBe(30);
    expect(g.player.y).toBe(30);
    g.player.x = WIDTH - 30;
    g.player.y = HEIGHT - 30;
    g.step(0.05, { x: 1, y: 1 });
    expect(g.player.x).toBe(WIDTH - 30);
    expect(g.player.y).toBe(HEIGHT - 30);
  });
  it("spawns continuously at arena edges", () => {
    const g = fresh();
    advance(g, 0.7);
    expect(g.enemies.length).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) {
      const e = g.spawn();
      expect(e.x < 0 || e.x > WIDTH || e.y < 0 || e.y > HEIGHT).toBe(true);
    }
  });
  it("chases the current player position", () => {
    const g = fresh();
    const e = enemy(g, 1100, 100);
    e.speed = 100;
    const before = distance(e, g.player);
    g.step(0.05);
    expect(distance(e, g.player)).toBeLessThan(before);
  });
  it("introduces runners and tanks only in later phases", () => {
    const g = fresh();
    expect(Array.from({ length: 30 }, () => g.spawn().kind)).not.toContain(
      "tank",
    );
    g.elapsed = 35;
    const kinds = Array.from({ length: 100 }, () => g.spawn().kind);
    expect(kinds).toContain("runner");
    expect(kinds).toContain("tank");
  });
  it("increases spawn pressure with threat level", () => {
    const count = (time: number) => {
      const g = fresh();
      g.elapsed = time;
      let total = 0;
      for (let i = 0; i < 120; i++) {
        g.step(1 / 60);
        total += g.enemies.length;
        g.enemies = [];
        g.drainEvents();
      }
      return total;
    };
    expect(count(45)).toBeGreaterThan(count(0));
  });
});
describe("combat, health and score", () => {
  it("automatically shoots and awards a kill with particles", () => {
    const g = fresh();
    enemy(g);
    advance(g, 0.2);
    expect(g.shotsFired).toBe(1);
    expect(g.kills).toBe(1);
    expect(g.score).toBe(10);
    expect(g.particles.length).toBeGreaterThan(0);
  });
  it("does not fire without an enemy in range", () => {
    const g = fresh();
    enemy(g, 1190, 650);
    g.step(0.05);
    expect(g.shotsFired).toBe(0);
  });
  it("targets the nearest enemy", () => {
    const g = fresh();
    enemy(g, g.player.x + 120, g.player.y);
    enemy(g, g.player.x, g.player.y - 80);
    g.step(0.01);
    expect(g.bullets[0].vx).toBeCloseTo(0);
    expect(g.bullets[0].vy).toBeLessThan(0);
  });
  it("tanks absorb multiple projectiles", () => {
    const g = fresh();
    const e = enemy(g, g.player.x + 100, g.player.y, 3);
    advance(g, 0.2);
    expect(e.hp).toBe(2);
    expect(g.kills).toBe(0);
  });
  it("uses swept collisions for high-speed bullets and avoids double scoring", () => {
    const g = fresh();
    enemy(g, 700, 340);
    g.bullets.push({
      x: 500,
      y: 340,
      previous: { x: 500, y: 340 },
      vx: 10000,
      vy: 0,
      life: 1,
    });
    g.step(0.05);
    expect(g.kills).toBe(1);
    expect(g.score).toBe(10);
  });
  it("takes contact damage once during the invulnerability window", () => {
    const g = fresh();
    enemy(g, g.player.x, g.player.y, 99);
    enemy(g, g.player.x, g.player.y, 99);
    g.step(0.01);
    expect(g.player.hp).toBe(78);
    g.step(0.01);
    expect(g.player.hp).toBe(78);
    expect(g.damageTaken).toBe(22);
  });
  it("collects repairs without exceeding maximum health", () => {
    const g = fresh();
    g.player.hp = 95;
    g.pickups.push({ x: g.player.x, y: g.player.y, life: 10 });
    g.step(0.01);
    expect(g.player.hp).toBe(100);
    expect(g.pickups).toHaveLength(0);
  });
  it("does not magnetize or collect a repair after its lifetime expires", () => {
    const g = fresh();
    g.player.hp = 50;
    // Outside collection range when it expires, but inside after a full 50 ms step.
    g.pickups.push({ x: g.player.x + 30, y: g.player.y, life: 0.001 });
    g.step(0.05);
    expect(g.player.hp).toBe(50);
    expect(g.pickups).toHaveLength(0);
    expect(g.drainEvents()).not.toContainEqual({ kind: "heal" });
  });
  it("does not resurrect a dead player with a pickup", () => {
    const g = fresh();
    g.player.hp = 0;
    g.pickups.push({ x: g.player.x, y: g.player.y, life: 10 });
    g.step(0.01);
    expect(g.player.hp).toBe(0);
    expect(g.status).toBe("lost");
  });
  it("expires pickups and projectiles", () => {
    const g = fresh();
    g.pickups.push({ x: 50, y: 50, life: 0.01 });
    g.bullets.push({
      x: 5,
      y: 5,
      previous: { x: 5, y: 5 },
      vx: -740,
      vy: 0,
      life: 0.01,
    });
    g.step(0.05);
    expect(g.pickups).toHaveLength(0);
    expect(g.bullets).toHaveLength(0);
  });
  it("clears close enemies with pulse and enforces recharge", () => {
    const g = fresh();
    enemy(g, g.player.x + 50, g.player.y, 3);
    expect(g.pulse()).toBe(true);
    expect(g.kills).toBe(1);
    expect(g.enemies).toHaveLength(0);
    expect(g.pulse()).toBe(false);
    advance(g, 8.1);
    expect(g.pulseCooldown).toBe(0);
    expect(g.pulse()).toBe(true);
  });
  it("does not allow pulse while paused or before start", () => {
    const g = new Game();
    expect(g.pulse()).toBe(false);
    g.start();
    g.togglePause();
    expect(g.pulse()).toBe(false);
  });
  it("caps visual effects during a large chain reaction", () => {
    const g = fresh();
    for (let i = 0; i < 100; i++) enemy(g, 610, 340);
    g.pulse();
    expect(g.kills).toBe(100);
    expect(g.particles.length).toBeLessThanOrEqual(450);
    expect(g.multiplier).toBe(4);
  });
  it("resets combo after inactivity", () => {
    const g = fresh();
    g.combo = 20;
    g.comboTime = 0.01;
    g.step(0.05);
    expect(g.combo).toBe(0);
    expect(g.multiplier).toBe(1);
  });
  it("drains one-shot events instead of replaying them", () => {
    const g = fresh();
    g.pulse();
    expect(g.drainEvents()).toContainEqual({ kind: "pulse" });
    expect(g.drainEvents()).toEqual([]);
  });
});
describe("full-run regression", () => {
  it("supports a complete sixty-second survival run using only movement and pulse", () => {
    const g = fresh(123);
    const waypoints = [
      { x: 160, y: 140 },
      { x: 1040, y: 140 },
      { x: 1040, y: 540 },
      { x: 160, y: 540 },
    ];
    let waypoint = 0;
    for (let frame = 0; frame < 3602 && g.status === "playing"; frame++) {
      if (distance(g.player, waypoints[waypoint]) < 12)
        waypoint = (waypoint + 1) % waypoints.length;
      const movement = towardDestination(
        g.player,
        waypoints[waypoint],
        1 / 60,
        PLAYER_SPEED,
      );
      if (g.enemies.some((e) => distance(e, g.player) < 120)) g.pulse();
      g.step(1 / 60, movement);
      g.drainEvents();
    }
    expect(g.status).toBe("won");
    expect(g.elapsed).toBe(60);
    expect(g.kills).toBeGreaterThan(20);
    expect(g.shotsFired).toBeGreaterThan(30);
  });
  it("punishes standing still through an entire challenge", () => {
    const g = fresh(123);
    advance(g, 61);
    expect(g.status).toBe("lost");
    expect(g.damageTaken).toBeGreaterThanOrEqual(100);
  });
});
