import { clamp, distance, normalize, segmentCircleEntryTime } from "./math";
import type { Vec } from "./math";

export const WIDTH = 1200;
export const HEIGHT = 680;
export const DURATION = 60;
export const PLAYER_SPEED = 245;
export const PULSE_COOLDOWN = 8;
export const PHASES = [
  "FIRST CONTACT",
  "SIGNAL RISING",
  "OVERLOAD",
  "LAST STAND",
] as const;
export type Status = "ready" | "playing" | "paused" | "won" | "lost";
export type EnemyKind = "stalker" | "runner" | "tank";
export interface Enemy extends Vec {
  id: number;
  kind: EnemyKind;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  angle: number;
  hit: number;
}
export interface Bullet extends Vec {
  previous: Vec;
  vx: number;
  vy: number;
  life: number;
}
export interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
export interface Pickup extends Vec {
  life: number;
}
export interface Player extends Vec {
  hp: number;
  radius: number;
  angle: number;
  invulnerable: number;
}
export interface GameEvent {
  kind: "shot" | "kill" | "hurt" | "pulse" | "heal" | "phase" | "won" | "lost";
  value?: number;
}
export const COLORS = {
  stalker: "#ff4e91",
  runner: "#ffc36e",
  tank: "#ae86ff",
};

/** Pure simulation: no DOM, storage, audio, wall clock, or animation-frame dependencies. */
export class Game {
  status: Status = "ready";
  player: Player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    hp: 100,
    radius: 13,
    angle: -Math.PI / 2,
    invulnerable: 0,
  };
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  events: GameEvent[] = [];
  elapsed = 0;
  kills = 0;
  score = 0;
  combo = 0;
  comboTime = 0;
  pulseCooldown = 0;
  pulseRing = 0;
  shake = 0;
  damageTaken = 0;
  shotsFired = 0;
  private spawnClock = 0.6;
  private shotClock = 0;
  private nextId = 1;
  constructor(private readonly random: () => number = Math.random) {}
  get phase(): number {
    return Math.min(3, Math.floor(this.elapsed / 15));
  }
  get remaining(): number {
    return Math.max(0, DURATION - this.elapsed);
  }
  get multiplier(): number {
    return 1 + Math.min(3, Math.floor(this.combo / 8));
  }
  start(): void {
    this.player = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      hp: 100,
      radius: 13,
      angle: -Math.PI / 2,
      invulnerable: 0,
    };
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.events = [];
    this.elapsed = 0;
    this.kills = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTime = 0;
    this.pulseCooldown = 0;
    this.pulseRing = 0;
    this.shake = 0;
    this.damageTaken = 0;
    this.shotsFired = 0;
    this.spawnClock = 0.6;
    this.shotClock = 0;
    this.nextId = 1;
    this.status = "playing";
  }
  togglePause(): void {
    if (this.status === "playing") this.status = "paused";
    else if (this.status === "paused") this.status = "playing";
  }
  spawn(): Enemy {
    const roll = this.random();
    const kind: EnemyKind =
      this.phase >= 2 && roll < 0.24
        ? "tank"
        : this.phase >= 1 && roll < 0.53
          ? "runner"
          : "stalker";
    const edge = Math.floor(this.random() * 4);
    const along = this.random();
    const position =
      edge === 0
        ? { x: along * WIDTH, y: -24 }
        : edge === 1
          ? { x: WIDTH + 24, y: along * HEIGHT }
          : edge === 2
            ? { x: along * WIDTH, y: HEIGHT + 24 }
            : { x: -24, y: along * HEIGHT };
    const hp = kind === "tank" ? 3 : 1;
    const enemy: Enemy = {
      ...position,
      id: this.nextId++,
      kind,
      radius: kind === "tank" ? 22 : kind === "runner" ? 12 : 16,
      hp,
      maxHp: hp,
      speed:
        (kind === "tank" ? 52 : kind === "runner" ? 124 : 76) + this.phase * 7,
      angle: 0,
      hit: 0,
    };
    this.enemies.push(enemy);
    return enemy;
  }
  private burst(
    position: Vec,
    color: string,
    count: number,
    force = 150,
  ): void {
    // Effects have a hard cap, even during late-game chain kills.
    for (let i = 0; i < count && this.particles.length < 450; i++) {
      const angle = this.random() * Math.PI * 2;
      const speed = force * (0.2 + this.random());
      const life = 0.25 + this.random() * 0.45;
      this.particles.push({
        ...position,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: 1 + this.random() * 3,
      });
    }
  }
  private destroy(enemy: Enemy): void {
    if (enemy.hp <= 0) return;
    enemy.hp = 0;
    this.kills++;
    this.combo++;
    this.comboTime = 3;
    this.score +=
      (enemy.kind === "tank" ? 40 : enemy.kind === "runner" ? 20 : 10) *
      this.multiplier;
    this.burst(enemy, COLORS[enemy.kind], 16);
    this.events.push({ kind: "kill" });
    if (this.kills % 12 === 0)
      this.pickups.push({ x: enemy.x, y: enemy.y, life: 12 });
  }
  pulse(): boolean {
    if (this.status !== "playing" || this.pulseCooldown > 0) return false;
    this.pulseCooldown = PULSE_COOLDOWN;
    this.pulseRing = 0.65;
    this.shake = 5;
    this.events.push({ kind: "pulse" });
    this.burst(this.player, "#65ffd2", 44, 330);
    for (const enemy of this.enemies) {
      const d = distance(enemy, this.player);
      if (d <= 195) this.destroy(enemy);
      else if (d < 320) {
        const direction = normalize({
          x: enemy.x - this.player.x,
          y: enemy.y - this.player.y,
        });
        enemy.x += direction.x * 75;
        enemy.y += direction.y * 75;
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    return true;
  }
  step(delta: number, movement: Vec = { x: 0, y: 0 }): void {
    if (this.status !== "playing" || !Number.isFinite(delta) || delta <= 0)
      return;
    // A stalled tab cannot consume the entire challenge or tunnel through enemies.
    const dt = Math.min(delta, 0.05, DURATION - this.elapsed);
    const previousPhase = this.phase;
    this.elapsed = Math.min(DURATION, this.elapsed + dt);
    if (this.phase !== previousPhase)
      this.events.push({ kind: "phase", value: this.phase });
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (this.comboTime === 0) this.combo = 0;
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
    this.pulseRing = Math.max(0, this.pulseRing - dt);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    const direction = normalize(movement);
    this.player.x = clamp(
      this.player.x + direction.x * PLAYER_SPEED * dt,
      30,
      WIDTH - 30,
    );
    this.player.y = clamp(
      this.player.y + direction.y * PLAYER_SPEED * dt,
      30,
      HEIGHT - 30,
    );
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && this.enemies.length < 180) {
      this.spawn();
      this.spawnClock += [0.78, 0.53, 0.35, 0.23][this.phase];
    }
    this.shotClock = Math.max(0, this.shotClock - dt);
    let target: Enemy | undefined;
    let nearest = 370;
    for (const enemy of this.enemies) {
      const d = distance(enemy, this.player);
      if (d < nearest) {
        target = enemy;
        nearest = d;
      }
    }
    if (target) {
      this.player.angle = Math.atan2(
        target.y - this.player.y,
        target.x - this.player.x,
      );
      if (this.shotClock === 0) {
        const angle = this.player.angle;
        this.bullets.push({
          x: this.player.x,
          y: this.player.y,
          previous: { x: this.player.x, y: this.player.y },
          vx: Math.cos(angle) * 740,
          vy: Math.sin(angle) * 740,
          life: 0.65,
        });
        this.shotClock = 0.24;
        this.shotsFired++;
        this.events.push({ kind: "shot" });
      }
    } else if (direction.x || direction.y)
      this.player.angle = Math.atan2(direction.y, direction.x);
    for (const enemy of this.enemies) {
      const toward = normalize({
        x: this.player.x - enemy.x,
        y: this.player.y - enemy.y,
      });
      enemy.angle = Math.atan2(toward.y, toward.x);
      enemy.x += toward.x * enemy.speed * dt;
      enemy.y += toward.y * enemy.speed * dt;
      enemy.hit = Math.max(0, enemy.hit - dt);
    }
    for (const bullet of this.bullets) {
      bullet.previous = { x: bullet.x, y: bullet.y };
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      // Resolve the first surface crossing, not the first spawned enemy.
      let hitEnemy: Enemy | undefined;
      let hitTime = Infinity;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const t = segmentCircleEntryTime(
          bullet.previous,
          bullet,
          enemy,
          enemy.radius + 3,
        );
        if (t !== null && t < hitTime) {
          hitEnemy = enemy;
          hitTime = t;
        }
      }
      if (hitEnemy) {
        bullet.x = bullet.previous.x + bullet.vx * dt * hitTime;
        bullet.y = bullet.previous.y + bullet.vy * dt * hitTime;
        bullet.life = 0;
        hitEnemy.hit = 0.09;
        if (hitEnemy.hp === 1) this.destroy(hitEnemy);
        else {
          hitEnemy.hp--;
          this.burst(bullet, "#ffffff", 5, 85);
        }
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || this.player.invulnerable > 0) continue;
      if (distance(enemy, this.player) < enemy.radius + this.player.radius) {
        const damage = Math.min(22, this.player.hp);
        this.player.hp -= damage;
        this.damageTaken += damage;
        this.player.invulnerable = 0.85;
        this.shake = 9;
        this.combo = 0;
        this.events.push({ kind: "hurt" });
        this.burst(this.player, "#ff4e91", 24, 210);
        const push = normalize({
          x: enemy.x - this.player.x,
          y: enemy.y - this.player.y,
        });
        enemy.x += push.x * 60;
        enemy.y += push.y * 60;
      }
    }
    for (const pickup of this.pickups) {
      pickup.life -= dt;
      // Expired repairs cannot magnetize into range or heal on this frame.
      if (pickup.life <= 0) continue;
      const d = distance(pickup, this.player);
      if (d < 115) {
        const toward = normalize({
          x: this.player.x - pickup.x,
          y: this.player.y - pickup.y,
        });
        pickup.x += toward.x * 220 * dt;
        pickup.y += toward.y * 220 * dt;
      }
      if (distance(pickup, this.player) < 24 && this.player.hp > 0) {
        this.player.hp = Math.min(100, this.player.hp + 18);
        pickup.life = 0;
        this.events.push({ kind: "heal" });
        this.burst(this.player, "#65ffd2", 18);
      }
    }
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-3 * dt);
      particle.vy *= Math.exp(-3 * dt);
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    this.bullets = this.bullets.filter(
      (bullet) =>
        bullet.life > 0 &&
        bullet.x > -20 &&
        bullet.x < WIDTH + 20 &&
        bullet.y > -20 &&
        bullet.y < HEIGHT + 20,
    );
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.pickups = this.pickups.filter((pickup) => pickup.life > 0);
    // A lethal collision on the last simulation step takes precedence over victory.
    if (this.player.hp <= 0) {
      this.status = "lost";
      this.events.push({ kind: "lost" });
    } else if (this.elapsed >= DURATION) {
      this.status = "won";
      this.events.push({ kind: "won" });
    }
  }
  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}
