/** Pure Spatial Preview helpers; safe to test in Node without WebGL. */
export function defaultSpatialPose(index = 0) {
  if (!Number.isInteger(index) || index < 0) throw new RangeError('Invalid spatial index');
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    position: [(column - 1) * 1.18, 1.62 - row * 0.77, -2 - (row % 2) * 0.16],
    rotation: [0, (1-column) * 0.08, 0],
    widthMeters: 1.08,
    heightMeters: 0.84,
    anchorId: null
  };
}
export function resizeSpatialPose(pose, widthMeters) {
  if (!pose || !Number.isFinite(widthMeters) || widthMeters < .35 || widthMeters > 2.8)
    throw new TypeError('Width must be within 0.35 and 2.8 meters');
  if (!Number.isFinite(pose.widthMeters) || pose.widthMeters <= 0)
    throw new TypeError('Invalid original width');
  return {
    ...pose,
    position:[...pose.position],
    rotation:[...pose.rotation],
    heightMeters:pose.heightMeters*widthMeters/pose.widthMeters,
    widthMeters
  };
}

/**
 * Desktop is the ONLY source of truth for widget width and height.
 * A single pixels-per-meter ratio preserves each window's aspect ratio in 3D,
 * including its header, controls and scrolling body.
 */
export const SPATIAL_PIXELS_PER_METER = 400;
export function spatialSizeFromDesktop(widthPx, heightPx) {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) ||
      widthPx <= 0 || heightPx <= 0) {
    throw new TypeError('Desktop widget must have a measurable size');
  }
  const width = Math.round(widthPx);
  const height = Math.round(heightPx);
  return {
    widthPx: Math.max(1, width),
    heightPx: Math.max(1, height),
    widthMeters: Math.max(1, width) / SPATIAL_PIXELS_PER_METER,
    heightMeters: Math.max(1, height) / SPATIAL_PIXELS_PER_METER
  };
}
