import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32,
  screenToWorld,
  visibleWorldBounds,
  worldToIso,
} from '../src/math/iso.js';

test('screen axes match the 2:1 isometric basis', () => {
  const cam = { x: 0, y: 0 };
  const right = worldToIso(1, -1, cam, 0, 0);
  const left = worldToIso(-1, 1, cam, 0, 0);
  const up = worldToIso(-1, -1, cam, 0, 0);
  const down = worldToIso(1, 1, cam, 0, 0);

  assert.deepEqual(right, { screenX: 2, screenY: 0 });
  assert.deepEqual(left, { screenX: -2, screenY: 0 });
  assert.deepEqual(up, { screenX: 0, screenY: -1 });
  assert.deepEqual(down, { screenX: 0, screenY: 1 });
});

test('worldToIso and screenToWorld round-trip within 1e-6', () => {
  const rnd = mulberry32(0x1234abcd);
  const cam = { x: 123.5, y: -987.25 };
  const W = 1920;
  const H = 1080;
  let maxError = 0;

  for (let i = 0; i < 100_000; i++) {
    const wx = (rnd() - 0.5) * 20_000;
    const wy = (rnd() - 0.5) * 20_000;
    const p = worldToIso(wx, wy, cam, W, H);
    const back = screenToWorld(p.screenX, p.screenY, cam, W, H);
    maxError = Math.max(maxError, Math.abs(back.wx - wx), Math.abs(back.wy - wy));
  }

  assert.ok(maxError < 1e-6, `max round-trip error=${maxError}`);
});

test('visibleWorldBounds contains every viewport corner and honors margin', () => {
  const cam = { x: 400, y: -250 };
  const W = 1280;
  const H = 720;
  const margin = 80;
  const bounds = visibleWorldBounds(cam, W, H, margin);
  const inner = visibleWorldBounds(cam, W, H, 0);

  for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const { wx, wy } = screenToWorld(sx, sy, cam, W, H);
    assert.ok(wx >= inner.minX && wx <= inner.maxX, `corner x=${wx}`);
    assert.ok(wy >= inner.minY && wy <= inner.maxY, `corner y=${wy}`);
  }

  assert.equal(bounds.minX, inner.minX - margin);
  assert.equal(bounds.maxX, inner.maxX + margin);
  assert.equal(bounds.minY, inner.minY - margin);
  assert.equal(bounds.maxY, inner.maxY + margin);

  // The viewport is centred on the camera in world space.
  assert.ok(Math.abs((inner.minX + inner.maxX) / 2 - cam.x) < 1e-9);
  assert.ok(Math.abs((inner.minY + inner.maxY) / 2 - cam.y) < 1e-9);
});

test('visibleWorldBounds covers the whole viewport for several sizes', () => {
  const cam = { x: -12.5, y: 33.25 };
  for (const [W, H] of [[390, 844], [1280, 720], [1920, 1080], [3840, 2160]]) {
    const b = visibleWorldBounds(cam, W, H, 0);
    for (let i = 0; i <= 8; i++) {
      const sx = (W * i) / 8;
      const sy = (H * (8 - i)) / 8;
      const { wx, wy } = screenToWorld(sx, sy, cam, W, H);
      assert.ok(wx >= b.minX - 1e-9 && wx <= b.maxX + 1e-9, `${W}x${H} x edge ${i}`);
      assert.ok(wy >= b.minY - 1e-9 && wy <= b.maxY + 1e-9, `${W}x${H} y edge ${i}`);
    }
  }
});
