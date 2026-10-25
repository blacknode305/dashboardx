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
