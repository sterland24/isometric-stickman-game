import { CONFIG } from './config.js';
import { visibleWorldBounds } from './math/iso.js';
import { createInputManager } from './input/inputManager.js';
import { getChunk, pruneChunks } from './world/chunkManager.js';
import { cam, updateCamera } from './entities/camera.js';
import { dust, player, updatePlayer } from './entities/player.js';
import { drawFloor } from './render/floorRenderer.js';
import { drawBush } from './render/bushRenderer.js';
import { drawStickman } from './render/stickmanRenderer.js';
import { drawDust, drawHint, drawJoystick, drawPointerEffects } from './render/uiRenderer.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
resizeCanvas();

const input = createInputManager(canvas, () => ({ W, H }), cam, player);

let globalTime = 0;
let last = null;
let cleanTimer = 0;

function loop(now) {
  if (last === null) last = now;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  globalTime += dt;

  // Update simulation
  updatePlayer(dt, input, cam, W, H);
  input.updateEffects(dt);
  updateCamera(dt, player);

  // Clear & draw background + floor
  ctx.fillStyle = CONFIG.BG_COLOR;
  ctx.fillRect(0, 0, W, H);
  drawFloor(ctx, cam, W, H);
  drawPointerEffects(ctx, input, cam, W, H, globalTime);

  // Depth-sorted world entities (bushes + player)
  const bounds = visibleWorldBounds(cam, W, H, 80);
  const renderList = [];
  const cx0 = Math.floor(bounds.minX / CONFIG.CHUNK_SIZE);
  const cx1 = Math.floor(bounds.maxX / CONFIG.CHUNK_SIZE);
  const cy0 = Math.floor(bounds.minY / CONFIG.CHUNK_SIZE);
  const cy1 = Math.floor(bounds.maxY / CONFIG.CHUNK_SIZE);

  // Largest chunk distance from the player that can be on screen this frame.
  const pcx = Math.floor(player.x / CONFIG.CHUNK_SIZE);
  const pcy = Math.floor(player.y / CONFIG.CHUNK_SIZE);
  const visibleRadius = Math.max(
    Math.abs(cx0 - pcx),
    Math.abs(cx1 - pcx),
    Math.abs(cy0 - pcy),
    Math.abs(cy1 - pcy)
  );

  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      for (const bush of getChunk(cx, cy)) {
        renderList.push({ bush, depth: bush.x + bush.y });
      }
    }
  }
  renderList.push({ bush: null, depth: player.x + player.y });
  renderList.sort((a, b) => a.depth - b.depth);

  for (const item of renderList) {
    if (item.bush) {
      drawBush(ctx, item.bush, player, cam, W, H, globalTime, dt);
    } else {
      drawStickman(ctx, player, cam, W, H, globalTime);
    }
  }

  // Foreground effects & HUD
  drawDust(ctx, dust, cam, W, H);
  drawHint(ctx, player, W, H, dt);
  drawJoystick(ctx, input.joy);

  // Periodic chunk cache pruning
  cleanTimer += dt;
  if (cleanTimer > CONFIG.CHUNK_PRUNE_INTERVAL) {
    cleanTimer = 0;
    pruneChunks(player.x, player.y, visibleRadius);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
