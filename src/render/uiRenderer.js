import { CONFIG } from '../config.js';
import { worldToIso } from '../math/iso.js';

let hintAlpha = 1;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

/**
 * Draws click/tap ripples, active tap target indicator, and mouse drag reticle.
 */
export function drawPointerEffects(ctx, input, cam, W, H, time) {
  ctx.strokeStyle = CONFIG.INK_COLOR;

  for (const r of input.ripples) {
    const p = worldToIso(r.wx, r.wy, cam, W, H);
    const rx = 5 + (1 - r.life) * 22;
    ctx.globalAlpha = Math.max(0, r.life) * 0.25;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.screenX, p.screenY, rx, rx * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (input.tapTarget) {
    const p = worldToIso(input.tapTarget.wx, input.tapTarget.wy, cam, W, H);
    const rx = 7 + Math.sin(time * 6) * 1.5;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.screenX, p.screenY, rx, rx * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (input.mousePtr.down) {
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(input.mousePtr.sx, input.mousePtr.sy, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/**
 * Draws world-anchored dust particles emitted while running.
 */
export function drawDust(ctx, dust, cam, W, H) {
  ctx.fillStyle = '#000';
  for (const d of dust) {
    const p = worldToIso(d.wx, d.wy, cam, W, H);
    ctx.globalAlpha = Math.max(0, d.life) * 0.12;
    ctx.beginPath();
    ctx.arc(p.screenX, p.screenY - d.z, 2 + (1 - d.life) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws the control hint text at the bottom and fades it out once the player moves.
 */
export function drawHint(ctx, player, W, H, dt) {
  if (player.vx || player.vy) hintAlpha = Math.max(0, hintAlpha - dt * 0.8);
  if (hintAlpha <= 0) return;

  ctx.globalAlpha = hintAlpha * 0.45;
  ctx.fillStyle = CONFIG.INK_COLOR;
  const fontSize = W < 480 ? 12 : 14;
  ctx.font = `${fontSize}px system-ui, Tahoma, sans-serif`;
  ctx.textAlign = 'center';

  if (isCoarsePointer || W < 560) {
    ctx.fillText('انگشت را هر جای صفحه بکشید (جوی‌استیک شناور)', W / 2, H - 44);
    ctx.fillText('برای دویدن، انگشت را تا لبه دایره بکشید', W / 2, H - 24);
  } else {
    ctx.fillText('WASD، جهت‌ها یا کلیک و کشیدن موس برای حرکت  •  Shift برای دویدن', W / 2, H - 34);
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws the floating touch virtual joystick.
 */
export function drawJoystick(ctx, joy) {
  if (joy.alpha < 0.01) return;
  const a = joy.alpha;

  ctx.save();
  ctx.beginPath();
  ctx.arc(joy.baseX, joy.baseY, CONFIG.JOY_MAX_R, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * a})`;
  ctx.fill();
  ctx.lineWidth = joy.running ? 2 : 1.5;
  ctx.strokeStyle = `rgba(21, 21, 21, ${(joy.running ? 0.34 : 0.16) * a})`;
  ctx.stroke();

  // Four subtle directional ticks
  ctx.strokeStyle = `rgba(21, 21, 21, ${0.18 * a})`;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const ang = i * (Math.PI / 2);
    const r1 = CONFIG.JOY_MAX_R - 7;
    const r2 = CONFIG.JOY_MAX_R - 2;
    ctx.beginPath();
    ctx.moveTo(joy.baseX + Math.cos(ang) * r1, joy.baseY + Math.sin(ang) * r1);
    ctx.lineTo(joy.baseX + Math.cos(ang) * r2, joy.baseY + Math.sin(ang) * r2);
    ctx.stroke();
  }

  // Guide line from base to knob
  ctx.beginPath();
  ctx.moveTo(joy.baseX, joy.baseY);
  ctx.lineTo(joy.knobX, joy.knobY);
  ctx.strokeStyle = `rgba(21, 21, 21, ${0.14 * a})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Thumb knob
  ctx.beginPath();
  ctx.arc(joy.knobX, joy.knobY, 20, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(21, 21, 21, ${(joy.running ? 0.22 : 0.1) * a})`;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(21, 21, 21, ${(joy.running ? 0.72 : 0.45) * a})`;
  ctx.stroke();

  ctx.restore();
}
