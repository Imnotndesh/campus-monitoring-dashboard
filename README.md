# Campus Monitor Web UI

Web dashboard for the Campus Network Monitoring System – a real‑time network intelligence platform.

![Dashboard Overview](screenshots/dashboard.png)

## Features

- **Interactive Dashboard** – Customizable widget grid (KPI cards, charts, alerts).
- **Probe Management** – List, search, adopt, configure, and delete probes.
- **Fleet Control** – Group probes, apply configuration templates, send bulk commands (OTA, deep scan, reboot).
- **Analytics** – RSSI/latency/packet loss trends, channel utilization, congestion analysis, AP heatmaps.
- **Alerts** – Real‑time incident stream, severity filters, acknowledge/dismiss actions.
- **Reports** – Generate PDF reports (alerts, analytics, fleet, compliance, firmware versions, outages).
- **Firmware Flasher** – Web‑based ESP32 flasher (Web Serial API) with verbose logs and independent serial logger.
- **Authentication** – Local login with 2FA and OAuth (Pocket ID).

## Screenshots

| Page | Preview |
|------|---------|
| Login | ![Login](screenshots/login.png) |
| Dashboard | ![Dashboard](screenshots/dashboard.png) |
| Probes | ![Probes](screenshots/probes.png) |
| Fleet | ![Fleet](screenshots/fleet.png) |
| Analytics | ![Analytics](screenshots/analytics.png) |
| Alerts | ![Alerts](screenshots/alerts.png) |
| Firmware Flasher | ![Flasher](screenshots/flasher.png) |

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- TanStack Query
- Recharts
- Lucide Icons
- Web Serial API (esptool‑js)

## Development
### Installation
Clone the repo and then from the directory run the following
```bash
npm install
npm run dev
````
### Environment Variables
Create a .env file:
```text

VITE_API_URL=http://localhost:8080
VITE_ENABLE_ADMIN_REGISTRATION=false
```
### Build
```bash
npm run build
```
### License
Found at [LICENSE.md](License.md)