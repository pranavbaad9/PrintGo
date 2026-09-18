require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/error');
const setupSockets = require('./socket');

// Initialize Express App
const app = express();
app.set('trust proxy', 1);

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0, 
    profilesSampleRate: 1.0, 
  });
}

const { createAdapter } = require('@socket.io/redis-adapter');
const { connection } = require('./services/redisClient');

// Server & Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://print-go-steel.vercel.app", "http://localhost:5173", "http://localhost:4173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

if (connection) {
  const pubClient = connection;
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Redis adapter attached to Socket.io');
}

app.set('io', io);
global.io = io;
setupSockets(io);

// Security & Middlewares
app.use(helmet());
app.use(cors({
  origin: ["https://print-go-steel.vercel.app", "http://localhost:5173", "http://localhost:4173", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 req per IP
  message: 'Too many requests, please try again later.'
});
app.use('/api/', apiLimiter);

app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(cookieParser());

// Uploads directory
const { fileAuth } = require('./middlewares/fileAuth');
const { serveDocument } = require('./modules/files/file.controller');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.get('/uploads/:filename', fileAuth, serveDocument);

// Health Check (Keep-Alive for Render Free Tier)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const jobsRoutes = require('./modules/jobs/jobs.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const machinesRoutes = require('./modules/machines/machines.routes');
const companiesRoutes = require('./modules/companies/companies.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const subscriptionsRoutes = require('./modules/subscriptions/subscriptions.routes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// Error Handling
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

// Initialize Queue Worker
const { initWorker } = require('./services/queueService');
const { initUploadWorker } = require('./services/uploadWorker');
try {
  initWorker(io);
  initUploadWorker();
} catch (e) {
  logger.warn('Failed to initialize queue workers, possibly Redis not running: ' + e.message);
}

const port = process.env.PORT || 5000;
server.listen(port, () => {
  logger.info(`Enterprise PrintGo backend running at http://localhost:${port}`);
});
