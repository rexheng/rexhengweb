# rexheng.com — portfolio

Single-page interactive portfolio. An articulated MuJoCo humanoid (Three.js render, WebAssembly physics) stands in a dark navy environment. Drag to grab, punt, or topple it. The settings panel lives to the right; a small collapsible info card lives on the left.

## Run

```bash
python -m http.server 8765
```

Then open http://localhost:8765/.

No build step, no bundler.

## Structure

```
index.html                # entry
src/main.js               # App class, physics + render loop, GUI
src/portfolioOverlay.js   # collapsible left-anchored info card
src/grabber.js            # click-drag spring-force interaction
src/audio.js              # WebAudio contact ticks
src/replay.js             # R-key slo-mo replay buffer
src/trails.js             # trajectory trails
src/sparks.js             # impact spark particles
src/crosshair.js          # HUD reticle
src/hoverHighlight.js     # body highlight on hover
src/metricsHud.js         # live stats corner
src/mujocoLoader.js       # MuJoCo → Three.js scene builder
vendor/mujoco/            # mujoco-js vendored locally
assets/scenes/            # MJCF XML
```

Credits: MuJoCo (Google DeepMind, Apache-2.0), `mujoco-js`, `zalo/mujoco_wasm` (Apache-2.0) whose loader was ported.
