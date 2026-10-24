import { createHash, timingSafeEqual } from 'node:crypto';

export const MIN_WS_TOKEN_LENGTH = 32;

export function isWsConfigured(token) {
  return typeof token === 'string' && token.length >= MIN_WS_TOKEN_LENGTH;
}

export function verifyWsToken(candidate, configuredToken) {
  if (!isWsConfigured(configuredToken) || typeof candidate !== 'string' || candidate.length > 1024) {
    return false;
  }
  const expected = createHash('sha256').update(configuredToken).digest();
  const received = createHash('sha256').update(candidate).digest();
  return timingSafeEqual(expected, received);
}

export function isAllowedWsOrigin(origin, host) {
  if (!origin) return true; // Non-browser clients still require the access token.
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.host === host;
  } catch {
    return false;
  }
}

// Explicit allowlist. Never serialize the Database singleton or Telegram contacts.
export function createClientSnapshot(database) {
  const system = database.system ?? {};
  return {
    system: {
      theme: system.theme ?? null,
      workplace: Array.isArray(system.workplace) ? system.workplace : [],
    },
    workplace: Array.isArray(database.workplace) ? database.workplace : [],
    finance: database.finance ?? { table: [], crypto: {}, fiat: {} },
    playlist: Array.isArray(database.playlist) ? database.playlist : [],
    games: database.games ?? {},
  };
}
