# DashboardX integration — local + spatial (2026-10-25)

## Base
This integration branch starts from `feature/dashboardx-local` and preserves its current web frontend, background, widget manager, workspaces and styling. It does **not** blindly merge the old `feature/widget-platform-spatial-foundation` UI entry point, because that branch was based on an older `main`.

## Included
- Four independently controlled widget types integrated into the existing `WIDGET_CATALOG`, i18n dictionaries, `WidgetLogic`, and standard `WidgetElement`.
- `githubControl`: public repository metadata; read-only.
- `serverMonitor`: same-origin HTTP check on demand; not a 24/7 Railway monitor.
- `smartContacts`: local-only VCF import and search (in-memory, not persistent).
- `dashboardAi`: UI and client contract, disabled until authenticated server API and secrets management exist.
- `WidgetRegistry` registers all mounted existing and new widget instances using their instance IDs.
- `SpatialLayout` stores 3D transforms under a different key and doesn't overwrite the saved 2D layout.
- Standalone `client/integrations-preview.html` for read-only experiment.
- Tests and CI workflow.

## Excluded / not ready
- No real WebXR or 3D rendering.
- No API keys or backend AI handling.
- No changes to Railway.
- `fix/dashboardx-stabilization` is NOT merged because this local static application deliberately excludes the legacy Node server; review it separately.
- The old prototype `client/widget-lab.html` isn't ported: it instantiates Web Components with an incompatible legacy constructor. The four widgets now run in the actual new DashboardX UI instead.

## Testing
Run `node --test tests/*.test.js` with Node 22+. Start a static server at repository root with `python3 -m http.server 8000` and load `http://localhost:8000/`. Confirm old widget navigation and the new widgets; verify persistence of workspace layouts. CI unit and syntax tests are not a substitute for browser regression tests.

## Deployment
The local project README configures GitHub Pages from `feature/dashboardx-local`. Merging this integration into `main` alone may not update that Pages deployment until the Pages source is changed. Check Pages settings before claiming production is updated.
