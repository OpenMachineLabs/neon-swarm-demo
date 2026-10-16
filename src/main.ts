import "./style.css";
import { Game, PHASES, PLAYER_SPEED, PULSE_COOLDOWN } from "./game";
import { Renderer } from "./render";
import { Audio } from "./audio";
import {
  canvasPoint,
  keyboardVector,
  MOVE_KEYS,
  towardDestination,
} from "./input";
import type { Vec } from "./math";
import type { Status } from "./game";

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing interface element: ${id}`);
  return node as T;
}
element("app").innerHTML = `
<main class="shell">
  <header class="masthead">
    <a class="brand" href="./" aria-label="NEON SWARM home"><span class="brand-mark" aria-hidden="true">N</span><span>NEON<span class="brand-light">SWARM</span><small>ARCADE SYSTEMS / 001</small></span></a>
    <div class="masthead-right"><span class="connection"><i></i> LOCAL SIGNAL</span><button id="sound" class="quiet-button" aria-pressed="false">Sound off</button></div>
  </header>
  <section class="mission-header" aria-label="Mission briefing"><div><span class="eyebrow">SURVIVAL PROTOCOL</span><h1>One pilot. <span>Sixty seconds.</span></h1></div><p>Stay moving. The swarm never stops.</p></section>
  <section class="console" aria-label="NEON SWARM survival game">
    <div class="telemetry">
      <div class="health-module"><div class="metric-label">HULL INTEGRITY <strong id="health">100 <small>/ 100</small></strong></div><div class="health-track" role="progressbar" aria-label="Hull integrity" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" id="health-track"><div id="health-fill"></div></div></div>
      <div class="timer-module"><span class="metric-label">SURVIVE THE SIGNAL</span><div class="timer"><span id="timer">60.0</span><small>SEC</small></div></div>
      <div class="score-module"><span class="metric-label">SCORE <span id="combo">×1</span></span><strong id="score">000000</strong></div>
    </div>
    <div class="timeline" aria-hidden="true"><div id="timeline-fill"></div><i></i><i></i><i></i></div>
    <div class="arena" id="arena" data-state="ready">
      <canvas id="game" tabindex="0" aria-label="Arena. Move with WASD or arrow keys, or click a destination. Weapons fire automatically. Space activates a nova pulse. P pauses.">Your browser needs HTML Canvas support to play NEON SWARM.</canvas>
      <div id="overlay" class="overlay intro" role="region" aria-label="Game screen"></div>
      <div class="arena-badge" id="arena-badge"><i></i><span id="phase">SYSTEM READY</span></div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    </div>
    <div class="command-deck"><div class="run-stat"><span class="metric-label">ELIMINATED</span><strong id="kills">000</strong></div><div class="run-stat threat"><span class="metric-label">HOSTILES</span><strong id="enemies">000</strong></div><div class="pulse-wrap"><button id="pulse" disabled><span class="pulse-icon" aria-hidden="true">◎</span><span>NOVA PULSE <small id="pulse-status">READY</small></span><kbd>SPACE</kbd></button><div class="pulse-track"><div id="pulse-fill"></div></div></div><button id="pause" class="quiet-button" disabled>Pause <kbd>P</kbd></button></div>
  </section>
  <footer class="footer"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> move <span>·</span> Click to steer <span>·</span> Auto-fire engaged</p><p>PERSONAL BEST <strong id="best">000000</strong></p></footer>
  <p class="credits">BUILT WITH OPEN MACHINE <span>✦</span> NO DOWNLOADS. NO ACCOUNTS. JUST SURVIVE.</p>
</main>`;
const game = new Game();
const audio = new Audio();
const canvas = element<HTMLCanvasElement>("game");
const renderer = new Renderer(canvas);
const keys = new Set<string>();
let destination: Vec | null = null;
let shownState: Status | null = null;
let toastUntil = 0;
let lastTime = performance.now();
let best = 0;
try {
  const saved = Number(localStorage.getItem("neon-swarm-best"));
  if (Number.isFinite(saved) && saved > 0) best = Math.floor(saved);
} catch {
  /* Storage is optional, including in private browsing. */
}
const formatScore = (score: number): string => String(score).padStart(6, "0");
element("best").textContent = formatScore(best);
const refs = {
  health: element("health"),
  healthTrack: element("health-track"),
  healthFill: element("health-fill"),
  timer: element("timer"),
  score: element("score"),
  combo: element("combo"),
  kills: element("kills"),
  enemies: element("enemies"),
  phase: element("phase"),
  timeline: element("timeline-fill"),
  pulse: element<HTMLButtonElement>("pulse"),
  pulseStatus: element("pulse-status"),
  pulseFill: element("pulse-fill"),
  pause: element<HTMLButtonElement>("pause"),
  overlay: element("overlay"),
  arena: element("arena"),
  toast: element("toast"),
};
function notify(message: string): void {
  refs.toast.textContent = message;
  refs.toast.classList.add("visible");
  toastUntil = performance.now() + 2600;
}
function start(): void {
  keys.clear();
  destination = null;
  game.start();
  lastTime = performance.now();
  sync();
  canvas.focus({ preventScroll: true });
  notify("SIGNAL LIVE / Keep moving. Weapons are automatic.");
}
function pause(): void {
  game.togglePause();
  keys.clear();
  destination = null;
  lastTime = performance.now();
  sync();
  if (game.status === "playing") canvas.focus({ preventScroll: true });
}
function showScreen(): void {
  const state = game.status;
  if (shownState === state) return;
  shownState = state;
  refs.arena.dataset.state = state;
  refs.overlay.hidden = state === "playing";
  refs.overlay.className = `overlay ${state === "ready" ? "intro" : "result"}`;
  if (state === "playing") return;
  let content = "";
  if (state === "ready")
    content = `<span class="eyebrow"><i class="tiny-dot"></i> INCOMING TRANSMISSION</span><h2>OUTLAST<br>THE <em>SWARM.</em></h2><p class="screen-copy">A hostile signal. An endless pursuit.<br>Your weapons handle the aim. You handle survival.</p><button class="primary" id="screen-action">Initialize run <span>↗</span></button><div class="briefing"><span><b>60</b> SECONDS</span><span><b>04</b> THREAT LEVELS</span><span><b>01</b> PILOT</span></div>`;
  else if (state === "paused")
    content = `<span class="eyebrow">TRANSMISSION ON HOLD</span><h2>SIGNAL<br><em>PAUSED.</em></h2><p class="screen-copy">Take a breath. Your run is safe.<br>Press P or resume when ready.</p><button class="primary" id="screen-action">Resume run <span>↗</span></button>`;
  else {
    const won = state === "won";
    if (game.score > best) {
      best = game.score;
      element("best").textContent = formatScore(best);
      try {
        localStorage.setItem("neon-swarm-best", String(best));
      } catch {
        /* Continue without persistence. */
      }
    }
    content = `<span class="eyebrow">${won ? "60 SECONDS / PROTOCOL COMPLETE" : "PILOT SIGNAL LOST"}</span><h2>${won ? "SWARM" : "GAME"}<br><em>${won ? "SURVIVED." : "OVER."}</em></h2><p class="screen-copy">${won ? "You outlasted the noise. The sector is yours." : "The swarm got through. Every run is a new signal."}</p><div class="result-stats"><span>SCORE<b>${formatScore(game.score)}</b></span><span>ELIMINATED<b>${game.kills}</b></span><span>SURVIVED<b>${game.elapsed.toFixed(1)}s</b></span></div><button class="primary" id="screen-action">${won ? "Play again" : "Try again"} <span>↻</span></button><p class="restart-hint">R to restart · Use Nova Pulse when surrounded</p>`;
  }
  refs.overlay.innerHTML = `<div class="screen">${content}</div>`;
  element<HTMLButtonElement>("screen-action").addEventListener(
    "click",
    state === "paused" ? pause : start,
  );
  if (state !== "ready")
    element("screen-action").focus({ preventScroll: true });
}
function sync(): void {
  refs.health.innerHTML = `${game.player.hp} <small>/ 100</small>`;
  refs.healthTrack.setAttribute("aria-valuenow", String(game.player.hp));
  refs.healthFill.style.width = `${game.player.hp}%`;
  refs.healthTrack.classList.toggle("critical", game.player.hp < 35);
  refs.timer.textContent = game.remaining.toFixed(1);
  refs.timer.classList.toggle(
    "urgent",
    game.remaining <= 10 && game.status === "playing",
  );
  refs.score.textContent = formatScore(game.score);
  refs.combo.textContent = `×${game.multiplier}`;
  refs.kills.textContent = String(game.kills).padStart(3, "0");
  refs.enemies.textContent = String(game.enemies.length).padStart(3, "0");
  refs.phase.textContent =
    game.status === "ready"
      ? "SYSTEM READY"
      : `${String(game.phase + 1).padStart(2, "0")} / ${PHASES[game.phase]}`;
  refs.timeline.style.width = `${(game.elapsed / 60) * 100}%`;
  refs.pulse.disabled = game.status !== "playing" || game.pulseCooldown > 0;
  refs.pulseStatus.textContent =
    game.pulseCooldown > 0 ? `${game.pulseCooldown.toFixed(1)}s` : "READY";
  refs.pulseFill.style.width = `${(1 - game.pulseCooldown / PULSE_COOLDOWN) * 100}%`;
  refs.pause.disabled = game.status !== "playing" && game.status !== "paused";
  refs.pause.innerHTML = `${game.status === "paused" ? "Resume" : "Pause"} <kbd>P</kbd>`;
  showScreen();
}
window.addEventListener("keydown", (event) => {
  if (MOVE_KEYS.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
    destination = null;
  }
  if (event.repeat) return;
  if (event.code === "Space" && game.status === "playing") {
    event.preventDefault();
    game.pulse();
  }
  if (
    (event.code === "KeyP" || event.code === "Escape") &&
    (game.status === "playing" || game.status === "paused")
  ) {
    event.preventDefault();
    pause();
  }
  if (
    event.code === "KeyR" &&
    (game.status === "lost" || game.status === "won")
  )
    start();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
function suspend(): void {
  keys.clear();
  destination = null;
  if (game.status === "playing") pause();
}
window.addEventListener("blur", suspend);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) suspend();
});
canvas.addEventListener("pointerdown", (event) => {
  if (
    game.status !== "playing" ||
    (event.pointerType === "mouse" && event.button !== 0)
  )
    return;
  destination = canvasPoint(
    { x: event.clientX, y: event.clientY },
    canvas.getBoundingClientRect(),
  );
  canvas.focus({ preventScroll: true });
});
refs.pulse.addEventListener("click", () => {
  game.pulse();
  canvas.focus({ preventScroll: true });
});
refs.pause.addEventListener("click", pause);
element("sound").addEventListener("click", async () => {
  const enabled = await audio.toggle();
  element("sound").setAttribute("aria-pressed", String(enabled));
  element("sound").textContent = enabled ? "Sound on" : "Sound off";
});
function frame(now: number): void {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  let movement = keyboardVector(keys);
  if (!movement.x && !movement.y && destination) {
    movement = towardDestination(game.player, destination, dt, PLAYER_SPEED);
    if (!movement.x && !movement.y) destination = null;
  }
  game.step(dt, movement);
  for (const event of game.drainEvents()) {
    audio.play(event);
    if (event.kind === "phase")
      notify(`THREAT ${game.phase + 1} / ${PHASES[game.phase]}`);
    if (event.kind === "heal") notify("HULL REPAIRED / +18 integrity");
    if (event.kind === "hurt" && game.player.hp < 35)
      notify("CRITICAL HULL / Move. Pulse. Survive.");
    if (event.kind === "pulse")
      notify("NOVA RELEASED / Make some breathing room.");
  }
  if (now > toastUntil) refs.toast.classList.remove("visible");
  sync();
  renderer.draw(game, now / 1000, destination);
  requestAnimationFrame(frame);
}
sync();
requestAnimationFrame(frame);
