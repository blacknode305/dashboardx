# DashboardX widget platform — phase 1

This is a non-breaking foundation for existing and future widgets.

## What is implemented
- `WidgetRegistry`: runtime discovery of already mounted WidgetElement instances.
- `SpatialLayout`: separately namespaced per-widget 3D pose, without changing desktop positions.
- Registry integration in `WidgetElement`: register on attach and unregister on detach.

## What is not implemented yet
- Spatial rendering, WebXR session, anchors, gestures, headset compatibility.
- OpenAI, Contacts, GitHub and Railway integration widgets, API credentials and server routes.
- Cross-device persistence; spatial poses currently use localStorage only.

## Integration contract
```js
import widgetRegistry from './WidgetRegistry.js';
import { getSpatialLayout, saveSpatialLayout } from './Spatial/SpatialLayout.js';

const widgets = widgetRegistry.list(); // all mounted existing widgets
const pose = getSpatialLayout('datetimeWidget');
saveSpatialLayout('datetimeWidget', { ...pose, position: [0, 1.5, -1.5] });
```

Future clients should use widget ids to map data/controllers into WebXR or native AR surfaces.
Never render untrusted HTML from API responses as spatial content.
Secrets, tokens and AI tool actions belong on authenticated server endpoints.
