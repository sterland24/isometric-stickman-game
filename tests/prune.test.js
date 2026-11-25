import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { visibleWorldBounds } from '../src/math/iso.js';
import {
  chunkCacheSize,
  getChunk,
  pruneChunks,
} from '../src/world/chunkManager.js';

const VIEWPORTS = [
  [390, 844],
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
];

const PLAYER = { x: 0, y: 0 };
// Camera lag keeps the player slightly off-centre.
const CAM = { x: PLAYER.x + 70, y: PLAYER.y - 45 };

function visibleChunkRange(W, H) {
  const bounds = visibleWorldBounds(CAM, W, H, 80);
  return {
    cx0: Math.floor(bounds.minX / CONFIG.CHUNK_SIZE),
    cx1: Math.floor(bounds.maxX / CONFIG.CHUNK_SIZE),
    cy0: Math.floor(bounds.minY / CONFIG.CHUNK_SIZE),
    cy1: Math.floor(bounds.maxY / CONFIG.CHUNK_SIZE),
  };
}

function visibleRadius(W, H) {
  const { cx0, cx1, cy0, cy1 } = visibleChunkRange(W, H);
  const pcx = Math.floor(PLAYER.x / CONFIG.CHUNK_SIZE);
  const pcy = Math.floor(PLAYER.y / CONFIG.CHUNK_SIZE);
  return Math.max(
    Math.abs(cx0 - pcx),
    Math.abs(cx1 - pcx),
    Math.abs(cy0 - pcy),
    Math.abs(cy1 - pcy)
  );
}

test('pruneChunks never evicts a chunk that is currently visible', () => {
  for (const [W, H] of VIEWPORTS) {
    const { cx0, cx1, cy0, cy1 } = visibleChunkRange(W, H);
    const visible = [];
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        visible.push([cx, cy, getChunk(cx, cy)]);
      }
    }

    const radius = visibleRadius(W, H);
    pruneChunks(PLAYER.x, PLAYER.y, radius);

    for (const [cx, cy, list] of visible) {
      assert.equal(
        getChunk(cx, cy),
        list,
        `${W}x${H}: chunk ${cx},${cy} was evicted while visible`
      );
    }

    const budget =
      (2 * (Math.max(CONFIG.CHUNK_KEEP_RADIUS, radius) + CONFIG.CHUNK_CACHE_MARGIN) + 1) ** 2;
    assert.ok(
      chunkCacheSize() <= budget,
      `${W}x${H}: cache=${chunkCacheSize()} exceeds budget=${budget}`
    );
  }
});

test('the cache stays bounded after travelling far away', () => {
  for (let cx = 1000; cx < 1050; cx++) getChunk(cx, 1000);
  assert.ok(chunkCacheSize() > 0);

  pruneChunks(350_000, 350_000, 0);
  assert.equal(chunkCacheSize(), 0);

  getChunk(972, 972);
  assert.equal(chunkCacheSize(), 1);
});
