import { CONFIG } from '../config.js';
import { screenToWorld, worldToIso } from '../math/iso.js';

/**
 * Player entity state in world space.
 */
export const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  phase: 0,
  face: 1,
  // Last non-zero screen-space travel direction, used to orient the gait.
  strideDirX: 1,
  strideDirY: 0,
  headRadius: CONFIG.PLAYER_HEAD_RADIUS,
  bodyHeight: CONFIG.PLAYER_BODY_HEIGHT,
  legLength: CONFIG.PLAYER_LEG_LENGTH,
};

/**
 * Active dust particles emitted while running, stored in world space (wx, wy, z).
 */
export const dust = [];

let stepSide = 0;

function spawnDust(wx, wy, dir) {
  if (dust.length >= CONFIG.MAX_DUST_PARTICLES) dust.shift();
  const vxScreen = -dir * (4 + Math.random() * 8);
  dust.push({
    wx,
    wy,
    z: 0,
    vwx: vxScreen * 0.5,
    vwy: -vxScreen * 0.5,
    vz: 4 + Math.random() * 6,
    life: 1,
  });
}

/**
 * Updates player movement, acceleration, gait phase, and dust particles.
 * @param {number} dt
 * @param {object} input - Input controller returned by createInputManager
 * @param {{ x: number, y: number }} cam
 * @param {number} W
 * @param {number} H
 */
export function updatePlayer(dt, input, cam, W, H) {
  const { keys, joy, mousePtr } = input;
  let dx = 0;
  let dy = 0;
  let desiredSpeed = 0;
  let isRunning = false;

  if (keys.up) { dx -= 1; dy -= 1; }
  if (keys.down) { dx += 1; dy += 1; }
  if (keys.left) { dx -= 1; dy += 1; }
  if (keys.right) { dx += 1; dy -= 1; }

  const hasKeyInput = dx !== 0 || dy !== 0;

  if (hasKeyInput) {
    input.clearTapTarget();
    isRunning = keys.run;
    desiredSpeed = isRunning ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;
  } else if (joy.active) {
    const jx = joy.knobX - joy.baseX;
    const jy = joy.knobY - joy.baseY;
    const jd = Math.hypot(jx, jy);

    if (jd > CONFIG.JOY_DEADZONE) {
      const ratio = Math.min(1, (jd - CONFIG.JOY_DEADZONE) / (CONFIG.JOY_MAX_R - CONFIG.JOY_DEADZONE));
      // Convert screen-space joystick vector to 2:1 isometric world direction
      dx = jx + 2 * jy;
      dy = 2 * jy - jx;

      if (ratio > 0.76) {
        const runT = (ratio - 0.76) / 0.24;
        desiredSpeed = CONFIG.WALK_SPEED + (CONFIG.RUN_SPEED - CONFIG.WALK_SPEED) * runT;
        isRunning = runT > 0.2;
      } else {
        const walkT = ratio / 0.76;
        desiredSpeed = CONFIG.WALK_SPEED * (0.3 + 0.7 * walkT);
      }
    }
    joy.running = isRunning;
  } else if (mousePtr.down) {
    const pScr = worldToIso(player.x, player.y, cam, W, H);
    const sDist = Math.hypot(mousePtr.sx - pScr.screenX, mousePtr.sy - pScr.screenY);
    if (sDist > 14) {
      const target = screenToWorld(mousePtr.sx, mousePtr.sy, cam, W, H);
      dx = target.wx - player.x;
      dy = target.wy - player.y;

      const runStart = input.getMouseRunThreshold();
      const runFull = runStart + 70;
      if (sDist >= runStart) {
        const t = Math.min(1, (sDist - runStart) / (runFull - runStart));
        desiredSpeed = CONFIG.WALK_SPEED + (CONFIG.RUN_SPEED - CONFIG.WALK_SPEED) * t;
        isRunning = t > 0.25;
      } else {
        const t = Math.min(1, (sDist - 14) / 36);
        desiredSpeed = CONFIG.WALK_SPEED * (0.4 + 0.6 * t);
      }
    }
  } else if (input.tapTarget) {
    dx = input.tapTarget.wx - player.x;
    dy = input.tapTarget.wy - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      input.clearTapTarget();
      dx = 0;
      dy = 0;
    } else {
      isRunning = input.tapTarget.run && dist > 60;
      const baseMax = isRunning ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;
      desiredSpeed = Math.min(baseMax, Math.max(45, dist * 4.5));
    }
  }

  const len = Math.hypot(dx, dy);
  const tx = len ? (dx / len) * desiredSpeed : 0;
  const ty = len ? (dy / len) * desiredSpeed : 0;

  // Smooth exponential acceleration & braking
  const k = 1 - Math.exp(-dt * (len ? 10 : 12));
  player.vx += (tx - player.vx) * k;
  player.vy += (ty - player.vy) * k;
  if (!len && Math.hypot(player.vx, player.vy) < 2) {
    player.vx = 0;
    player.vy = 0;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const sp = Math.hypot(player.vx, player.vy);
  if (sp > 4) player.phase += sp * dt * 0.065;

  const sxv = player.vx - player.vy;
  const syv = (player.vx + player.vy) / 2;
  if (Math.abs(sxv) > 8) player.face = sxv > 0 ? 1 : -1;

  // Remember the last screen-space direction and ease toward the new one so
  // sharp turns do not snap the legs. Angular interpolation keeps a 180°
  // reversal gradual instead of flipping through a zero-length vector.
  const svLen = Math.hypot(sxv, syv);
  if (svLen > 1e-4) {
    const targetX = sxv / svLen;
    const targetY = syv / svLen;
    const curLen = Math.hypot(player.strideDirX, player.strideDirY);
    if (curLen < 1e-6) {
      player.strideDirX = targetX;
      player.strideDirY = targetY;
    } else {
      const from = Math.atan2(player.strideDirY / curLen, player.strideDirX / curLen);
      const to = Math.atan2(targetY, targetX);
      const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
      const k = 1 - Math.exp(-dt * CONFIG.GAIT_DIR_SMOOTHING);
      const angle = from + delta * k;
      player.strideDirX = Math.cos(angle);
      player.strideDirY = Math.sin(angle);
    }
  }

  // Spawn footstep dust while running
  const side = Math.floor(player.phase / Math.PI);
  if (side !== stepSide && isRunning && sp > 100) {
    spawnDust(player.x, player.y, player.face);
  }
  stepSide = side;

  // Update active dust particles
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.life -= dt * 2.2;
    d.wx += d.vwx * dt;
    d.wy += d.vwy * dt;
    d.z += d.vz * dt;
    if (d.life <= 0) dust.splice(i, 1);
  }
}
