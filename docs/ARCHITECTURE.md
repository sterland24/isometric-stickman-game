# Architecture & Developer Guide

This document explains the architecture, coordinate system, data flow, and extension patterns for the **Isometric Minimal Stickman Game**.

> **For AI Coding Agents:** Start with [AGENTS.md](../AGENTS.md) for a compact file map and invariants before reading source files.

---

## 1. Design Philosophy
- **Zero-Build Native ES Modules:** All JavaScript uses native browser ES modules (`<script type="module" src="src/main.js">`). There is no webpack, Vite, or compilation step. GitHub Pages deployment (`.github/workflows/deploy.yml`) stages only runtime files into `dist/` and publishes that folder.
- **Unidirectional Frame Flow:** `Input -> Simulation (Player, Dust, Camera) -> Depth-Sorted Render -> HUD/FX -> Periodic Cache Pruning`.
- **Central Configuration:** Gameplay tunables live in `src/config.js` (`CONFIG`); small purely visual constants stay close to their renderer.
- **Dependency-Free Tests:** The `tests/` folder uses Node's built-in `node:test` runner and imports the DOM-free simulation modules directly. There is no test dependency and no install step.

---

## 2. Directory Structure

```text
Game/
├── index.html                   # HTML shell: favicon/meta, .ai-badge, canvas, module entry
├── favicon.svg                  # Ink-style stickman favicon
├── package.json                 # "type": "module" + test script (no dependencies)
├── LICENSE                      # MIT
├── .gitignore
├── styles/
│   └── main.css                 # Viewport lock, touch-action, safe-area, badge styling
├── src/
│   ├── main.js                  # Canvas sizing, game loop, bush culling, depth sorting, prune
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
│   │   └── chunkManager.js      # Chunk seed/generation & viewport-aware pruning
│   └── render/
│       ├── floorRenderer.js     # Viewport-culled isometric dot grid
│       ├── bushRenderer.js      # Wind sway + proximity-based bush bending
│       ├── stickmanRenderer.js  # Procedural stickman gait & shadow
│       └── uiRenderer.js        # Ripples, tap target, dust, RTL hint text, joystick
├── tests/
│   ├── controls.test.js         # Keyboard directions & gait direction
│   ├── iso.test.js              # Projection round-trip & visible bounds
│   ├── chunks.test.js           # Seed collisions & determinism
│   └── prune.test.js            # Viewport-aware pruning across five sizes
├── .github/workflows/
│   └── deploy.yml               # Stage dist/ and deploy to GitHub Pages
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

   Keyboard directions use those world diagonals: `W = (-1,-1)`, `S = (+1,+1)`, `A = (-1,+1)`, `D = (+1,-1)`. The joystick converts its screen-space vector to the same space with `dx = jx + 2*jy`, `dy = 2*jy - jx`.

2. **2:1 Isometric Projection (`worldToIso`):**
   ```js
   screenX = W / 2 + (wx - cam.x) - (wy - cam.y)
   screenY = H / 2 + ((wx - cam.x) + (wy - cam.y)) * 0.5
   ```
   Any vertical height offset `z` (such as rising dust particles) is subtracted from `screenY` (`p.screenY - d.z`).

3. **Depth Sorting:**
   Objects on the ground plane are sorted back-to-front by `depth = x + y` in `src/main.js` before rendering.

4. **Screen-Space Gait:**
   `updatePlayer` stores the last non-zero screen-space velocity direction (`strideDirX = vx - vy`, `strideDirY = (vx + vy) / 2`, normalized) so feet and hands swing along the actual travel direction. The last direction is retained while idle to avoid a pose snap.

---

## 4. Frame Execution Pipeline (`src/main.js`)

0. **Canvas Sizing:** `canvas.clientWidth/clientHeight` define the CSS viewport (`W`, `H`). A `ResizeObserver` calls `resizeCanvas` after layout, rotation, or any CSS size change. The backing store uses `min(devicePixelRatio, 2)`, and a re-armed `matchMedia('(resolution: Ndppx)')` listener handles moving the window to a display with a different DPR. The loop skips rendering while `W` or `H` is zero.
1. **Delta Time (`dt`):** `last` starts as `null` and is initialized from the first rAF timestamp. `dt` is clamped to `[0, 0.05s]`, so it can never be negative or cause tunneling after a hidden tab.
2. **Update Phase:**
   - `updatePlayer(dt, input, cam, W, H)` resolves input priority (`Keyboard > Touch Joystick > Mouse Drag > Tap Target`), applies exponential acceleration/braking, advances gait `phase`, records the screen-space stride direction, and updates world-space `dust`.
   - `input.updateEffects(dt)` animates joystick fade-in/out and ripple lifetimes.
   - `updateCamera(dt, player)` smoothly interpolates `cam` toward `player`.
3. **Render Phase:**
   - Clear background & draw `drawFloor`.
   - Draw ground-level pointer feedback (`drawPointerEffects`).
   - Collect chunks from `visibleWorldBounds(cam, W, H, 80)`.
   - Project each bush inline (`worldToIso` math, no per-bush allocation) and skip it when it is outside the screen rect expanded by `CONFIG.BUSH_CULL_MARGIN` (48px, enough for max scale, wind, bend, and line width). This removes roughly 70% of `drawBush` calls at 1920×1080 while keeping visible bushes identical.
   - Merge surviving bushes with `player`, sort by `depth`, and draw each item.
   - Draw foreground `drawDust`, `drawHint` (with `ctx.direction = 'rtl'`), and `drawJoystick`.
4. **Cleanup Phase:**
   - Every `CONFIG.CHUNK_PRUNE_INTERVAL` seconds, `pruneChunks(player.x, player.y, visibleRadius)` evicts chunks outside a Chebyshev radius around the player.
   - `visibleRadius` is derived each frame from the chunk range that covers the viewport (including camera lag). The effective keep radius is `max(CONFIG.CHUNK_KEEP_RADIUS, visibleRadius) + CONFIG.CHUNK_CACHE_MARGIN`, so no chunk that is currently visible is evicted, even at 4K/8K.
   - The cache is therefore bounded by a `(2r+1)²` neighbourhood that follows the player, instead of a fixed `CHUNK_MAX_CACHE` threshold. Pruning is distance-based, not LRU.

### Chunk Generation & Determinism (`src/world/chunkManager.js`)

- **Seed:** `chunkSeed(cx, cy)` is a non-separable avalanche mix based on `Math.imul`. It replaces the old separable XOR hash, which produced 15,084 duplicate seeds on a 301×301 chunk grid (and visible repeated layouts).
- **Generation:** `getChunk(cx, cy)` seeds `mulberry32(chunkSeed(cx, cy))`, consumes a fixed sequence of random values, and applies the spawn-clear filter *after* all values are consumed. The same coordinates therefore always produce the same bushes, including after eviction and regeneration.
- **Cache diagnostics:** `chunkCacheSize()` returns the number of cached chunks for tests and debugging.

---

## 5. How to Extend the Game (Recipes)

- **Add a new world prop (e.g., rocks, trees):**
  1. Define prop data/templates in `src/world/` and spawn them in `src/world/chunkManager.js` (using the chunk's `rnd()` PRNG so generation stays deterministic).
  2. Create `src/render/propRenderer.js`.
  3. Project and screen-space cull the prop (the same margin pattern as `BUSH_CULL_MARGIN`), then push `{ prop, depth: prop.x + prop.y }` into `renderList` in `src/main.js`.

- **Add collision / obstacles:**
  1. Add a collision radius to world objects in `chunkManager.js`.
  2. Resolve circle-circle push-out in `src/entities/player.js` right after `player.x += player.vx * dt; player.y += player.vy * dt;`.

- **Add gameplay state (score, collectibles, enemies):**
  1. Create a dedicated module in `src/entities/` or `src/state/`.
  2. Update it in `src/main.js` alongside `updatePlayer` and render its HUD in `src/render/uiRenderer.js`.

---

## 6. Testing

The suite uses the built-in Node runner and imports simulation modules directly (no DOM, no dependencies):

```bash
node --test tests/
# or
npm test
```

Coverage:
- `controls.test.js` — single keys, mirror check for right vs. down, diagonal screen angles, opposite-key cancellation, retained gait direction.
- `iso.test.js` — 2:1 basis, 100k-point projection round-trip (< 1e-6), visible-bounds coverage and margin.
- `chunks.test.js` — zero `chunkSeed` collisions on 301×301, deterministic regeneration after prune, average bush count.
- `prune.test.js` — no visible chunk evicted for 390×844, 1280×720, 1920×1080, 2560×1440, 3840×2160, and a bounded cache after long travel.

## 7. Deployment

`.github/workflows/deploy.yml` keeps the two-job build/deploy structure. The build job runs:

```bash
mkdir -p dist
cp index.html favicon.svg dist/
cp -r src styles dist/
```

Only that `dist/` folder is uploaded as the Pages artifact, so docs, tests, and agent notes are not published.

## 8. Local Development

Because `index.html` uses `<script type="module">`, browsers block module imports over `file://`. Run any static HTTP server from the project root:

```bash
npx serve .
# or
python -m http.server 8080
```
