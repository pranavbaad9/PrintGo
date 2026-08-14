const { PrismaClient } = require('@prisma/client');

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    printJob: {
      async update({ model, operation, args, query }) {
        const result = await query(args);
        
        // Architecture Fix: Tightly couple DB updates to WebSocket events
        if (global.io && result) {
          if (result.machineId) {
            global.io.to(`machine_${result.machineId}`).emit('job_status_changed', result);
          }
          global.io.to('admins').emit('job_status_changed', result);
        }
        
        return result;
      }
    }
  }
});

module.exports = prisma;
