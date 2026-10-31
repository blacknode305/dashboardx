# EmulatorJS vendor files

Upstream: https://github.com/EmulatorJS/EmulatorJS (main branch, copied 2026-11-01).

These files contain third-party EmulatorJS source code. License: GPL-3.0; see [LICENSE](LICENSE). Do not delete copyright headers or notices.

DashboardX keeps the emulator frontend and its imports on the same origin to avoid cross-origin JavaScript module failures. Game ROMs are **not** included or uploaded to DashboardX. EmulatorJS binary cores and other non-vendored assets are loaded at runtime from the official `https://cdn.emulatorjs.org/latest/data/` CDN; the emulator therefore still requires internet access.

To update these files, use a coherent set from the same upstream revision, not mixed frontend/module versions.
