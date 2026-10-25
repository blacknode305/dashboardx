# DashboardX Widget Lab

A safe opt-in browser preview for the original `WidgetElement` system.

## Run locally on macOS

From the repository root:

```bash
python3 -m http.server 8080 --directory client
```

Open <http://localhost:8080/widget-lab.html> in a browser.

No Railway environment variables or external AI credentials are needed. Do not launch this page from `file://`: ES module imports and HTTP checks need an HTTP origin.

## Widgets

- GitHub Control: public GitHub repository information fetched in browser.
- Server Monitor: same-origin HTTP check on demand; not 24/7 uptime monitoring.
- Smart Contacts: VCF import/search; data stays in memory, disappears on reload.
- DashboardX AI: **disabled by default**. No request is sent until an authenticated server exposes `GET /api/ai/status` with JSON `{ "enabled": true, "authenticated": true }`. Backend must protect `POST /api/ai/chat`; OpenAI credentials never belong in client.
- Datetime: legacy widget using the same existing logic and lifecycle.

Widgets are draggable and resizable using the existing `WidgetBase`. Click the save icon to persist a position and size. Positions are stored separately from future Spatial AR coordinates.

## Existing project considerations

- Existing widgets and current `client/index.html` are not changed by this lab.
- `client/js/index.js` has a commented-out legacy initialization block and is not yet a reliable integration entry point.
- Current `server/module/Server.js` is a static file server. Do not enable AI POST requests or expose OpenAI keys until authentication, method routing, validation, rate limits and CSRF protections are implemented.
- `webpack.config.js` does not currently copy the lab page and its ES module graph to `public/`; this page is for local preview, **not deployed on Railway**.
- Do not merge to main without manual browser smoke tests of new and old widgets.

## Spatial AR

All Lab widgets are registered in `WidgetRegistry` and have distinct Desktop positions. Future Spatial AR clients can read `WidgetRegistry.list()` and use `SpatialLayout` without touching desktop layout.

## Test

```bash
node --test tests/*.test.js
```

CI checks new modules and tests, but it does not emulate an actual browser.
