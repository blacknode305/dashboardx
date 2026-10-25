/**
 * Spatial Preview glass controls. Never touches Desktop layout or widget opacity.
 * The slider changes only the alpha channel of 3D panel/background surfaces,
 * leaving text, inputs, buttons, and live widget controllers fully opaque.
 */
export const GLASS_STORAGE_KEY = 'dashboardx:spatial:glass-transparency:v1';
export const DEFAULT_GLASS_TRANSPARENCY = 55;
export function normalizeGlassTransparency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_GLASS_TRANSPARENCY;
  return Math.min(90, Math.max(0, Math.round(number / 5) * 5));
}
export function glassBackgroundAlpha(transparency) {
  return Number(((100 - normalizeGlassTransparency(transparency)) / 100).toFixed(2));
}
export function readGlassTransparency(storage = globalThis.localStorage) {
  try {
    const saved = storage.getItem(GLASS_STORAGE_KEY);
    return saved === null ? DEFAULT_GLASS_TRANSPARENCY :
      Number.isFinite(Number(saved)) && saved.trim() !== '' ?
        normalizeGlassTransparency(Number(saved)) : DEFAULT_GLASS_TRANSPARENCY;
  } catch {
    return DEFAULT_GLASS_TRANSPARENCY;
  }
}
export function saveGlassTransparency(value, storage = globalThis.localStorage) {
  const percent = normalizeGlassTransparency(value);
  try { storage.setItem(GLASS_STORAGE_KEY, String(percent)); }
  catch { /* Private browsing may not provide persistent storage. */ }
  return percent;
}
