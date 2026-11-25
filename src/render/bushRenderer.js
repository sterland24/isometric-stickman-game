import { CONFIG } from '../config.js';
import { worldToIso } from '../math/iso.js';

/**
 * Draws an isometric bush with ambient wind sway and player-proximity bending.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} bush
 * @param {{ x: number, y: number }} player
 * @param {{ x: number, y: number }} cam
 * @param {number} W
 * @param {number} H
 * @param {number} time
 * @param {number} dt
 */
export function drawBush(ctx, bush, player, cam, W, H, time, dt) {
  const pos = worldToIso(bush.x, bush.y, cam, W, H);

  const ddx = bush.x - player.x;
  const ddy = bush.y - player.y;
  const d = Math.hypot(ddx, ddy);
  const reach = 48;
  let target = 0;
  if (d < reach) {
    const dirScreen = (ddx - ddy) >= 0 ? 1 : -1;
    target = dirScreen * (1 - d / reach) * 10;
  }
  bush.bend += (target - bush.bend) * Math.min(1, dt * 9);

  const wind = Math.sin(time * bush.swaySpeed + bush.swayOffset) * 1.3
    + Math.sin(time * 0.5 + (bush.x + bush.y) * 0.004) * 1.4;
  const bendLocal = bush.bend * bush.flip;

  ctx.save();
  ctx.translate(pos.screenX, pos.screenY);
  ctx.scale(bush.flip * bush.scale, bush.scale);
  ctx.strokeStyle = CONFIG.INK_COLOR;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';

  bush.template.branches.forEach((b, idx) => {
    const height = -b.ey / 22;
    const f = height * (idx % 2 === 0 ? 1 : 0.8);
    const tipX = b.ex + (wind + bendLocal) * f;
    const tipY = b.ey + Math.abs(bendLocal) * 0.25 * height;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(b.cpx + (wind + bendLocal) * f * 0.4, b.cpy, tipX, tipY);
    ctx.stroke();
  });

  ctx.restore();
}
