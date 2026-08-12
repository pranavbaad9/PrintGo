const prisma = require('./utils/prisma');
const logger = require('./utils/logger');

const jwt = require('jsonwebtoken');

const setupSockets = (io) => {
  // WebSocket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const machineKey = socket.handshake.auth?.machineKey;

      if (token) {
        // Authenticate Mobile/Kiosk via Session Token or Admin User Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userType = decoded.type === 'session' ? 'session' : 'admin';
        if (decoded.type === 'session') {
          socket.sessionId = decoded.sessionId;
          socket.machineId = decoded.machineId; // Optional
        }
        return next();
      } 
      
      if (machineKey) {
        // Authenticate Printer Agent via machineKey
        const machine = await prisma.machine.findUnique({ where: { machineKey } });
        
        if (!machine) {
          logger.warn(`Rejected printer connection for unknown machineKey: ${machineKey}`);
          return next(new Error('Machine not found. Please register this machine via the admin panel.'));
        }
        
        if (machine.status === 'SUSPENDED') {
          return next(new Error('Subscription Suspended'));
        }

        socket.userType = 'printer';
        socket.machineId = machine.id;
        socket.machineName = machine.name;

        // Update machine status on connect
        await prisma.machine.update({
          where: { id: machine.id },
          data: { lastOnline: new Date(), healthStatus: 'ONLINE' }
        });

        logger.info(`Physical printer authenticated: ${machine.name}`);
        return next();
      }

      next(new Error('Authentication error: Missing token or machineKey'));
    } catch (err) {
      logger.error('Socket authentication failed:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`A client connected: ${socket.id} (Type: ${socket.userType})`);

    if (socket.userType === 'printer') {
      socket.join(`machine_${socket.machineId}`);
      // Notify the printer it successfully registered
      socket.emit('printer_registered_success', { machineId: socket.machineId, name: socket.machineName });
    }

    // Kiosk <-> Mobile Sync
    socket.on('join_session', (sessionId) => {
      socket.join(sessionId);
      logger.info(`Socket ${socket.id} joined session ${sessionId}`);
    });

    socket.on('mobile_connected', (sessionId) => {
      io.to(sessionId).emit('kiosk_user_connected');
    });

    socket.on('file_uploaded', ({ sessionId, fileData }) => {
      io.to(sessionId).emit('kiosk_file_uploaded', fileData);
    });

    socket.on('settings_updated', ({ sessionId, settingsData, price }) => {
      io.to(sessionId).emit('kiosk_settings_updated', { settingsData, price });
    });

    socket.on('payment_initiated', ({ sessionId, price, jobId }) => {
      io.to(sessionId).emit('kiosk_payment_initiated', { price, jobId });
    });

    socket.on('payment_success', ({ sessionId, jobId }) => {
      io.to(sessionId).emit('kiosk_payment_success', { jobId });
    });

    socket.on('printer_status_update', async (status) => {
      if (socket.machineId) {
        try {
          await prisma.printerStatus.create({
            data: {
              machineId: socket.machineId,
              isOnline: !status.isError,
              paperStatus: status.errorMessage === 'Out of Paper' ? 'OUT' : 'OK',
              jamStatus: status.errorMessage === 'Paper Jam'
            }
          });
          
          // Telemetry would go here if we create a Telemetry model in the future
        } catch(err) {
          logger.error('Error saving printer status', err);
        }
      }
      io.emit('printer_status_update', status);
    });

    socket.on('print_spooler_success', async ({ jobId }) => {
      logger.info(`Print spooler accepted job ${jobId}`);
      try {
        const completedJob = await prisma.printJob.update({
          where: { shortId: jobId },
          data: { status: 'COMPLETED' },
          include: { document: true }
        });
        io.emit('job_status_changed', completedJob);
      } catch (err) {
        logger.error(`Failed to update job ${jobId} to COMPLETED:`, err);
      }
    });

    socket.on('print_spooler_error', async ({ jobId, error }) => {
      logger.error(`Print spooler failed for job ${jobId}: ${error}`);
      try {
        const failedJob = await prisma.printJob.update({
          where: { shortId: jobId },
          data: { status: 'FAILED' },
          include: { document: true }
        });
        io.emit('job_status_changed', failedJob);
      } catch (err) {
        logger.error(`Failed to update job ${jobId} to FAILED:`, err);
        io.emit('job_status_changed', { id: 'error', shortId: jobId, status: 'FAILED', error });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSockets;
