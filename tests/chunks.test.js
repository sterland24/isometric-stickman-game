import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkCacheSize,
  chunkSeed,
  getChunk,
  pruneChunks,
} from '../src/world/chunkManager.js';

const OFF = 150;
const GRID = 2 * OFF + 1;

test('chunkSeed has no collisions on a 301x301 grid', () => {
  const seen = new Set();
  let duplicates = 0;
  for (let cx = -OFF; cx <= OFF; cx++) {
    for (let cy = -OFF; cy <= OFF; cy++) {
      const seed = chunkSeed(cx, cy);
      if (seen.has(seed)) duplicates++;
      else seen.add(seed);
    }
  }
  assert.equal(seen.size, GRID * GRID);
  assert.equal(duplicates, 0);
});

test('chunk generation is deterministic before and after eviction', () => {
  const before = JSON.stringify(getChunk(200, 200));

  pruneChunks(1e9, 1e9, 0);
  assert.equal(chunkCacheSize(), 0, 'prune should evict all chunks far from the player');

  const after = JSON.stringify(getChunk(200, 200));
  assert.equal(after, before);
});

test('average bush count per chunk stays close to 4.5', () => {
  // A region far from spawn so the spawn-clear filter does not bias the count.
  let total = 0;
  let chunks = 0;
  for (let cx = 100; cx < 140; cx++) {
    for (let cy = 100; cy < 140; cy++) {
      total += getChunk(cx, cy).length;
      chunks++;
    }
  }
  const average = total / chunks;
  assert.ok(average > 4.2 && average < 4.8, `average=${average}`);
});
