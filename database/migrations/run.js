require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { sequelize } = require('../../backend/src/models');
const logger = require('../../backend/src/utils/logger');

async function migrate() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

migrate();
