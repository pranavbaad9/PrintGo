const Redis = require('ioredis');

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  tls: process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash') ? {} : undefined
};

const connection = new Redis(redisOptions);

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = { connection };
