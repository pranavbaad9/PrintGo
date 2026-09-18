# PrintGo

PrintGo is a smart unattended printing platform that connects customers, kiosks, cloud services, and physical printers.

## Why PrintGo?

Traditional print shops require customers to hand documents to an operator, waiting in lines and compromising privacy. PrintGo aims to provide:
- Faster, self-service printing
- Document privacy (auto-deleted after 5 mins)
- 24/7 unattended operation
- Automated payment and refund workflows

---

## Core Product

Customer Mobile -> QR Scan -> File Upload -> Print Settings -> Pay (Cashfree) -> Kiosk Prints

---

## Features

### Implemented
- Real-time Kiosk/Mobile synchronization via WebSockets.
- Cashfree payment integration with automated refunds on physical print failure.
- Windows Printer Agent that polls the spooler for true physical completion, paper jams, and offline statuses.
- Tenant isolation (Franchisee / SuperAdmin roles).
- 5-minute automated document deletion post-print.
- Basic OTA (Over-The-Air) updates for the Printer Agent via Git hash pinning.
- Redis integration for horizontally scaled Socket.io and BullMQ queue management.

### In Progress
- Robust Telemetry dashboards for Franchisees.

### Planned
- Razorpay integration.
- Hardware-level encryption.
- Native C++/Rust Printer Agent.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture, state machines, and system contexts.

---

## Technology Stack

- **Backend:** Node.js, Express, Socket.io
- **Database:** PostgreSQL, Prisma ORM
- **Queue/Workers:** BullMQ (currently with in-memory fallback)
- **Frontend:** React, Vite (Kiosk & Admin UI)
- **Printer Agent:** Node.js desktop app (uses `pdf-to-printer` and PowerShell)
- **Payments:** Cashfree

---

## Repository Structure

```
.
├── ARCHITECTURE.md
├── README.md
├── backend/            # Express Cloud Backend
│   ├── prisma/         # DB Schema
│   └── src/            # Source (Clean Architecture)
├── frontend/           # React Web UIs
├── printer-agent/      # Windows Kiosk Agent
└── scripts/            # Deployment/Setup Scripts
```

---

## Local Development

### 1. Cloud Backend
```bash
cd backend
npm install
# Configure .env with DATABASE_URL, CASHFREE keys, and JWT_SECRET
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
# Configure .env with VITE_API_URL
npm run dev
```

### 3. Printer Agent (Windows Only)
```bash
cd printer-agent
npm install
# Configure .env with BACKEND_URL, PRINTER_NAME, and MACHINE_KEY
npm start
```

---

## Environment Variables

**Backend (`backend/.env`):**
- `DATABASE_URL`
- `JWT_SECRET`
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`
- `FRONTEND_URL`

**Printer Agent (`printer-agent/.env`):**
- `BACKEND_URL`
- `PRINTER_NAME`
- `MACHINE_KEY`

---

## Testing

```bash
cd backend
npm run test
```

---

## Security

PrintGo relies on JWT for web authentication and static Machine Keys for Agent WebSocket authentication. The Printer Agent validates job IDs to prevent PowerShell command injection. Files are automatically removed from the server after printing. 

See `ARCHITECTURE.md` for known limitations and security invariants.

---

## Deployment

A `docker-compose.yml` and `render.yaml` are provided in the repository root for deploying the PostgreSQL database and Node.js backend. 

### 1. Production Deployment (Render)
For production, the easiest path is deploying to Render. The `render.yaml` blueprint will automatically provision a PostgreSQL database, an Upstash Redis instance (for scaling), and the Node.js backend.
1. Create an account on Render and link your GitHub repository.
2. In the Render Dashboard, click **New > Blueprint**.
3. Select this repository. Render will read the `render.yaml` and provision the necessary services.
4. Set the required Environment Variables (`JWT_SECRET`, `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`) in the Render Dashboard under the backend service settings.

### 2. Frontend Deployment (Vercel)
The Vite-based frontend (`frontend/`) and SuperAdmin panel (`superadmin/`) are optimized for Vercel.
1. Connect your GitHub repository to Vercel.
2. Configure the Build Command to `npm run build` and the Output Directory to `dist`.
3. Set the `VITE_API_URL` environment variable to point to your deployed Render backend URL.
4. Deploy. The `vercel.json` provides the necessary URL rewriting for React Router.

### 3. Local/Self-Hosted Deployment (Docker Compose)
For local testing or self-hosting on a VPS (e.g., DigitalOcean, AWS EC2):
1. Ensure Docker and Docker Compose are installed.
2. Run `docker-compose up -d`. This will start the PostgreSQL database and the Node.js backend.
3. Note: The current `docker-compose.yml` uses in-memory BullMQ instead of Redis. To scale horizontally, you should add a Redis container to the docker-compose file.

---

## Project Status

**Pilot / Development**
The core functionality is implemented, including a dedicated Redis cluster for WebSocket scaling and BullMQ to support production scale.

---

## Roadmap

### Current
- Solidifying Cashfree payments and spooler polling.

### Future
- Razorpay integration.
- International payment gateways and embedded hardware agents.

---

## License

*(Internal / Proprietary)*

---

## Support

Please refer to internal engineering documentation for support or open an issue on the repository tracker.
