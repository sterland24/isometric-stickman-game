# AGENTS.md — AI Agent Quick Reference

> **Purpose:** Read this file first. It maps every responsibility to its exact file so you can edit the target module directly without scanning the whole repo.

## Tech Stack & Constraints
- **Zero-build Vanilla JS (ES Modules)** + HTML5 Canvas 2D + CSS3.
- The GitHub Pages workflow stages only runtime files (`index.html`, `favicon.svg`, `src/`, `styles/`) into `dist/` and deploys that folder (`.github/workflows/deploy.yml`). **Do not introduce a bundler or npm build step** unless explicitly requested.
- Local testing requires an HTTP server (ES modules fail on `file://`).
- Tests use the built-in `node:test` runner (Node 20+) with **no npm dependencies**. `package.json` only sets `"type": "module"`.

## File Map (Read Only What You Need)

| Task / Domain | File | Key Exports / Responsibilities |
| :--- | :--- | :--- |
| Entry & Loop | `src/main.js` | ResizeObserver + DPR canvas sizing, `requestAnimationFrame` loop, off-screen bush culling, depth sorting (`x + y`), viewport-aware prune timer |
| Constants | `src/config.js` | `CONFIG` (speeds, stickman proportions, chunk size, cull margin, cache margin, joystick radii, colors) |
| Iso Math & RNG | `src/math/iso.js` | `worldToIso`, `screenToWorld`, `visibleWorldBounds`, `mulberry32` |
| Input | `src/input/inputManager.js` | `createInputManager` -> `keys`, `joy`, `mousePtr`, `tapTarget`, `ripples`, `updateEffects`; resets on blur, tab hide, lost pointer capture |
| Player & Dust | `src/entities/player.js` | `player`, `dust`, `updatePlayer` (physics, gait `phase`, screen-space `strideDirX/Y`, world-space dust) |
| Camera | `src/entities/camera.js` | `cam`, `updateCamera` (exponential follow) |
| World Chunks | `src/world/chunkManager.js` | `chunkSeed(cx, cy)`, `getChunk(cx, cy)`, `pruneChunks(px, py, visibleRadius)`, `chunkCacheSize()` |
| Bush Shapes | `src/world/bushData.js` | `BUSH_TEMPLATES` (quadratic Bezier branch definitions) |
| Floor Render | `src/render/floorRenderer.js` | `drawFloor` (isometric dotted grid) |
| Bush Render | `src/render/bushRenderer.js` | `drawBush` (wind sway + player proximity bend) |
| Player Render | `src/render/stickmanRenderer.js` | `drawStickman` (shadow, legs, arms, torso, head, eye; stride follows `strideDirX/Y`) |
| HUD & FX Render | `src/render/uiRenderer.js` | `drawPointerEffects`, `drawDust`, `drawHint` (RTL), `drawJoystick` |
| Styles & Shell | `styles/main.css`, `index.html` | Full-viewport canvas, `.ai-badge`, RTL Persian shell, favicon/meta, mobile safe-area & `touch-action: none` |
| Tests | `tests/*.test.js` | `node --test tests/`: controls, iso round-trip/bounds, chunk determinism/collisions, viewport-aware pruning |

## Verification
- Syntax: `node --check src/main.js` (repeat for changed modules) or check all `src/**/*.js`.
- Tests: `node --test tests/` (all tests must pass).
- Runtime: serve the repo root with `python -m http.server 8080`; there are no third-party requests and no build output.

## Coordinate Spaces (Critical Invariant)
- **World Space `(wx, wy)`**: Infinite 2D ground plane. `player`, `cam`, `bush`, `tapTarget`, `ripples`, and `dust` (`wx, wy, z`) live here.
- **Depth Key**: `depth = x + y` (larger = closer to viewer / drawn later).
- **Isometric 2:1 Projection**:
  - `screenX = W/2 + (wx - cam.x) - (wy - cam.y)`
  - `screenY = H/2 + ((wx - cam.x) + (wy - cam.y)) * 0.5`
  - Vertical elevation `z` subtracts directly from `screenY` (`screenY - z`).
