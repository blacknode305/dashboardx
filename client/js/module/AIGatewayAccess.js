/**
 * Owner-only DashboardX AI session. Secrets are NEVER saved in localStorage.
 * Only the public gateway URL is persisted. Owner token lives in JS memory
 * until the page reloads; OpenAI API key goes directly to the server.
 */
const ADDRESS_KEY = 'dashboardx.ai.gateway-url';
let gatewayUrl = '';
let ownerToken = '';
try { gatewayUrl = localStorage.getItem(ADDRESS_KEY) || ''; } catch {}

export function getGatewayUrl() { return gatewayUrl; }
export function isOwnerConfigured() { return Boolean(gatewayUrl && ownerToken); }
export function configureOwnerAccess({ url, token }) {
  if (typeof url !== 'string') throw new TypeError('Gateway URL required');
  const target = new URL(url);
  const local = target.hostname === 'localhost' || target.hostname === '127.0.0.1';
  if (target.protocol !== 'https:' && !(local && target.protocol === 'http:')) {
    throw new TypeError('Gateway requires HTTPS (HTTP allowed only on localhost)');
  }
  if (target.username || target.password || target.search || target.hash || target.pathname !== '/') {
    throw new TypeError('Enter the server origin only, without a path or credentials');
  }
  if (typeof token !== 'string' || token.length < 32) {
    throw new TypeError('Owner token must be at least 32 characters');
  }
  gatewayUrl = target.origin;
  ownerToken = token;
  try { localStorage.setItem(ADDRESS_KEY, gatewayUrl); } catch {}
  window.dispatchEvent(new Event('dashboardx:ai-config'));
}
export function disconnectOwner() {
  ownerToken = '';
  window.dispatchEvent(new Event('dashboardx:ai-config'));
}
export function gatewayFetch(path, options = {}) {
  if (!isOwnerConfigured()) return Promise.reject(new Error('Configure owner access in DashboardX Settings'));
  if (!['/api/ai/status','/api/ai/chat','/api/ai/key'].includes(path)) {
    return Promise.reject(new Error('Unsupported gateway route'));
  }
  return fetch(gatewayUrl + path, {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { ...options.headers, Authorization: 'Bearer ' + ownerToken }
  });
}
export async function gatewayStatus() {
  const response = await gatewayFetch('/api/ai/status');
  if (!response.ok) throw new Error('AI gateway HTTP ' + response.status);
  return response.json();
}
export async function installOpenAIKey(key) {
  if (typeof key !== 'string' || !key.trim()) throw new TypeError('OpenAI API key required');
  const response = await gatewayFetch('/api/ai/key', {
    method: 'PUT', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ apiKey: key.trim() })
  });
  if (!response.ok) throw new Error('Server rejected API key: HTTP ' + response.status);
  window.dispatchEvent(new Event('dashboardx:ai-config'));
  return response.json();
}
export async function removeOpenAIKey() {
  const response = await gatewayFetch('/api/ai/key', { method:'DELETE' });
  if (!response.ok) throw new Error('Cannot remove API key: HTTP ' + response.status);
  window.dispatchEvent(new Event('dashboardx:ai-config'));
  return response.json();
}
