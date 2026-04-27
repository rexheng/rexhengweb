# In-Game Browser Testing Guide

Use this guide before testing `index.html` through Cursor Browser, Playwright, or any browser automation.

## Start The App

Run the static server from the repo root:

```bash
python serve.py 8766
```

Open `http://localhost:8766/` and wait until the HUD, metrics panel, and controls panel appear. Ignore the existing Three.js shader precision warning unless a new app error appears.

If the default port is already occupied, start the worker checkout on an unused high port and navigate to that exact port:

```bash
python serve.py 9137
```

Use this when another checkout may already be serving `8766` or `8767`. Confirm the server terminal did not exit with `WinError 10048`, open `http://localhost:<unused-port>/`, and check the terminal logs show requests for files from the worker checkout, such as `GET /src/projects/system.js`. This prevents accidentally testing a stale server from another worktree.

## Layout Modes

The desktop controls panel appears on the right when the browser has a fine pointer, even if the viewport is narrow. Cursor Browser and Playwright use this path by default.

The mobile controls panel appears only on touch/coarse-pointer viewports under `820px`. It is a bottom sheet. You must swipe up from the handle to open it.

## Desktop Test Flow

1. If the right controls panel is collapsed, click the `+` button in the `Controls` header.
2. Scroll inside the controls panel, not the page, until the `Projects` section is visible.
3. Click a project tile, for example `AM Amogus`.
4. If the floating project label is hidden behind the controls panel, collapse the panel with the header button.
5. Click the floating label, for example `Amogus ↗`, to open the project card.
6. Click the ability button, for example `Stab!`.
7. Verify the scene, metrics, console, and screenshot. For physics work, capture at least one screenshot before and after the ability fires.
8. Use `Clear all` before repeating a spawn test.

## Playwright Clear-All Shortcut

Scenario: verifying project spawn and `Clear all` cleanup without brittle coordinate clicks.

Tested sequence:

1. Use a desktop viewport, for example `1200x900`.
2. Navigate to the worker server. If `localhost` resolves poorly, use `http://127.0.0.1:<port>/`.
3. Wait for the `Projects` controls to appear.
4. Use role locators for `AM Amogus` and `Clear all`.
5. After each clear, evaluate `window.__app.projectSystem.slots`, `.rex-project-label`, and `window.__app.getGrabbables()` filtered to project slot body IDs.

```js
const tile = page.getByRole("button", { name: /AM Amogus/ });
const clear = page.getByRole("button", { name: /Clear all/i });
const state = await page.evaluate(() => {
  const app = window.__app;
  const slotIds = new Set(app.projectSystem.slots.map((slot) => slot.bodyID));
  return {
    activeProjects: app.projectSystem.slots.filter((slot) => slot.project).length,
    labelCount: document.querySelectorAll(".rex-project-label").length,
    projectGrabbables: app.getGrabbables().filter((object) => slotIds.has(object.bodyID)).length,
    freeSlots: app.projectSystem.freeSlots(),
  };
});
```

Why this is more reliable: role locators survive layout shifts, and the `window.__app` checks verify cleanup state directly instead of inferring it from screenshots. Caveat: this is desktop-oriented and should still use fresh navigation after source edits so the no-cache server serves worker files.

## Mobile Swipe-Up Flow

1. Locate the bottom handle labelled `Projects` at the bottom edge of the screen.
2. Swipe up from the handle area. A tap toggles the sheet, but tests should use a swipe because that matches the intended gesture.
3. Once the sheet opens, the project grid appears first.
4. Tap the project tile.
5. Tap outside the sheet or swipe down to close it and reveal the scene.
6. Tap the floating project label to open the card.
7. Tap the ability button.
8. If automation cannot reach a tile, take a fresh screenshot, calculate coordinates from that screenshot, and immediately use coordinate click. Do not reuse old screenshot coordinates.

## ClearPath `Route!` (dotted route)

### Manual GUI flow

Desktop uses the right-side controls panel. If it is collapsed because `localStorage` has `rex-controls-collapsed=1`, click the `+` button in the Controls header first.

1. Scroll inside the controls panel until the Projects section is visible.
2. Click a project tile such as `CP ClearPath`.
3. Refresh the browser snapshot after spawning; project labels move every frame and refs can go stale.
4. Click the floating project label to open the card.
5. Refresh the snapshot again, then click the ability button `Route!`.
6. Capture a screenshot and check console messages.

If coordinate clicking is required, take a fresh screenshot immediately before the coordinate click. Do not reuse older screenshot coordinates.

### Playwright ability shortcut (spawn + card + `Route!`)

Useful when the spawned label is off-screen or covered. Adapt the port to match your server. Screenshots: prefer `${TEMP}/clearpath-route-visible.png` (outside the repo).

```js
async (page) => {
  await page.goto("http://127.0.0.1:8766/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__app?.projectSystem?.slots?.length && !!window.__app?.scene);
  const screenshotPath = `${process.env.TEMP || process.env.TMP || "."}/clearpath-route-visible.png`;
  const fired = await page.evaluate(() => {
    const ps = window.__app.projectSystem;
    ps.clearAll?.();
    const slot = ps.spawn("clearpath");
    if (!slot) return { ok: false, reason: "spawn failed" };
    return { ok: true, slotBodyID: slot.bodyID };
  });
  if (!fired.ok) return { fired };
  await page.waitForTimeout(900);
  await page.evaluate((slotBodyID) => {
    const ps = window.__app.projectSystem;
    const slot = ps.slots.find((s) => s.bodyID === slotBodyID);
    ps.showCard(slot);
    document.querySelector(".rex-ui-card-ability")?.click();
  }, fired.slotBodyID);
  await page.waitForTimeout(750);
  const routeState = await page.evaluate(() => {
    const route = window.__app.scene.getObjectByName("clearpath_route");
    return {
      routeExists: !!route,
      dashCount: route?.children.length ?? 0,
      visibleCount: route?.children.filter((c) => c.visible).length ?? 0,
      opacities: route?.children.map((c) => Number(c.material.opacity.toFixed(2))) ?? [],
      activeAbilities: window.__app.projectSystem._activeAbilities.length,
    };
  });
  await page.screenshot({ path: screenshotPath, type: "png", scale: "css" });
  await page.waitForFunction(() => !window.__app.scene.getObjectByName("clearpath_route"), null, { timeout: 8000 });
  const after = await page.evaluate(() => ({
    routeExists: !!window.__app.scene.getObjectByName("clearpath_route"),
    activeAbilities: window.__app.projectSystem._activeAbilities.length,
  }));
  return { fired, routeState, after, screenshotPath };
}
```

Why this is more reliable: it uses `projectSystem` APIs to spawn and the real card ability control, so it avoids stale label refs. Keep a short post-spawn wait so world positions used by the ability have settled. This checks ability meshes and cleanup, not the full manual tile/label path.

## Playwright DOM Shortcut (Peter Network)

Scenario: verify Peter spawn, label/cycle changes, and card `Cycle` when GUI refs or scroll make normal clicks brittle.

1. Start the app and open Playwright against your server port.
2. Wait for load, then click the `NUS · @nus.peter` tile (or use `querySelector` on `button` text containing `NUS` and `@nus.peter`).

```js
await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find(
    (el) => el.textContent.includes("NUS") && el.textContent.includes("@nus.peter"),
  );
  button?.click();
});
```

3. Read visible persona labels on floating chrome:

```js
await page.evaluate(() =>
  [...document.querySelectorAll(".rex-project-label-text")].map((el) => el.textContent),
);
```

4. Open the card and fire `Cycle` with the same DOM path the UI uses:

```js
await page.evaluate(() => {
  document.querySelector(".rex-project-label")?.click();
  document.querySelector(".rex-ui-card-ability")?.click();
});
```

Auto-rotation on spawn is time-based: allow several seconds to observe outfit changes without clicking `Cycle`. Pair with screenshots for visual-only checks.

**Caveats:** Exercises DOM-driven behavior, not only layout/scroll. Refresh snapshots if you switch to ref-based browser tools mid-flow.

## Cursor Browser Tab Isolation

Scenario: multiple local servers or issue worktrees are open in Cursor Browser, and actions can accidentally continue on a stale tab or a different port.

Tested sequence:

1. Navigate with a fresh tab and a unique query string, for example `http://localhost:8765/?issue9-worker=1`.
2. Lock the returned `viewId`.
3. Pass the same `viewId` to every browser action.
4. Take a fresh snapshot and confirm the page URL matches the intended port before clicking project tiles or ability buttons.
5. If you are verifying a Simulacra worker build, open `http://127.0.0.1:<port>/src/projects/catalog/simulacra/build.js?probe=1` in that same server session and confirm the served source includes `lowPolyBee` (or your expected symbol). That catches a stale static server on another worktree.

Why this is more reliable: it prevents a previous tab on another local port from receiving interactions and can catch a stale server before visual checks. Caveats: this is Cursor Browser MCP-specific and it does not replace the stale-ref rule. Refresh the snapshot after spawn, card open, ability click, resize, or wait.

## Known Testing Traps

- The controls panel is its own scroll container. Page-level scrolling often does nothing.
- In mobile layout, the bottom sheet covers project labels and scene objects until you close it.
- Project labels move every frame. Take a fresh snapshot before clicking them.
- Cursor Browser refs can go stale after a spawn, card open, ability click, resize, or wait. Refresh the snapshot after each action.
- If `localStorage` has `rex-controls-collapsed=1`, the desktop panel opens collapsed after reload. Click `+` before testing project tiles.
- If a click is intercepted by a child `span`, retry the parent button with an offset or use a fresh coordinate click.

## Agent Learning Loop

Agents must treat this file as a living testing playbook. If an agent finds a faster, more reliable, or less brittle way to navigate the app, it should update this guide in the same worker branch/worktree before reporting back.

Only add tested improvements. Do not add guesses, one-off workarounds, or stale coordinates. A useful update includes:

- The scenario it helps with, such as spawning a project, opening a card, firing an ability, clearing objects, or switching layout modes.
- The exact interaction sequence or browser automation pattern.
- The reason it is more reliable than the previous path.
- Any caveat, such as desktop-only, mobile-only, requires fresh snapshot, or requires a cleared `localStorage` key.

When a worker updates this guide, its final report must include:

- `IN_GAME_TESTING.md updated: yes`
- The section changed.
- The behavior that was validated.
- Any testing shortcut that future agents should prefer.

If the worker's isolated branch does not contain `docs/IN_GAME_TESTING.md`, create it from the coordinator guide's current contents before adding the new finding.

## Proven Shortcuts

- Prefer direct JavaScript state inspection for non-visual assertions after a visual action. For example, after clicking a project tile, inspect app/project state from the page context when available, then use a screenshot only for final visual confirmation.
- Prefer one fresh snapshot per structural action. Click or type using refs from that snapshot, then immediately refresh the snapshot before the next click.
- For desktop project testing, collapse the controls panel after spawning if the floating project label or ability card is visually obscured.
