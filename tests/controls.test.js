import test from 'node:test';
import assert from 'node:assert/strict';
import { updatePlayer, player, dust } from '../src/entities/player.js';
import { worldToIso } from '../src/math/iso.js';

const DT = 1 / 60;
const CAM = { x: 0, y: 0 };
const W = 1920;
const H = 1080;

function makeInput() {
  return {
    keys: { up: false, down: false, left: false, right: false, run: false },
    joy: { active: false, baseX: 0, baseY: 0, knobX: 0, knobY: 0, running: false },
    mousePtr: { down: false, sx: 0, sy: 0 },
    tapTarget: null,
    clearTapTarget() { this.tapTarget = null; },
    getMouseRunThreshold() { return 120; },
  };
}

function resetPlayer() {
  Object.assign(player, {
    x: 0, y: 0, vx: 0, vy: 0, phase: 0, face: 1, strideDirX: 1, strideDirY: 0,
  });
  dust.length = 0;
}

/** Simulates one second of holding the given keys and returns screen deltas. */
function simulate(keys, frames = 60) {
  resetPlayer();
  const input = makeInput();
  Object.assign(input.keys, keys);
  for (let i = 0; i < frames; i++) updatePlayer(DT, input, CAM, W, H);

  const start = worldToIso(0, 0, CAM, W, H);
  const end = worldToIso(player.x, player.y, CAM, W, H);
  return {
    sx: end.screenX - start.screenX,
    sy: end.screenY - start.screenY,
    wx: player.x,
    wy: player.y,
  };
}

function angleDeg({ sx, sy }) {
  return (Math.atan2(sy, sx) * 180) / Math.PI;
}

test('single keys move along the expected screen axis', () => {
  const up = simulate({ up: true });
  assert.ok(Math.abs(up.sx) < 1e-9, `up x=${up.sx}`);
  assert.ok(Math.abs(up.sy + 106) < 2, `up y=${up.sy}`);

  const down = simulate({ down: true });
  assert.ok(Math.abs(down.sx) < 1e-9, `down x=${down.sx}`);
  assert.ok(Math.abs(down.sy - 106) < 2, `down y=${down.sy}`);

  const left = simulate({ left: true });
  assert.ok(Math.abs(left.sx + 212) < 2, `left x=${left.sx}`);
  assert.ok(Math.abs(left.sy) < 1e-9, `left y=${left.sy}`);

  const right = simulate({ right: true });
  assert.ok(Math.abs(right.sx - 212) < 2, `right x=${right.sx}`);
  assert.ok(Math.abs(right.sy) < 1e-9, `right y=${right.sy}`);
});

test('D / ArrowRight is the mirror of A / ArrowLeft, not a duplicate of S', () => {
  const left = simulate({ left: true });
  const right = simulate({ right: true });
  const down = simulate({ down: true });

  assert.ok(Math.abs(left.sx + right.sx) < 1e-9);
  assert.ok(Math.abs(left.sy + right.sy) < 1e-9);
  // Regression guard: right used to produce the same screen vector as down.
  assert.ok(Math.abs(right.sx - down.sx) > 100);
  assert.ok(Math.abs(right.sy - down.sy) > 100);
});

test('diagonals point at the expected screen angles', () => {
  const cases = [
    [{ up: true, right: true }, -26.565],
    [{ up: true, left: true }, -153.435],
    [{ down: true, right: true }, 26.565],
    [{ down: true, left: true }, 153.435],
  ];
  for (const [keys, expected] of cases) {
    const r = simulate(keys);
    assert.ok(Math.hypot(r.sx, r.sy) > 10, `${JSON.stringify(keys)} did not move`);
    assert.ok(
      Math.abs(angleDeg(r) - expected) < 0.5,
      `${JSON.stringify(keys)} angle=${angleDeg(r).toFixed(3)} expected=${expected}`
    );
  }
});

test('opposite keys cancel each other', () => {
  for (const keys of [{ left: true, right: true }, { up: true, down: true }]) {
    const r = simulate(keys);
    assert.equal(r.wx, 0);
    assert.equal(r.wy, 0);
    assert.equal(r.sx, 0);
    assert.equal(r.sy, 0);
  }
});

test('gait direction follows screen travel and survives going idle', () => {
  resetPlayer();
  const input = makeInput();
  input.keys.up = true;
  for (let i = 0; i < 120; i++) updatePlayer(DT, input, CAM, W, H);
  assert.ok(Math.abs(player.strideDirX) < 1e-9);
  assert.ok(Math.abs(player.strideDirY + 1) < 1e-9);

  input.keys.up = false;
  for (let i = 0; i < 120; i++) updatePlayer(DT, input, CAM, W, H);
  assert.ok(Math.abs(player.strideDirX) < 1e-9);
  assert.ok(Math.abs(player.strideDirY + 1) < 1e-9);
  assert.ok(Number.isFinite(player.strideDirX) && Number.isFinite(player.strideDirY));
});

test('a 180-degree reversal turns the gait gradually', () => {
  resetPlayer();
  // Start facing screen-right, then move screen-left with an immediate left velocity.
  player.strideDirX = 1;
  player.strideDirY = 0;
  player.vx = -100;
  player.vy = 100;

  const input = makeInput();
  input.keys.left = true;
  updatePlayer(DT, input, CAM, W, H);

  assert.ok(Math.abs(Math.hypot(player.strideDirX, player.strideDirY) - 1) < 1e-9);
  assert.ok(player.strideDirX < 0.999, 'direction should start changing in the first frame');
  assert.ok(player.strideDirX > -0.999, `direction jumped to ${player.strideDirX} in one frame`);

  for (let i = 0; i < 180; i++) updatePlayer(DT, input, CAM, W, H);
  assert.ok(player.strideDirX < -0.999);
  assert.ok(Math.abs(player.strideDirY) < 0.01);
  assert.ok(Number.isFinite(player.strideDirX) && Number.isFinite(player.strideDirY));
});
