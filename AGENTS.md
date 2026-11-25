# AGENTS.md — AI Agent Quick Reference

> **Purpose:** Read this file first. It maps every responsibility to its exact file so you can edit the target module directly without scanning the whole repo.

## Tech Stack & Constraints
- **Zero-build Vanilla JS (ES Modules)** + HTML5 Canvas 2D + CSS3.
- Deployed directly from `.` to GitHub Pages (`.github/workflows/deploy.yml`). **Do not introduce a bundler or npm build step** unless explicitly requested.
- Local testing requires an HTTP server (ES modules fail on `file://`).

## File Map (Read Only What You Need)

| Task / Domain | File | Key Exports / Responsibilities |
| :--- | :--- | :--- |
| Entry & Loop | `src/main.js` | Canvas DPR resize, `requestAnimationFrame` loop, depth sorting (`x + y`), chunk prune timer |
| Constants | `src/config.js` | `CONFIG` (speeds, stickman proportions, chunk size, joystick radii, colors) |
| Iso Math & RNG | `src/math/iso.js` | `worldToIso`, `screenToWorld`, `visibleWorldBounds`, `mulberry32` |
| Input | `src/input/inputManager.js` | `createInputManager` -> `keys`, `joy`, `mousePtr`, `tapTarget`, `ripples`, `updateEffects` |
| Player & Dust | `src/entities/player.js` | `player`, `dust`, `updatePlayer` (physics, gait `phase`, `face`, world-space dust) |
| Camera | `src/entities/camera.js` | `cam`, `updateCamera` (exponential follow) |
| World Chunks | `src/world/chunkManager.js` | `getChunk(cx, cy)`, `pruneChunks(px, py)` |
| Bush Shapes | `src/world/bushData.js` | `BUSH_TEMPLATES` (quadratic Bezier branch definitions) |
| Floor Render | `src/render/floorRenderer.js` | `drawFloor` (isometric dotted grid) |
| Bush Render | `src/render/bushRenderer.js` | `drawBush` (wind sway + player proximity bend) |
| Player Render | `src/render/stickmanRenderer.js` | `drawStickman` (shadow, legs, arms, torso, head, eye) |
| HUD & FX Render | `src/render/uiRenderer.js` | `drawPointerEffects`, `drawDust`, `drawHint`, `drawJoystick` |
| Styles & Shell | `styles/main.css`, `index.html` | Full-viewport canvas, `.ai-badge`, mobile safe-area & `touch-action: none` |

## Coordinate Spaces (Critical Invariant)
- **World Space `(wx, wy)`**: Infinite 2D ground plane. `player`, `cam`, `bush`, `tapTarget`, `ripples`, and `dust` (`wx, wy, z`) live here.
- **Depth Key**: `depth = x + y` (larger = closer to viewer / drawn later).
- **Isometric 2:1 Projection**:
  - `screenX = W/2 + (wx - cam.x) - (wy - cam.y)`
  - `screenY = H/2 + ((wx - cam.x) + (wy - cam.y)) * 0.5`
  - Vertical elevation `z` subtracts directly from `screenY` (`screenY - z`).
