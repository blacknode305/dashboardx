# DashboardX AI Gateway (owner-only)

Node.js 22+ standalone HTTP service intended for a **separate Railway service**.
DashboardX main frontend is static (GitHub Pages); never put OpenAI credentials
in the public repository or store them in `localStorage`.

## Before deploy

Create a Railway service whose root directory is `/ai-gateway` and set
start command `node server.js`. If Railway requires an explicit runtime build
plan, use Node.js 22 or higher. Do not reuse the PRO-OPTIMA server.

Set these **secrets** in Railway (generate a unique token yourself; do not commit):

- `DASHBOARDX_OWNER_TOKEN`: randomly generated secret, **at least 32 characters**.
- `DASHBOARDX_SITE_ORIGIN`: `https://blacknode305.github.io` if the DashboardX site is published via this GitHub Pages host; otherwise set its exact HTTPS origin (no trailing path).
- `OPENAI_MODEL`: `gpt-4.1-mini` by default (optional).
- `AI_REQUESTS_PER_HOUR`: `20` by default (optional, range 1–120).
- `OPENAI_API_KEY`: optional secret from Railway Variables for durable configuration after restarts. **Not needed until you buy API access.**

Then open DashboardX → Settings widget → DashboardX AI. Enter the publicly
accessible HTTPS Railway service URL and the private OWNER TOKEN you configured
in Railway. Click Connect and test. When you obtain an OpenAI key, paste it
into the separate OpenAI API-key field and click **Save key on server**.

**Security:** the address (not secret) can be persisted to browser localStorage;
the owner's token is held only in browser memory until reload, and OpenAI key
is sent directly to the gateway over HTTPS. When set via DashboardX Settings,
the API key is held in **server process memory only**, not persisted to disk:
it must be reinstalled after Railway restarts or instead set as the secret
`OPENAI_API_KEY` Railway environment variable. The Delete key button removes
the active in-memory key, but if Railway env still defines one, it will be
loaded again when the service restarts.

The gateway does not have public/free/paid user modes. It requires the
long owner bearer token on **all** AI routes, restricts browser origins, limits
requests to a fixed number per hour, accepts a bounded message, makes only
the OpenAI Responses API request and returns plain text. It never exposes
API keys or accepts arbitrary OpenAI model IDs in requests.

## Local test

```bash
DASHBOARDX_OWNER_TOKEN="$(openssl rand -hex 32)" \
DASHBOARDX_SITE_ORIGIN=http://localhost:8000 \
node ai-gateway/server.js
```

Serve the dashboard separately at `http://localhost:8000/`.
Configure gateway origin `http://localhost:3001` from the Settings widget.

**Before public launch** add TLS at Railway edge, password/account login,
spend-alert rules at OpenAI, regular secret rotation and security monitoring.
The current gateway is owner-only and is not an authorization system for
free-tier or paid subscribers.

Use `node --test tests/ai-gateway.test.js` to run isolated tests without
a live OpenAI API key.
