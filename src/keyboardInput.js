// Central keystate tracker. Owns window-level keydown/keyup listeners, stores
// per-key down state in a Map. Consumers read state via `isDown(code)` or the
// higher-level `axis()` / `buttonPressed()` helpers.
//
// Ignores events while focus is in text inputs so typing in any overlay
// doesn't drive the character. Modifier keys (Shift, Ctrl, Alt, Meta) are
// tracked too so we can bind Ctrl=crouch even when no other key is down.

const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export class KeyboardInput {
  constructor() {
    this._down = new Map();         // code → true
    this._justPressed = new Set();  // codes pressed this frame; consumed on nextFrame()
    this._listeners = [];

    const keydown = (e) => {
      if (IGNORED_TAGS.has(e.target?.tagName)) return;
      if (!this._down.has(e.code)) this._justPressed.add(e.code);
      this._down.set(e.code, true);
    };
    const keyup = (e) => { this._down.delete(e.code); };
    const blur = () => { this._down.clear(); };

    addEventListener("keydown", keydown);
    addEventListener("keyup", keyup);
    addEventListener("blur", blur);
    this._listeners = [
      ["keydown", keydown],
      ["keyup", keyup],
      ["blur", blur],
    ];
  }

  destroy() {
    for (const [name, fn] of this._listeners) removeEventListener(name, fn);
    this._down.clear();
    this._justPressed.clear();
  }

  isDown(code) {
    return this._down.has(code);
  }

  /**
   * Was this key pressed between the last nextFrame() and now?
   * One-shot reads — useful for "jump" / "toggle" actions.
   */
  justPressed(code) {
    return this._justPressed.has(code);
  }

  /**
   * Call once at the end of each frame (after consumers read justPressed).
   * Clears the one-shot buffer so next frame's events start fresh.
   */
  nextFrame() {
    this._justPressed.clear();
  }

  /**
   * Returns {x: -1..1, y: -1..1} from WASD (y=+1 is W/forward).
   * Arrow keys also respected. Not normalized — caller normalizes if needed.
   */
  axis() {
    let x = 0, y = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) y += 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) y -= 1;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    return { x, y };
  }
}
