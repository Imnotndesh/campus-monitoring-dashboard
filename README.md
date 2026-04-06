# Campus Monitor Web UI

Web dashboard for the Campus Network Monitoring System – a real‑time network intelligence platform.
## Dashboard
<img width="1343" height="700" alt="image" src="https://github.com/user-attachments/assets/8e0726fb-1afb-4ea5-9145-e1e9408e885e" />

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
### Login
<img width="1353" height="649" alt="image" src="https://github.com/user-attachments/assets/7ede8a15-847c-48cd-b384-69d40832c262" />
### Probes
<img width="1355" height="646" alt="image" src="https://github.com/user-attachments/assets/9e855d13-2b38-4685-bb9a-dbfe22e8cc34" />
<img width="1353" height="642" alt="image" src="https://github.com/user-attachments/assets/ad5abd2c-b3cc-4ec2-b802-851b5546d670" />
<img width="1354" height="666" alt="image" src="https://github.com/user-attachments/assets/d155fb8e-269a-4369-93c9-8d2c94fcf8da" />

### Fleet
<img width="1357" height="661" alt="image" src="https://github.com/user-attachments/assets/6943207d-599a-43a1-8fef-580d939016cc" />

### Analytics
<img width="1358" height="644" alt="image" src="https://github.com/user-attachments/assets/3ccffbb6-d2bd-43ef-9531-5c5a74feace2" />

### Alerts
<img width="1358" height="645" alt="image" src="https://github.com/user-attachments/assets/5805fe08-6f92-499a-96ed-ed3933bdaaf4" />

### Firmware flasher
<img width="1366" height="733" alt="image" src="https://github.com/user-attachments/assets/42b9c6b2-6e84-4c99-bbd3-095ada748d39" />

### Topology
<img width="1360" height="646" alt="image" src="https://github.com/user-attachments/assets/97fccb81-1781-4ed8-9777-0d5e4e45f9ea" />


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
