/**
 * Read-only HTTP monitor controller.
 * Browser checks can be blocked by CORS; production monitoring belongs on
 * the server, where scheduled probes can record outages independently.
 */
export default class ServerMonitorWidget {
  constructor({ endpoint = '/health', fetchImpl = fetch } = {}) {
    this.fetchImpl = fetchImpl;
    this.setEndpoint(endpoint);
    this.state = { status: 'idle', latencyMs: null, checkedAt: null, error: null };
  }
  setEndpoint(endpoint) {
    if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//') || endpoint.includes('\\')) {
      throw new TypeError('Monitor endpoint must be a same-origin path');
    }
    this.endpoint = endpoint;
  }
  getState() { return { ...this.state }; }
  async refresh() {
    const started = performance.now();
    this.state = { ...this.state, status: 'checking', error: null };
    try {
      const response = await this.fetchImpl(this.endpoint, { cache: 'no-store' });
      this.state = {
        status: response.ok ? 'online' : 'offline',
        latencyMs: Math.round(performance.now() - started),
        checkedAt: new Date().toISOString(),
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch(error) {
      this.state = {
        status: 'unknown',
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        error: String(error.message ?? error)
      };
    }
    return this.getState();
  }
  destroy() {}
}
