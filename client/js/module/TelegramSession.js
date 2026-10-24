// Deliberately ephemeral. No Telegram credentials are written to localStorage,
// sessionStorage, IndexedDB, source files, logs or any remote endpoint.
const tokens = new Map();
export function setTelegramToken(instanceId, value) {
  if (typeof instanceId !== 'string' || !instanceId || typeof value !== 'string' || !value.trim()) return false;
  tokens.set(instanceId, value.trim());
  return true;
}
export function hasTelegramToken(instanceId) {
  return tokens.has(instanceId);
}
export function clearTelegramToken(instanceId) {
  return tokens.delete(instanceId);
}

export function clearAllTelegramTokens() {
  tokens.clear();
}
