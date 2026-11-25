import { CONFIG } from '../config.js';
import { visibleWorldBounds, worldToIso } from '../math/iso.js';

/**
 * Draws the subtle isometric dotted floor grid across the visible viewport.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }} cam
 * @param {number} W
 * @param {number} H
 */
export function drawFloor(ctx, cam, W, H) {
  const step = CONFIG.FLOOR_STEP;
  const bounds = visibleWorldBounds(cam, W, H, step);
  const fadeRadius = Math.max(CONFIG.FLOOR_MIN_RADIUS, Math.hypot(W * 0.5, H) * 0.75);

  const i0 = Math.floor(bounds.minX / step);
  const i1 = Math.ceil(bounds.maxX / step);
  const j0 = Math.floor(bounds.minY / step);
  const j1 = Math.ceil(bounds.maxY / step);

  ctx.fillStyle = '#000';
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const wx = i * step;
      const wy = j * step;
      const p = worldToIso(wx, wy, cam, W, H);
      if (p.screenX < -4 || p.screenX > W + 4 || p.screenY < -4 || p.screenY > H + 4) continue;

      const d = Math.hypot(wx - cam.x, wy - cam.y);
      if (d > fadeRadius) continue;

      ctx.globalAlpha = (1 - d / fadeRadius) * 0.16;
      ctx.fillRect(p.screenX - 1, p.screenY - 0.5, 2, 1.2);
    }
  }
  ctx.globalAlpha = 1;
}
