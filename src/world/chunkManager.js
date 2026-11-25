import { CONFIG } from '../config.js';
import { mulberry32 } from '../math/iso.js';
import { BUSH_TEMPLATES } from './bushData.js';

const chunks = new Map();

/**
 * Non-separable 32-bit avalanche hash for chunk coordinates.
 * Avoids the duplicate seeds produced by separable XOR hashes.
 * @param {number} x - Chunk X
 * @param {number} y - Chunk Y
 * @returns {number} 32-bit signed seed for mulberry32
 */
export function chunkSeed(x, y) {
  let h = Math.imul(x | 0, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ (y | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return h | 0;
}

/**
 * Generates or retrieves the cached list of bushes for chunk (cx, cy).
 * @param {number} cx
 * @param {number} cy
 * @returns {Array<object>}
 */
export function getChunk(cx, cy) {
  const key = `${cx},${cy}`;
  let list = chunks.get(key);
  if (list) return list;

  const rnd = mulberry32(chunkSeed(cx, cy));
  list = [];
  const count = 3 + Math.floor(rnd() * 4);

  for (let i = 0; i < count; i++) {
    const bx = (cx + rnd()) * CONFIG.CHUNK_SIZE;
    const by = (cy + rnd()) * CONFIG.CHUNK_SIZE;
    const template = BUSH_TEMPLATES[Math.floor(rnd() * BUSH_TEMPLATES.length)];
    const bush = {
      x: bx,
      y: by,
      template,
      scale: 0.5 + rnd() * 0.35,
      flip: rnd() > 0.5 ? 1 : -1,
      swayOffset: rnd() * Math.PI * 2,
      swaySpeed: 1.2 + rnd(),
      bend: 0,
    };

    if (Math.hypot(bx, by) > CONFIG.SPAWN_CLEAR_RADIUS) {
      list.push(bush);
    }
  }

  chunks.set(key, list);
  return list;
}

/**
 * Evicts distant chunks from memory when the cache grows beyond CHUNK_MAX_CACHE.
 * @param {number} playerX
 * @param {number} playerY
 */
export function pruneChunks(playerX, playerY) {
  if (chunks.size <= CONFIG.CHUNK_MAX_CACHE) return;

  const pcx = Math.floor(playerX / CONFIG.CHUNK_SIZE);
  const pcy = Math.floor(playerY / CONFIG.CHUNK_SIZE);

  for (const key of chunks.keys()) {
    const [kx, ky] = key.split(',').map(Number);
    if (Math.abs(kx - pcx) > CONFIG.CHUNK_KEEP_RADIUS || Math.abs(ky - pcy) > CONFIG.CHUNK_KEEP_RADIUS) {
      chunks.delete(key);
    }
  }
}
