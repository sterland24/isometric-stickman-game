# Architecture & Developer Guide

This document explains the architecture, coordinate system, data flow, and extension patterns for the **Isometric Minimal Stickman Game**.

> **For AI Coding Agents:** Start with [AGENTS.md](../AGENTS.md) for a compact file map and invariants before reading source files.

---

## 1. Design Philosophy
- **Zero-Build Native ES Modules:** All JavaScript uses native browser ES modules (`<script type="module" src="src/main.js">`). There is no webpack, Vite, or compilation step, keeping GitHub Pages deployment (`.github/workflows/deploy.yml`) instant and dependency-free.
- **Unidirectional Frame Flow:** `Input -> Simulation (Player, Dust, Camera) -> Depth-Sorted Render -> HUD/FX -> Periodic Cache Pruning`.
- **Single Source of Truth for Constants:** All tunable values live in `src/config.js` (`CONFIG`).

---

## 2. Directory Structure

```text
Game/
├── index.html                   # Minimal HTML shell + .ai-badge + module entry
├── styles/
│   └── main.css                 # Viewport lock, touch-action, safe-area, badge styling
├── src/
│   ├── main.js                  # Canvas DPR setup, game loop, depth sorting
│   ├── config.js                # Central CONFIG object
│   ├── math/
│   │   └── iso.js               # 2:1 isometric projection, bounds, Mulberry32 PRNG
│   ├── input/
│   │   └── inputManager.js      # Keyboard, mouse drag/tap, touch floating joystick
│   ├── entities/
│   │   ├── player.js            # Player state, movement physics, world-space dust
│   │   └── camera.js            # Smooth exponential camera follow
│   ├── world/
│   │   ├── bushData.js          # BUSH_TEMPLATES (quadratic Bezier curves)
│   │   └── chunkManager.js      # Procedural chunk generation & LRU-style pruning
│   └── render/
│       ├── floorRenderer.js     # Viewport-culled isometric dot grid
│       ├── bushRenderer.js      # Wind sway + proximity-based bush bending
│       ├── stickmanRenderer.js  # Procedural stickman gait & shadow
│       └── uiRenderer.js        # Ripples, tap target, dust, hint text, joystick
├── docs/
│   └── ARCHITECTURE.md          # This file
├── AGENTS.md                    # Token-efficient map for AI agents
└── README.md                    # Project overview & quick start
```

---

## 3. Coordinate System & Isometric Math

Defined in `src/math/iso.js`:

1. **World Space `(wx, wy)`:**
   All simulation entities (`player`, `cam`, `bush`, `tapTarget`, `ripples`, `dust`) operate in world space.
   - Moving `+wx, +wy` moves **down** on screen.
   - Moving `-wx, -wy` moves **up** on screen.
   - Moving `+wx, -wy` moves **right** on screen.
   - Moving `-wx, +wy` moves **left** on screen.

2. **2:1 Isometric Projection (`worldToIso`):**
   ```js
   screenX = W / 2 + (wx - cam.x) - (wy - cam.y)
   screenY = H / 2 + ((wx - cam.x) + (wy - cam.y)) * 0.5
   ```
   Any vertical height offset `z` (such as rising dust particles) is subtracted from `screenY` (`p.screenY - d.z`).

3. **Depth Sorting:**
   Objects on the ground plane are sorted back-to-front by `depth = x + y` in `src/main.js` before rendering.

---

## 4. Frame Execution Pipeline (`src/main.js`)

1. **Delta Time (`dt`):** Clamped to `0.05s` (`50ms`) to prevent physics tunneling when switching browser tabs.
2. **Update Phase:**
   - `updatePlayer(dt, input, cam, W, H)` resolves input priority (`Keyboard > Touch Joystick > Mouse Drag > Tap Target`), applies exponential acceleration/braking, advances gait `phase`, and updates world-space `dust`.
   - `input.updateEffects(dt)` animates joystick fade-in/out and ripple lifetimes.
   - `updateCamera(dt, player)` smoothly interpolates `cam` toward `player`.
3. **Render Phase:**
   - Clear background & draw `drawFloor`.
   - Draw ground-level pointer feedback (`drawPointerEffects`).
   - Collect visible chunks via `visibleWorldBounds(cam, W, H, 80)`, merge bushes with `player`, sort by `depth`, and draw each item.
   - Draw foreground `drawDust`, `drawHint`, and `drawJoystick`.
4. **Cleanup Phase:**
   - Every `CONFIG.CHUNK_PRUNE_INTERVAL` seconds, `pruneChunks` removes chunks outside `CONFIG.CHUNK_KEEP_RADIUS` if total cached chunks exceed `CONFIG.CHUNK_MAX_CACHE`.

---

## 5. How to Extend the Game (Recipes)

- **Add a new world prop (e.g., rocks, trees):**
  1. Define prop data/templates in `src/world/` and spawn them in `src/world/chunkManager.js` (using the chunk's `rnd()` PRNG so generation stays deterministic).
  2. Create `src/render/propRenderer.js`.
  3. Push `{ prop, depth: prop.x + prop.y }` into `renderList` in `src/main.js`.

- **Add collision / obstacles:**
  1. Add a collision radius to world objects in `chunkManager.js`.
  2. Resolve circle-circle push-out in `src/entities/player.js` right after `player.x += player.vx * dt; player.y += player.vy * dt;`.

- **Add gameplay state (score, collectibles, enemies):**
  1. Create a dedicated module in `src/entities/` or `src/state/`.
  2. Update it in `src/main.js` alongside `updatePlayer` and render its HUD in `src/render/uiRenderer.js`.

---

## 6. Local Development

Because `index.html` uses `<script type="module">`, browsers block module imports over `file://`. Run any static HTTP server from the project root:

```bash
npx serve .
# or
python -m http.server 8080
```
