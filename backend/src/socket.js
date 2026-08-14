const prisma = require('./utils/prisma');
const logger = require('./utils/logger');
const { isValidJobTransition } = require('./utils/stateMachine');

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
        // Validate machineKey against database
        const machine = await prisma.machine.findUnique({ where: { machineKey } });
        if (!machine) {
          logger.warn(`Printer agent connection rejected: invalid machineKey`);
          return next(new Error('Authentication error: Invalid machine key'));
        }
        if (machine.status === 'SUSPENDED') {
          logger.warn(`Printer agent connection rejected: machine ${machine.id} is suspended`);
          return next(new Error('Authentication error: Machine is suspended'));
        }
        socket.userType = 'printer';
        socket.machineId = machine.id;
        socket.machineName = machine.name;
        logger.info(`Printer agent authenticated: ${machine.name} (${machine.id})`);
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

    // Admin users join the 'admins' room for receiving printer status updates
    if (socket.userType === 'admin') {
      socket.join('admins');
    }

    // Kiosk <-> Mobile Sync
    socket.on('join_session', (sessionId) => {
      // Validate: session tokens can only join their own session room
      if (socket.userType === 'session' && socket.sessionId && socket.sessionId !== sessionId) {
        logger.warn(`Socket ${socket.id} tried to join session ${sessionId} but owns ${socket.sessionId}`);
        return;
      }
      socket.join(sessionId);
      logger.info(`Socket ${socket.id} joined session ${sessionId}`);
    });

    // Helper: validate that the emitting socket owns the target session
    const validateSessionOwnership = (socket, targetSessionId) => {
      if (socket.userType !== 'session') return false;
      if (!socket.sessionId || socket.sessionId !== targetSessionId) {
        logger.warn(`Socket ${socket.id} tried to emit to session ${targetSessionId} but owns ${socket.sessionId}`);
        return false;
      }
      return true;
    };

    socket.on('mobile_connected', (sessionId) => {
      if (!validateSessionOwnership(socket, sessionId)) return;
      io.to(sessionId).emit('kiosk_user_connected');
    });

    socket.on('file_uploaded', ({ sessionId, fileData }) => {
      if (!validateSessionOwnership(socket, sessionId)) return;
      io.to(sessionId).emit('kiosk_file_uploaded', fileData);
    });

    socket.on('settings_updated', ({ sessionId, settingsData, price }) => {
      if (!validateSessionOwnership(socket, sessionId)) return;
      io.to(sessionId).emit('kiosk_settings_updated', { settingsData, price });
    });

    socket.on('payment_initiated', ({ sessionId, price, jobId }) => {
      if (!validateSessionOwnership(socket, sessionId)) return;
      io.to(sessionId).emit('kiosk_payment_initiated', { price, jobId });
    });

    socket.on('payment_success', ({ sessionId, jobId }) => {
      if (!validateSessionOwnership(socket, sessionId)) return;
      io.to(sessionId).emit('kiosk_payment_success', { jobId });
    });

    socket.on('cancel_session', ({ sessionId }) => {
      if (!validateSessionOwnership(socket, sessionId)) return;
      io.to(sessionId).emit('session_cancelled');
    });

    socket.on('heartbeat', async () => {
      if (socket.machineId) {
        try {
          await prisma.machine.update({
            where: { id: socket.machineId },
            data: { lastOnline: new Date() }
          });
        } catch (err) {
          logger.error(`Error updating heartbeat for machine ${socket.machineId}:`, err);
        }
      }
    });

    socket.on('printer_status_update', async (status) => {
      if (socket.machineId) {
        try {
          await prisma.machine.update({
            where: { id: socket.machineId },
            data: { lastOnline: new Date() }
          });

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
      // Send printer status ONLY to admin sockets, not to customer phones
      io.to('admins').emit('printer_status_update', status);
    });

    socket.on('print_spooler_success', async ({ jobId }) => {
      // Only printer agents should report spooler results
      if (socket.userType !== 'printer') return;
      logger.info(`Print spooler accepted job ${jobId}. Awaiting physical completion...`);
      // P3-001: We do NOT mark it COMPLETED here anymore. It stays PRINTING until physical success.
    });

    socket.on('print_physical_success', async ({ jobId }) => {
      if (socket.userType !== 'printer') return;
      logger.info(`Physical print success for job ${jobId}`);
      try {
        const currentJob = await prisma.printJob.findUnique({ where: { shortId: jobId }, include: { document: true } });
        if (!currentJob || !isValidJobTransition(currentJob.status, 'COMPLETED')) return;
        
        const completedJob = await prisma.printJob.update({
          where: { shortId: jobId },
          data: { status: 'COMPLETED' },
          include: { document: true }
        });

        io.to(`machine_${socket.machineId}`).emit('job_status_changed', completedJob);
        io.to('admins').emit('job_status_changed', completedJob);

        // P1-002 / P2-001: Schedule document file deletion after 5 minutes (grace period)
        if (completedJob.document && completedJob.document.filename) {
          const { deleteFile } = require('./utils/storage');
          setTimeout(() => deleteFile(completedJob.document.filename), 5 * 60 * 1000);
        }
      } catch (err) {
        logger.error(`Failed to update job ${jobId} to COMPLETED:`, err);
      }
    });

    socket.on('print_physical_error', async ({ jobId, error }) => {
      if (socket.userType !== 'printer') return;
      logger.error(`Physical print error for job ${jobId}: ${error}`);
      try {
        const currentJob = await prisma.printJob.findUnique({ where: { shortId: jobId } });
        if (!currentJob || !isValidJobTransition(currentJob.status, 'FAILED')) return;

        const failedJob = await prisma.printJob.update({
          where: { shortId: jobId },
          data: { status: 'FAILED' },
          include: { document: true }
        });

        io.to(`machine_${socket.machineId}`).emit('job_status_changed', failedJob);
        io.to('admins').emit('job_status_changed', failedJob);

        // P1-003: Delete document file when job fails
        if (failedJob.document && failedJob.document.filename) {
          const { deleteFile } = require('./utils/storage');
          setTimeout(() => deleteFile(failedJob.document.filename), 5 * 60 * 1000);
        }

        // P3-002: Automated Refund on Print Failure
        if (failedJob.paymentId) {
          logger.info(`Initiating automated refund for FAILED job ${jobId}...`);
          const paymentsService = require('./modules/payments/payments.service');
          await paymentsService.refundPaymentByJob(failedJob.id);
        }
      } catch (err) {
        logger.error(`Failed to process physical error for job ${jobId}:`, err);
      }
    });

    socket.on('print_spooler_error', async ({ jobId, error }) => {
      if (socket.userType !== 'printer') {
        logger.warn(`Non-printer socket ${socket.id} tried to report spooler error`);
        return;
      }
      logger.error(`Print spooler failed for job ${jobId}: ${error}`);
      try {
        // Validate state transition before updating
        const currentJob = await prisma.printJob.findUnique({ where: { shortId: jobId } });
        if (!currentJob || !isValidJobTransition(currentJob.status, 'FAILED')) {
          logger.warn(`Ignoring spooler error for job ${jobId}: invalid transition from ${currentJob?.status}`);
          return;
        }
        const failedJob = await prisma.printJob.update({
          where: { shortId: jobId },
          data: { status: 'FAILED' },
          include: { document: true }
        });
        io.to(`machine_${socket.machineId}`).emit('job_status_changed', failedJob);
        io.to('admins').emit('job_status_changed', failedJob);

        // P1-003: Delete document file when job fails
        if (failedJob.document && failedJob.document.filename) {
          const { deleteFile } = require('./utils/storage');
          setTimeout(() => deleteFile(failedJob.document.filename), 5 * 60 * 1000);
        }
      } catch (err) {
        logger.error(`Failed to update job ${jobId} to FAILED:`, err);
        io.to(`machine_${socket.machineId}`).emit('job_status_changed', { id: 'error', shortId: jobId, status: 'FAILED', error });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSockets;
