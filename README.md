# PrintGo Enterprise

PrintGo is a modern, enterprise-grade Smart Printing Kiosk and Software Subscription platform. We manufacture and sell the PrintGo Smart Printing Kiosk, while our recurring revenue is driven by a powerful Cloud Backend offering tiered SaaS subscription plans (Starter, Pro, Enterprise).

## Core Architecture

PrintGo is built on a scalable, modular architecture consisting of three main components:

1.  **Cloud Backend (Node.js + Express + Prisma + PostgreSQL)**
    *   **Clean Architecture:** Structured into `src/modules`, `src/middlewares`, and `src/utils` to maintain strict separation of concerns.
    *   **Features:** RESTful API for managing Kiosks, Franchisees, Print Jobs, Payments, Subscriptions, and robust Audit Logging.
    *   **Security:** Rate limiting, `helmet`, CORS validation, and secure JWT-based authentication. Role-based Access Control (SuperAdmin, Franchisee, Staff, Customer).
    *   **WebSockets:** Real-time bi-directional communication between the Kiosk, the Mobile Device, and the Printer Agent.

2.  **Frontend (React + Vite + Tailwind/Custom Premium CSS)**
    *   **Kiosk Interface:** The screen displayed on the physical kiosk allowing users to scan a QR code.
    *   **Mobile Interface:** An optimized, highly premium web interface for the end-user to upload files, configure print settings (color, copies, sides, custom pages), and pay securely.
    *   **Admin Dashboard:** A robust enterprise dashboard for monitoring revenue, printer telemetry, job queues, ink/paper levels, and franchise management.

3.  **Printer Agent (Node.js desktop agent)**
    *   **Hardware Interface:** Runs directly on the Windows mini-PC inside the PrintGo Kiosk.
    *   **Print Spooling:** Interfaces with the Windows Print Spooler via `pdf-to-printer` and PowerShell to execute physical prints and apply advanced settings (color/monochrome, copies, pages).
    *   **Telemetry:** Actively monitors OS metrics (CPU, RAM, Uptime) and physical printer states (Paper Out, Paper Jam) and streams them to the Cloud Backend.

## Installation & Setup

### 1. Cloud Backend
```bash
cd backend
npm install
# Configure your .env file with DATABASE_URL, CASHFREE keys, and JWT_SECRET
npx prisma generate
npx prisma db push
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
# Configure your .env file with VITE_API_URL
npm run dev
```

### 3. Printer Agent
```bash
cd printer-agent
npm install
# Configure your .env file with BACKEND_URL, PRINTER_NAME, and MACHINE_KEY
npm start
```

## Business Logic Summary

*   **Payment Flow:** End-users initiate payments via the Mobile UI which triggers an order creation through the Payments module integrating with Cashfree (with future support designed for Razorpay). Webhook endpoints process the success/failure state asynchronously.
*   **Subscription Enforcement:** Machines belong to a `Company` and are tied to a `Subscription`. If a subscription expires or is manually suspended, the backend emits a `machine_suspended` event forcing the Printer Agent to lock down and halt print jobs.

## Development Guidelines
- Always use the `AppError` and centralized `logger.js` classes in the backend.
- Create UI components in `frontend/src/components/ui/` for reusability.
- The `Printer Agent` is heavily tied to Windows APIs. Use `child_process` and PowerShell scripts responsibly.

---
*Built for the future of self-service printing.*
