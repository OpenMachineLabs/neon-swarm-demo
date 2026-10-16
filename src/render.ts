import { COLORS, Game, HEIGHT, WIDTH } from "./game";
import type { Vec } from "./math";

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("This browser does not support Canvas 2D.");
    this.ctx = ctx;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    this.canvas.height = Math.max(1, Math.round(bounds.height * dpr));
  }
  private polygon(
    x: number,
    y: number,
    radius: number,
    sides: number,
    angle: number,
    color: string,
    fill = "#111524",
  ): void {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = angle + (i / sides) * Math.PI * 2;
      const px = x + Math.cos(a) * radius,
        py = y + Math.sin(a) * radius;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 1.7;
    c.stroke();
  }
  private ship(
    x: number,
    y: number,
    angle: number,
    time: number,
    invulnerable: boolean,
  ): void {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    if (invulnerable)
      c.globalAlpha = 0.45 + Math.abs(Math.sin(time * 25)) * 0.55;
    c.shadowBlur = 24;
    c.shadowColor = "#65ffd2";
    c.fillStyle = "#65ffd2";
    c.beginPath();
    c.moveTo(-12, -6);
    c.lineTo(-29 - Math.sin(time * 32) * 7, 0);
    c.lineTo(-12, 6);
    c.fill();
    c.shadowBlur = 12;
    c.beginPath();
    c.moveTo(22, 0);
    c.lineTo(-15, -14);
    c.lineTo(-7, 0);
    c.lineTo(-15, 14);
    c.closePath();
    c.fillStyle = "#102d33";
    c.fill();
    c.strokeStyle = "#b9ffea";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(3, 0, 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  draw(game: Game, time: number, destination: Vec | null): void {
    const c = this.ctx;
    c.setTransform(
      this.canvas.width / WIDTH,
      0,
      0,
      this.canvas.height / HEIGHT,
      0,
      0,
    );
    c.globalAlpha = 1;
    c.shadowBlur = 0;
    c.fillStyle = "#080d19";
    c.fillRect(0, 0, WIDTH, HEIGHT);
    const mist = c.createRadialGradient(790, 320, 0, 700, 340, 650);
    mist.addColorStop(0, "#112635");
    mist.addColorStop(0.5, "#0c1424");
    mist.addColorStop(1, "#080c17");
    c.fillStyle = mist;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    c.strokeStyle = "#a6c6df0a";
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= WIDTH; x += 40) {
      c.moveTo(x, 0);
      c.lineTo(x, HEIGHT);
    }
    for (let y = 0; y <= HEIGHT; y += 40) {
      c.moveTo(0, y);
      c.lineTo(WIDTH, y);
    }
    c.stroke();
    for (let i = 0; i < 65; i++) {
      const x = (i * 173.71 + 29) % WIDTH,
        y = (i * 97.43 + 47) % HEIGHT;
      c.fillStyle = `rgba(132,191,219,${0.13 + Math.sin(time * 0.6 + i) * 0.08})`;
      c.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    c.save();
    c.translate(WIDTH / 2, HEIGHT / 2);
    c.strokeStyle = "#4b9fbd0e";
    c.lineWidth = 1;
    for (const radius of [100, 220, 330]) {
      c.beginPath();
      c.arc(0, 0, radius, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = "#63d9c126";
    c.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);
    c.strokeStyle = "#65ffd2a0";
    c.lineWidth = 2;
    for (const [x, y, sx, sy] of [
      [20, 20, 1, 1],
      [1180, 20, -1, 1],
      [20, 660, 1, -1],
      [1180, 660, -1, -1],
    ]) {
      c.beginPath();
      c.moveTo(x + sx * 30, y);
      c.lineTo(x, y);
      c.lineTo(x, y + sy * 30);
      c.stroke();
    }
    c.font = "10px monospace";
    c.fillStyle = "#658195";
    c.fillText("SECTOR 07 / NULLSPACE", 38, 47);
    c.textAlign = "right";
    c.fillText("BOUNDARY FIELD ACTIVE", WIDTH - 38, HEIGHT - 38);
    c.textAlign = "left";
    c.save();
    if (!this.reducedMotion.matches && game.shake > 0)
      c.translate(
        Math.sin(time * 117) * game.shake,
        Math.cos(time * 103) * game.shake * 0.65,
      );
    if (game.status === "ready") {
      const center = { x: 845, y: 335 };
      c.save();
      c.translate(center.x, center.y);
      c.rotate(time * 0.12);
      c.setLineDash([4, 12]);
      c.strokeStyle = "#65ffd23b";
      c.lineWidth = 1;
      for (const r of [85, 170, 245]) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + time * (i % 2 ? 0.055 : -0.045);
        const r = 130 + (i % 3) * 65;
        this.polygon(
          center.x + Math.cos(a) * r,
          center.y + Math.sin(a) * r,
          11 + (i % 3) * 3,
          i % 3 === 0 ? 3 : 4,
          a,
          i % 3 === 0 ? COLORS.runner : COLORS.stalker,
        );
      }
      c.save();
      c.translate(center.x, center.y);
      c.scale(1.65, 1.65);
      this.ship(0, 0, -Math.PI / 2 + Math.sin(time * 0.4) * 0.2, time, false);
      c.restore();
    } else {
      if (destination && game.status === "playing") {
        c.setLineDash([3, 7]);
        c.strokeStyle = "#65ffd248";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(game.player.x, game.player.y);
        c.lineTo(destination.x, destination.y);
        c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.arc(
          destination.x,
          destination.y,
          9 + Math.sin(time * 5) * 2,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      for (const pickup of game.pickups) {
        c.save();
        c.translate(pickup.x, pickup.y);
        c.rotate(time * 1.3);
        c.shadowColor = "#65ffd2";
        c.shadowBlur = 15;
        this.polygon(0, 0, 11, 4, Math.PI / 4, "#65ffd2", "#103a33");
        c.restore();
        c.fillStyle = "#adffe6";
        c.fillRect(pickup.x - 5, pickup.y - 1, 10, 2);
        c.fillRect(pickup.x - 1, pickup.y - 5, 2, 10);
      }
      for (const enemy of game.enemies) {
        c.shadowColor = COLORS[enemy.kind];
        c.shadowBlur = this.reducedMotion.matches ? 0 : 12;
        this.polygon(
          enemy.x,
          enemy.y,
          enemy.radius,
          enemy.kind === "tank" ? 6 : enemy.kind === "runner" ? 3 : 4,
          enemy.kind === "stalker" ? time * 0.6 + enemy.id : enemy.angle,
          enemy.hit > 0 ? "#ffffff" : COLORS[enemy.kind],
          enemy.hit > 0 ? "#634b65" : "#1b142a",
        );
        c.shadowBlur = 0;
        c.fillStyle = COLORS[enemy.kind];
        c.fillRect(enemy.x - 2, enemy.y - 2, 4, 4);
        if (enemy.kind === "tank")
          for (let i = 0; i < enemy.maxHp; i++) {
            c.fillStyle = i < enemy.hp ? "#ae86ff" : "#332844";
            c.fillRect(enemy.x - 10 + i * 8, enemy.y + 30, 5, 2);
          }
      }
      c.lineCap = "round";
      c.shadowColor = "#65ffd2";
      c.shadowBlur = 12;
      for (const bullet of game.bullets) {
        c.strokeStyle = "#70fcdc";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(bullet.x - bullet.vx * 0.025, bullet.y - bullet.vy * 0.025);
        c.lineTo(bullet.x, bullet.y);
        c.stroke();
        c.fillStyle = "#ffffff";
        c.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
      }
      c.shadowBlur = 0;
      for (const particle of game.particles) {
        c.globalAlpha = particle.life / particle.maxLife;
        c.fillStyle = particle.color;
        c.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      c.globalAlpha = 1;
      if (game.pulseRing > 0) {
        c.globalAlpha = game.pulseRing / 0.65;
        c.strokeStyle = "#65ffd2";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(
          game.player.x,
          game.player.y,
          320 * (1 - game.pulseRing / 0.65),
          0,
          Math.PI * 2,
        );
        c.stroke();
        c.globalAlpha = 1;
      }
      if (game.player.hp > 0) {
        c.strokeStyle = "#65ffd22a";
        c.lineWidth = 1;
        c.beginPath();
        c.arc(game.player.x, game.player.y, 28, 0, Math.PI * 2);
        c.stroke();
        this.ship(
          game.player.x,
          game.player.y,
          game.player.angle,
          time,
          game.player.invulnerable > 0,
        );
      }
    }
    c.restore();
    if (game.player.hp < 35 && game.status === "playing") {
      const danger = c.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        240,
        WIDTH / 2,
        HEIGHT / 2,
        700,
      );
      danger.addColorStop(0, "#ff386400");
      danger.addColorStop(1, "#ff38643d");
      c.fillStyle = danger;
      c.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}
