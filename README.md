# Isometric Minimal Stickman Game 🏃‍♂️🌿

A lightweight, minimal isometric stickman game built with vanilla HTML5 Canvas and ES Modules — zero build tools or external dependencies.

✨ **Crafted with Artificial Intelligence**

## Features
- **Minimalist Aesthetic:** Clean, white-canvas design with natural hand-drawn-style isometric foliage.
- **Isometric Projection:** True 2:1 isometric coordinates and perspective with smooth dynamic depth sorting.
- **Fluid Stickman Animation:** Stickman character with physics, smooth movement, directional leg stride cycles, and world-anchored dust particles.
- **Mobile & Touch Support:** Full touch and pointer support with a floating virtual joystick, tap-to-move, dynamic ripple effects, and adaptive UI.
- **Infinite Procedural World:** Deterministic chunk-based bush generation with automatic memory pruning.
- **Controls:**
  - Movement: `W`, `A`, `S`, `D`, Arrow keys (`←`, `↑`, `↓`, `→`), or Touch (floating virtual joystick / tap) / Mouse drag
  - Run/Sprint: Hold `Shift`, drag joystick towards outer edge, or drag mouse further

## Project Structure
- `index.html` — Minimal HTML shell
- `styles/main.css` — Responsive canvas and UI styling
- `src/` — Modular ES6 game source (`config.js`, `main.js`, `math/`, `input/`, `entities/`, `world/`, `render/`)
- `docs/ARCHITECTURE.md` — Comprehensive architecture & extension guide
- `AGENTS.md` — Compact module map for AI coding agents

## How to Run Locally
Since the project uses native ES Modules (`<script type="module">`), serve the directory over HTTP (opening `index.html` directly via `file://` is blocked by browser CORS policy):

```bash
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` (or the port shown by `serve`) in your browser. Deployment to GitHub Pages works automatically via `.github/workflows/deploy.yml`.
