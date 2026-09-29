require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
});

const { startImapPoller } = require('./services/imapService');
const PORT = process.env.PORT || 5000;

async function start() {
  let retries = 0;
  while (true) {
    try {
      await sequelize.authenticate();
      logger.info('Database connected');
      app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
      startImapPoller().catch(err => logger.error(`IMAP poller error: ${err.message}`));
      return;
    } catch (err) {
      retries++;
      logger.error(`Startup failed (attempt ${retries}): ${err.message} — retrying in 10s`);
      await new Promise(r => setTimeout(r, 10_000));
    }
  }
}

start();
