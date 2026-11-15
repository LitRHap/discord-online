import { config } from './src/config.js';
import { logger } from './src/logger.js';
import { OnlineKeeper } from './src/keeper.js';
import { startHealthServer } from './src/health.js';

const keeper = new OnlineKeeper(config);
startHealthServer(config.port, () => keeper.status);

try {
  await keeper.start();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const shutdown = async () => {
  await keeper.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (e) => logger.error(e, 'Unhandled rejection'));
