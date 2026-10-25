# DashboardX Spatial Preview — Three.js

This is a **desktop-browser 3D preview**, not a native Apple Vision Pro app,
WebXR session, or real optical see-through AR. It is designed to prepare the
existing DashboardX widgets for later spatial-device adapters.

## Run the merged dashboard

From the repository root, serve the normal `index.html` (do not open `file://`):

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` in Chrome (Mac, Windows, Linux).
When GitHub Pages is configured for `main` and `/(root)`, you can open:
`https://blacknode305.github.io/dashboardx/`.

## How to use it

1. On the **ordinary Desktop**, use **«Добавить виджет»** to add any of the
   28 types in the canonical widget catalog. Some server-only widgets retain
   their normal unavailable notice until their server endpoints exist.
2. Click **«◈ Spatial 3D»** in the dashboard toolbar.
3. The **same mounted DOM custom elements** appear in a Three.js scene.
   We use `CSS3DRenderer` to keep native inputs, buttons, forms and live
   widget JavaScript, plus `WebGLRenderer` for a subtle ground grid.
4. Drag the **empty background** to orbit; use the **mouse wheel** on the
   empty background to zoom. Drag a **widget header** to move it in X/Y.
   Select any widget in the right-hand panel and edit X/Y/Z, Y rotation,
   or physical width. Use **«К виджету»** to focus the camera on one panel.
5. Click **«← Desktop»** (or Escape) to restore the **same live widgets**
   back to the 2D workspace. Their existing 2D positions and storage are
   not overwritten by 3D pose changes.
6. Adding/deleting/switching workspaces from a widget's native controls
   returns to Desktop so the existing application can rerender safely.
   You can re-enter Spatial Preview afterward.

## How it works

- The app lazy-imports `client/js/module/Spatial/SpatialPreview.js` only
  when the 3D button is clicked. No 3D network dependency on Desktop boot.
- Pinned Three.js `0.186.1` loaded via a browser import map from jsDelivr;
  internet required for initial Three.js load, including on localhost.
- Uses WebGLRenderer (background grid) + CSS3DRenderer (native live DOM).
  If WebGL initialization fails, live CSS3D panels can still render.
- All currently mounted widgets use the existing `WidgetElement` and
  `WidgetLogic`. There are **no alternate demo widget implementations**.
- `_spatialMoving` suppresses Web Component destruction when the **same
  elements** are temporarily moved into/out of CSS3D wrappers.
- `_spatialMode` blocks the legacy desktop drag/resize/save functions while
  the new interaction is active. 3D layout is stored independently under
  `dashboardx:spatial:v1:<instance-id>`; desktop positions stay under
  `dashboardx.layout.<workspace-id>.<instance-id>`.
- Default positions spread widgets across a three-column grid; per-widget
  poses persist locally. Camera position itself is not persisted.

## Current limitations

- This is **not actual WebXR hand tracking, optical transparency, depth
  sensing, room anchors, or a native AR glasses runtime**.
- Only **currently present widgets** on the selected desktop are shown.
  To test another type, create an instance with the existing manager.
- Browser zoom should be at 100% for CSS3DRenderer fidelity.
- Spatial header window-management buttons and resizing are disabled in
  3D; controls inside widget bodies remain interactive.
- Some original widgets are server-only, depend on APIs, or require
  user configuration. A spatial surface cannot make missing backend
  capabilities work.
- The AI widget requires a personal BYOK gateway and paid OpenAI API key
  configured separately; no OpenAI key, shared quota, or Railway deployment
  is created by Spatial Preview.
- If the Three.js CDN fails, the Desktop app should remain usable; button
  reports the import error and can be retried.
- Automated tests cover spatial pose math and lifecycle integration
  contracts; visually test pointer interactions on a supported browser.

## Further development

Spatial AR on transparent 6DoF glasses will need device-specific APIs/SDK,
real-world positioning, input adapters and an explicit permission model.
The widget controllers remain reusable where platform support permits.
