/**
 * Separate spatial layout storage. Never overwrites the existing desktop
 * widget keys (WidgetBase uses localStorage.getItem(widget.id)).
 * Coordinates are meters; rotations are radians.
 */
const PREFIX = 'dashboardx:spatial:v1:';
const DEFAULT_POSE = Object.freeze({
  position: [0, 1.5, -2],
  rotation: [0, 0, 0],
  widthMeters: 0.7,
  heightMeters: 0.45,
  anchorId: null
});
function validVector(value) {
  return Array.isArray(value) && value.length === 3 &&
    value.every(n => typeof n === 'number' && Number.isFinite(n));
}
function safeId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new TypeError('Invalid widget id');
  }
  return value;
}
export function getSpatialLayout(widgetId, storage = globalThis.localStorage) {
  const key = PREFIX + safeId(widgetId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return { ...DEFAULT_POSE, position: [...DEFAULT_POSE.position], rotation: [...DEFAULT_POSE.rotation] };
    const parsed = JSON.parse(raw);
    if (!validVector(parsed.position) || !validVector(parsed.rotation) ||
        !Number.isFinite(parsed.widthMeters) || parsed.widthMeters <= 0 ||
        !Number.isFinite(parsed.heightMeters) || parsed.heightMeters <= 0 ||
        (parsed.anchorId !== null && typeof parsed.anchorId !== 'string')) {
      throw new TypeError('Invalid spatial pose');
    }
    return {
      position: [...parsed.position], rotation: [...parsed.rotation],
      widthMeters: parsed.widthMeters, heightMeters: parsed.heightMeters,
      anchorId: parsed.anchorId
    };
  } catch {
    return { ...DEFAULT_POSE, position: [...DEFAULT_POSE.position], rotation: [...DEFAULT_POSE.rotation] };
  }
}
export function saveSpatialLayout(widgetId, pose, storage = globalThis.localStorage) {
  const key = PREFIX + safeId(widgetId);
  if (!validVector(pose?.position) || !validVector(pose?.rotation) ||
      !Number.isFinite(pose.widthMeters) || pose.widthMeters <= 0 ||
      !Number.isFinite(pose.heightMeters) || pose.heightMeters <= 0 ||
      (pose.anchorId != null && typeof pose.anchorId !== 'string')) {
    throw new TypeError('Invalid spatial pose');
  }
  const data = {
    position: [...pose.position], rotation: [...pose.rotation],
    widthMeters: pose.widthMeters, heightMeters: pose.heightMeters,
    anchorId: pose.anchorId ?? null
  };
  storage.setItem(key, JSON.stringify(data));
  return data;
}
export function deleteSpatialLayout(widgetId, storage = globalThis.localStorage) {
  storage.removeItem(PREFIX + safeId(widgetId));
}
