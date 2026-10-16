import type { GameEvent } from "./game";
/** Optional synthesizer. All sounds are generated locally after a user gesture. */
export class Audio {
  enabled = false;
  private context: AudioContext | null = null;
  async toggle(): Promise<boolean> {
    try {
      if (!this.context) this.context = new AudioContext();
      await this.context.resume();
      this.enabled = !this.enabled;
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }
  play(event: GameEvent): void {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const frequencies: Record<GameEvent["kind"], number> = {
      shot: 640,
      kill: 220,
      hurt: 75,
      pulse: 120,
      heal: 880,
      phase: 330,
      won: 1046,
      lost: 90,
    };
    const c = this.context,
      oscillator = c.createOscillator(),
      gain = c.createGain();
    const duration =
      event.kind === "shot" ? 0.045 : event.kind === "pulse" ? 0.35 : 0.16;
    oscillator.type = event.kind === "hurt" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequencies[event.kind], c.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(25, frequencies[event.kind] * 0.4),
      c.currentTime + duration,
    );
    gain.gain.setValueAtTime(
      event.kind === "shot" ? 0.015 : 0.04,
      c.currentTime,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(c.destination);
    oscillator.start();
    oscillator.stop(c.currentTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
