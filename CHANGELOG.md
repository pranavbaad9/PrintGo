# PrintGo Development Changelog

This document tracks the ongoing progress, completed milestones, and architecture decisions made during the development of PrintGo.

## [2026-09-18] - Production Deployment & Hardware Integration

### Added
- **Auto-Seeding Mechanism**: Implemented `autoSeed()` in `server.js` to ensure the core `Machine` and `User` records exist when deploying to fresh, empty production databases.
- **Render Health Check**: Added `/api/health` endpoint to prevent the Render free tier service from spinning down.
- **Hardware Integration**: Successfully bound the Printer Agent to the physical `HP Laser MFP 300 (Copy 1)` Windows print spooler.

### Fixed
- **Redis Requirement Bypass**: Removed the fatal `process.exit(1)` in `queueService.js`, allowing the backend to fall back to an in-memory queue when a production Redis instance is unavailable.
- **S3 Storage Fallback**: Modified `storage.js` to gracefully fall back to local disk storage if `AWS_S3_BUCKET` is missing.
- **Document Download Error (500)**: Fixed a Prisma syntax error (`printJob` -> `printJobs`) inside `file.controller.js` that was crashing the backend during physical printing downloads.
- **File Resolution Path**: Corrected the `uploadsDir` resolution path to `../../../uploads` so the backend can properly find downloaded files.
- **Agent Regex Validation**: Relaxed the strict regex in the Printer Agent to allow physical printer names containing parentheses and periods.

---

## [2026-09-17] - Hardware-Level End-to-End Encryption (E2EE)

### Added
- **Client-Side Encryption**: Implemented AES-GCM 256-bit encryption directly in the browser (`MobileView.jsx`) using Web Crypto API before the document ever hits the network.
- **Zero-Knowledge Architecture**: The Node.js cloud backend is now completely blind to document contents.
- **RSA Key Exchange**: The Windows Printer Agent now generates an ephemeral RSA-OAEP 2048-bit keypair upon boot and registers the public key with the backend.
- **Hardware-Level Decryption**: The Agent uses its private RSA key to unwrap the AES key and decrypt the payload locally.
- **Fraud Prevention**: Page counting was moved to the hardware layer (using `pdf-parse`) to prevent users from manipulating network requests to print multi-page documents for the cost of a single page.

---

## [2026-09-16] - Core Architecture & Kiosk Sync

### Added
- **WebSocket Scaling**: Connected the backend to Upstash Redis via `socket.io-redis-adapter` for horizontal scaling capabilities.
- **State Machine**: Designed and implemented the complete Kiosk-to-Mobile pairing flow via 6-digit codes.
- **Cashfree Payments**: Integrated the Cashfree API for generating payment links and handling webhook confirmations to trigger printing.

---

*(This log will be updated as new features are implemented.)*
