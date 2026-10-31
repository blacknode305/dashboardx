# DashboardX Radio API (Railway)

Independent Node.js service. Does not access PRO OPTIMA.

Deploy this repository to Railway with **Root Directory** set to `radio-api`. Configure:
- `RADIO_API_TOKEN`: random secret of 20+ characters. Use the same secret in the audio widget's Radio section.
- `RADIO_DATA_FILE=/data/radio-stations.json`
- `RADIO_ALLOWED_ORIGINS=https://blacknode305.github.io` (comma-separated for additional clients)
- Persistent Railway volume mounted at `/data` (required; without a volume, data may disappear on redeploy).

Enable a Railway public HTTPS domain, paste it into the audio widget and load stations.
Endpoints: `GET /health`, authenticated `GET/POST /api/radio/stations`, `DELETE /api/radio/stations/:id`.
Authorization: `Bearer <RADIO_API_TOKEN>`. Stores metadata only (station title and stream URL), not audio.
