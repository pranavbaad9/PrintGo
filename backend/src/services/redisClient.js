const Redis = require('ioredis');

let connection = null;

if (process.env.REDIS_HOST) {
  const redisOptions = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    tls: process.env.REDIS_HOST.includes('upstash') ? {} : undefined
  };

  connection = new Redis(redisOptions);

  connection.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
}

module.exports = { connection };
