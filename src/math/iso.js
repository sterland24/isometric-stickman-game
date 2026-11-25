/**
 * Isometric 2:1 projection utilities and deterministic PRNG.
 */

/**
 * Converts world coordinates (wx, wy) to screen coordinates relative to camera and viewport.
 * @param {number} wx
 * @param {number} wy
 * @param {{ x: number, y: number }} cam
 * @param {number} W - Viewport width
 * @param {number} H - Viewport height
 * @returns {{ screenX: number, screenY: number }}
 */
export function worldToIso(wx, wy, cam, W, H) {
  return {
    screenX: W / 2 + (wx - cam.x) - (wy - cam.y),
    screenY: H / 2 + ((wx - cam.x) + (wy - cam.y)) * 0.5,
  };
}

/**
 * Converts screen coordinates (sx, sy) back to world coordinates (wx, wy).
 * @param {number} sx
 * @param {number} sy
 * @param {{ x: number, y: number }} cam
 * @param {number} W - Viewport width
 * @param {number} H - Viewport height
 * @returns {{ wx: number, wy: number }}
 */
export function screenToWorld(sx, sy, cam, W, H) {
  const a = sx - W / 2;
  const b = 2 * (sy - H / 2);
  return {
    wx: cam.x + (a + b) / 2,
    wy: cam.y + (b - a) / 2,
  };
}

/**
 * Computes the axis-aligned bounding box in world space that covers the visible viewport.
 * @param {{ x: number, y: number }} cam
 * @param {number} W
 * @param {number} H
 * @param {number} margin - Extra world-space padding
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
export function visibleWorldBounds(cam, W, H, margin = 0) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const { wx, wy } = screenToWorld(sx, sy, cam, W, H);
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy;
    if (wy > maxY) maxY = wy;
  }

  return {
    minX: minX - margin,
    maxX: maxX + margin,
    minY: minY - margin,
    maxY: maxY + margin,
  };
}

/**
 * Deterministic 32-bit PRNG (Mulberry32) for repeatable chunk generation.
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
