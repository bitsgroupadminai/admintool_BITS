import app from './app.js';
import { env } from './core/config/env.js';
import { connectDb } from './core/config/db.js';
import { connectRedis } from './core/config/redis.js';
import { logger } from './core/logger/index.js';

async function start() {
  await connectDb();
  await connectRedis();

  app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
