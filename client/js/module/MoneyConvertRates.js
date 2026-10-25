// All MoneyConvert rates are quoted against USD.
// This module keeps only short-lived API data in memory, never localStorage.
export const MONEYCONVERT_ENDPOINT = 'https://cdn.moneyconvert.net/api/latest.json';
export const RATE_REFRESH_MS = 5 * 60 * 1000;

let snapshot = null;
let pending = null;

export function normalizeMoneyRates(payload) {
  if (!payload || String(payload.base || '').toUpperCase() !== 'USD' ||
      !payload.rates || typeof payload.rates !== 'object' || Array.isArray(payload.rates)) {
    throw new Error('Unexpected MoneyConvert API response');
  }
  const rates = Object.create(null);
  rates.USD = 1;
  for (const [rawCode, rawValue] of Object.entries(payload.rates)) {
    const code = String(rawCode).toUpperCase();
    const number = Number(rawValue);
    if (/^[A-Z0-9]{2,12}$/.test(code) && Number.isFinite(number) && number > 0) {
      rates[code] = number;
    }
  }
  if (Object.keys(rates).length < 3) throw new Error('MoneyConvert returned no currency rates');
  rates.USD = 1;
  return rates;
}

export function listMoneyCurrencies(rates) {
  if (!rates) return [];
  return Object.keys(rates).sort((a, b) => a.localeCompare(b, 'en'));
}

export function findMoneyCurrencies(codes, query, getName = () => '') {
  const q = String(query || '').trim().toLocaleLowerCase();
  if (!q) return codes.slice(0, 80);
  const matches = codes.filter(code =>
    code.toLocaleLowerCase().startsWith(q) ||
    String(getName(code) || '').toLocaleLowerCase().startsWith(q)
  );
  return matches.slice(0, 80);
}

export function calculateMoneyRate(rates, from, to) {
  const source = Number(rates?.[from]);
  const target = Number(rates?.[to]);
  if (!(source > 0) || !(target > 0) ||
      !Number.isFinite(source) || !Number.isFinite(target)) return null;
  return target / source;
}

export async function loadMoneyRates(force = false) {
  if (!force && snapshot && Date.now() - snapshot.retrievedAt < RATE_REFRESH_MS) {
    return { ...snapshot, stale: false };
  }
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch(MONEYCONVERT_ENDPOINT, { cache: 'no-store' });
      if (!response.ok) throw new Error('MoneyConvert HTTP ' + response.status);
      const rates = normalizeMoneyRates(await response.json());
      snapshot = { rates, retrievedAt: Date.now() };
      return { ...snapshot, stale: false };
    } catch (error) {
      if (snapshot) return { ...snapshot, stale: true };
      throw error;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
