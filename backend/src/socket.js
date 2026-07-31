const prisma = require('./utils/prisma');
const logger = require('./utils/logger');

const setupSockets = (io) => {
  io.on('connection', (socket) => {
    logger.info(`A user connected: ${socket.id}`);

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

    // Printer Agent Events
    socket.on('register_printer', async (data) => {
      try {
        const { printerName, machineKey } = data;
        if (!machineKey) {
          return socket.emit('printer_registration_failed', { error: 'Machine Key is required' });
        }

        let machine = await prisma.machine.findUnique({ where: { machineKey } });
        
        if (!machine) {
          // Auto-register the machine if it doesn't exist
          machine = await prisma.machine.create({
            data: {
              machineKey,
              name: printerName || 'Auto-registered Kiosk',
              status: 'ACTIVE'
            }
          });
          logger.info(`Auto-registered new machine with key: ${machineKey}`);
        }
        
        if (machine.status === 'SUSPENDED') {
          return socket.emit('printer_registration_failed', { error: 'Subscription Suspended' });
        }

        // Join machine specific room
        socket.join(`machine_${machine.id}`);
        socket.machineId = machine.id;
        
        // Update machine status
        await prisma.machine.update({
          where: { id: machine.id },
          data: { lastOnline: new Date(), healthStatus: 'ONLINE' }
        });
        
        logger.info(`Physical printer registered for machine: ${machine.name}`);
        socket.emit('printer_registered_success', { machineId: machine.id, name: machine.name });
      } catch (error) {
        logger.error('Error registering printer:', error);
      }
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
          
          if (status.telemetry) {
            await prisma.telemetry.create({
              data: {
                machineId: socket.machineId,
                cpuUsage: 0, // OS module on windows doesn't give accurate CPU load easily
                memoryUsage: parseFloat(status.telemetry.memoryUsage) || 0,
                temperature: 0,
                uptime: parseInt(status.telemetry.uptime) || 0
              }
            });
          }
        } catch(err) {
          logger.error('Error saving printer status', err);
        }
      }
      io.emit('printer_status_update', status);
    });

    socket.on('print_spooler_success', ({ jobId }) => {
      logger.info(`Print spooler accepted job ${jobId}`);
    });

    socket.on('print_spooler_error', ({ jobId, error }) => {
      logger.error(`Print spooler failed for job ${jobId}: ${error}`);
      io.emit('job_status_changed', { id: 'error', shortId: jobId, status: 'Failed', error });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSockets;
