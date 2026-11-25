import { CONFIG } from '../config.js';

/**
 * Smooth-following camera state in world coordinates.
 */
export const cam = { x: 0, y: 0 };

/**
 * Exponentially interpolates camera position toward the target entity.
 * @param {number} dt
 * @param {{ x: number, y: number }} target
 */
export function updateCamera(dt, target) {
  const factor = 1 - Math.exp(-dt * CONFIG.CAMERA_SMOOTHING);
  cam.x += (target.x - cam.x) * factor;
  cam.y += (target.y - cam.y) * factor;
}
