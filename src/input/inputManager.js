import { CONFIG } from '../config.js';
import { screenToWorld, worldToIso } from '../math/iso.js';

const KEY_MAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

/**
 * Manages keyboard, mouse drag/tap, and touch virtual joystick inputs.
 * @param {HTMLCanvasElement} canvas
 * @param {() => { W: number, H: number }} getViewSize
 * @param {{ x: number, y: number }} cam
 * @param {{ x: number, y: number }} player
 */
export function createInputManager(canvas, getViewSize, cam, player) {
  const keys = { up: false, down: false, left: false, right: false, run: false };

  const joy = {
    active: false,
    id: null,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    moved: false,
    alpha: 0,
    running: false,
  };

  const mousePtr = {
    down: false,
    id: null,
    sx: 0,
    sy: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    dragged: false,
  };

  const ripples = [];

  const state = {
    keys,
    joy,
    mousePtr,
    ripples,
    tapTarget: null,
    clearTapTarget() {
      state.tapTarget = null;
    },
    getMouseRunThreshold() {
      const { W, H } = getViewSize();
      return Math.max(95, Math.min(165, Math.min(W, H) * 0.28));
    },
    updateEffects(dt) {
      const targetJoyAlpha = joy.active ? 1 : 0;
      joy.alpha += (targetJoyAlpha - joy.alpha) * Math.min(1, dt * 15);
      if (!joy.active && joy.alpha > 0.01) {
        const ret = Math.min(1, dt * 18);
        joy.knobX += (joy.baseX - joy.knobX) * ret;
        joy.knobY += (joy.baseY - joy.knobY) * ret;
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].life -= dt * 2.4;
        if (ripples[i].life <= 0) ripples.splice(i, 1);
      }
    },
  };

  function addRipple(wx, wy) {
    ripples.push({ wx, wy, life: 1 });
    if (ripples.length > 6) ripples.shift();
  }

  window.addEventListener('keydown', (e) => {
    if (KEY_MAP[e.code]) {
      keys[KEY_MAP[e.code]] = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (KEY_MAP[e.code]) keys[KEY_MAP[e.code]] = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const { W, H } = getViewSize();

    if (e.pointerType === 'mouse') {
      if (e.button !== 0 || mousePtr.down) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

      mousePtr.down = true;
      mousePtr.id = e.pointerId;
      mousePtr.sx = mousePtr.startX = e.clientX;
      mousePtr.sy = mousePtr.startY = e.clientY;
      mousePtr.startTime = performance.now();
      mousePtr.dragged = false;
      state.tapTarget = null;

      const wPos = screenToWorld(e.clientX, e.clientY, cam, W, H);
      addRipple(wPos.wx, wPos.wy);
    } else {
      if (joy.active) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

      joy.active = true;
      joy.id = e.pointerId;
      joy.baseX = joy.knobX = joy.startX = e.clientX;
      joy.baseY = joy.knobY = joy.startY = e.clientY;
      joy.startTime = performance.now();
      joy.moved = false;
      joy.running = false;
      state.tapTarget = null;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const { W, H } = getViewSize();

    if (mousePtr.down && e.pointerId === mousePtr.id) {
      mousePtr.sx = e.clientX;
      mousePtr.sy = e.clientY;
      if (!mousePtr.dragged && Math.hypot(mousePtr.sx - mousePtr.startX, mousePtr.sy - mousePtr.startY) > 12) {
        mousePtr.dragged = true;
      }
      return;
    }

    if (joy.active && e.pointerId === joy.id) {
      if (!joy.moved && Math.hypot(e.clientX - joy.startX, e.clientY - joy.startY) > 10) {
        joy.moved = true;
      }

      const ox = e.clientX - joy.baseX;
      const oy = e.clientY - joy.baseY;
      const dist = Math.hypot(ox, oy);

      if (dist > CONFIG.JOY_LEASH_R) {
        const excess = dist - CONFIG.JOY_LEASH_R;
        joy.baseX = Math.max(24, Math.min(W - 24, joy.baseX + (ox / dist) * excess));
        joy.baseY = Math.max(24, Math.min(H - 24, joy.baseY + (oy / dist) * excess));
      }

      const nx = e.clientX - joy.baseX;
      const ny = e.clientY - joy.baseY;
      const nd = Math.hypot(nx, ny);
      const clamped = Math.min(nd, CONFIG.JOY_MAX_R);
      joy.knobX = joy.baseX + (nd > 0 ? (nx / nd) * clamped : 0);
      joy.knobY = joy.baseY + (nd > 0 ? (ny / nd) * clamped : 0);
    }
  });

  function endPointer(e, allowTap) {
    const { W, H } = getViewSize();

    if (mousePtr.down && e.pointerId === mousePtr.id) {
      if (allowTap && !mousePtr.dragged && (performance.now() - mousePtr.startTime) < 280) {
        const wPos = screenToWorld(mousePtr.sx, mousePtr.sy, cam, W, H);
        const pScr = worldToIso(player.x, player.y, cam, W, H);
        const sDist = Math.hypot(mousePtr.sx - pScr.screenX, mousePtr.sy - pScr.screenY);
        if (sDist > 12) {
          state.tapTarget = { wx: wPos.wx, wy: wPos.wy, run: sDist >= state.getMouseRunThreshold() };
        }
      }
      mousePtr.down = false;
      mousePtr.id = null;
      return;
    }

    if (joy.active && e.pointerId === joy.id) {
      if (allowTap && !joy.moved && (performance.now() - joy.startTime) < 240) {
        const wPos = screenToWorld(e.clientX, e.clientY, cam, W, H);
        const pScr = worldToIso(player.x, player.y, cam, W, H);
        const sDist = Math.hypot(e.clientX - pScr.screenX, e.clientY - pScr.screenY);
        addRipple(wPos.wx, wPos.wy);
        if (sDist > 16) {
          state.tapTarget = { wx: wPos.wx, wy: wPos.wy, run: sDist >= state.getMouseRunThreshold() };
        }
      }
      joy.active = false;
      joy.id = null;
      joy.running = false;
    }
  }

  canvas.addEventListener('pointerup', (e) => endPointer(e, true));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, false));

  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    joy.active = false;
    joy.id = null;
    joy.running = false;
    mousePtr.down = false;
    mousePtr.id = null;
    state.tapTarget = null;
  });

  return state;
}
