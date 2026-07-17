# PrintGo Enterprise

PrintGo is a next-generation self-service cloud printing solution. It allows users to scan a QR code at a physical kiosk, upload their documents from their mobile device, customize print settings, pay securely via Cashfree, and have their documents instantly printed. 

This repository contains the full source code, which has been recently upgraded to an Enterprise 100/100 standard.

## Architecture

PrintGo is divided into three components:
1. **Frontend** (`/frontend`): A responsive React application built with Vite, featuring a real-time Kiosk UI, a Mobile Upload flow, and a secure Admin Dashboard.
2. **Backend** (`/backend`): A robust Node.js API built with Express, featuring Clean Architecture (Controllers/Services), Zod input validation, JWT Admin Authentication, Socket.io for real-time updates, and a Prisma ORM configured for PostgreSQL.
3. **Printer Agent** (`/printer-agent`): A lightweight Node.js service designed to run on the local computer connected to the printer. It listens to WebSocket events from the cloud backend, downloads print jobs, and interfaces directly with the Windows Print Spooler (`pdf-to-printer` & `powershell` for status reporting).

## Enterprise Upgrades

* **Prisma ORM & PostgreSQL Ready**: Migrated from flat JSON files to a relational schema for high scalability and concurrency.
* **Security & Validation**: Integrated `helmet`, `express-rate-limit`, `cookie-parser`, and `zod` for strict request parsing and defense against injection attacks.
* **JWT Admin Auth**: The `/admin` routes and dashboard are protected by secure HTTP-only cookies and bcrypt hashed credentials.
* **Payment Webhooks**: Secure HMAC signature validation for Cashfree Payment Gateway webhooks to guarantee idempotency and avoid spoofing.
* **Docker Support**: Added `docker-compose.yml` and multi-stage `Dockerfile`s for rapid orchestration and scalable deployments.
* **Comprehensive Testing**: Setup `Jest` and `Supertest` for backend API and validator testing.
* **Real-time Metrics**: Optimized Socket.io events with fallback checks to ensure the print queues and active jobs remain precisely synchronized across the Kiosk, Mobile, and Admin dashboards.

## Getting Started

### Prerequisites
* Node.js v18+
* Docker & Docker Compose (optional for local deployment)
* Cashfree Sandbox Account (for payments)

### Running Locally

**1. Database Setup**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
```

**2. Start Backend**
```bash
npm run dev
```

**3. Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

**4. Start Printer Agent (on physical machine)**
```bash
cd printer-agent
npm install
npm start
```

## Environment Variables

Check the respective `.env.example` files in each directory.

* **Backend**: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`, `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`
* **Frontend**: `VITE_API_URL`
* **Printer Agent**: `BACKEND_URL`, `PRINTER_NAME`

## License
MIT
