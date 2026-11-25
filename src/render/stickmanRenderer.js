import { CONFIG } from '../config.js';
import { worldToIso } from '../math/iso.js';

/**
 * Draws the stickman character with procedural stride, arm swing, lean, and shadow.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player
 * @param {{ x: number, y: number }} cam
 * @param {number} W
 * @param {number} H
 * @param {number} time
 */
export function drawStickman(ctx, player, cam, W, H, time) {
  const pos = worldToIso(player.x, player.y, cam, W, H);
  const px = pos.screenX;
  const py = pos.screenY;

  const sp = Math.hypot(player.vx, player.vy);
  const m = Math.min(1, sp / CONFIG.WALK_SPEED);
  const run = Math.min(1, Math.max(0, (sp - CONFIG.WALK_SPEED) / (CONFIG.RUN_SPEED - CONFIG.WALK_SPEED)));
  const f = player.face;
  const ph = player.phase;
  const dirX = player.strideDirX ?? 1;
  const dirY = player.strideDirY ?? 0;

  const bob = Math.abs(Math.sin(ph)) * (2.2 + run * 1.5) * m + Math.sin(time * 2.2) * 0.6 * (1 - m);
  const lean = f * m * (2 + run * 3);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.beginPath();
  ctx.ellipse(px, py, 14 - bob * 0.6, 7 - bob * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CONFIG.INK_COLOR;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hipY = py - player.legLength - bob;
  const neckY = hipY - player.bodyHeight;
  const neckX = px + lean;
  const swing = (9 + run * 5) * m;
  const s = Math.sin(ph);
  const c = Math.cos(ph);

  // Legs
  ctx.lineWidth = 3.4;
  for (const side of [1, -1]) {
    const sw = s * side;
    const lift = Math.max(0, c * side) * (4 + run * 3) * m;
    const stride = sw * swing;
    const fx = px + side * 3 + stride * dirX;
    const fy = py - lift + stride * dirY;
    const kx = (px + fx) / 2 + f * 3 * m;
    const ky = (hipY + fy) / 2;
    ctx.beginPath();
    ctx.moveTo(px, hipY);
    ctx.quadraticCurveTo(kx, ky, fx, fy);
    ctx.stroke();
  }

  // Arms
  ctx.lineWidth = 3;
  const shoulderY = neckY + 8;
  const sx0 = px + lean * 0.85;
  for (const side of [1, -1]) {
    const sw = -s * side;
    const handStride = sw * swing * 0.9;
    const ctrlStride = sw * swing * 0.35;
    const hx = sx0 + side * 3 + handStride * dirX;
    const hy = shoulderY + 17 - Math.abs(sw) * 1.5 * m + handStride * dirY;
    ctx.beginPath();
    ctx.moveTo(sx0, shoulderY);
    ctx.quadraticCurveTo(
      sx0 + side * 4 + ctrlStride * dirX,
      shoulderY + 9 + ctrlStride * dirY,
      hx,
      hy
    );
    ctx.stroke();
  }

  // Torso
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(px, hipY);
  ctx.quadraticCurveTo(px + lean * 0.3, (hipY + neckY) / 2, neckX, neckY);
  ctx.stroke();

  // Head
  const hx = neckX + f * m * 1.5;
  const hy = neckY - player.headRadius;
  ctx.fillStyle = CONFIG.BG_COLOR;
  ctx.beginPath();
  ctx.arc(hx, hy, player.headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.fillStyle = CONFIG.INK_COLOR;
  ctx.beginPath();
  ctx.arc(hx + f * 5.5, hy - 1.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
}
