import { clamp, distance, normalize } from "./math";
import { HEIGHT, WIDTH } from "./game";
import type { Vec } from "./math";
export const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);
export function keyboardVector(keys: ReadonlySet<string>): Vec {
  return normalize({
    x:
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")),
    y:
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      Number(keys.has("KeyW") || keys.has("ArrowUp")),
  });
}
export function canvasPoint(
  client: Vec,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): Vec {
  return {
    x: clamp(
      ((client.x - rect.left) / Math.max(1, rect.width)) * WIDTH,
      30,
      WIDTH - 30,
    ),
    y: clamp(
      ((client.y - rect.top) / Math.max(1, rect.height)) * HEIGHT,
      30,
      HEIGHT - 30,
    ),
  };
}
export function towardDestination(
  player: Vec,
  target: Vec | null,
  dt: number,
  speed: number,
): Vec {
  if (!target) return { x: 0, y: 0 };
  // Stop before overshooting; input never teleports the player.
  if (distance(player, target) <= Math.max(3, dt * speed))
    return { x: 0, y: 0 };
  return normalize({ x: target.x - player.x, y: target.y - player.y });
}
