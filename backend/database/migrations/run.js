require('dotenv').config();
const sequelize = require('../../src/config/database');
require('../../src/models'); // load all models + associations

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');
    await sequelize.sync({ alter: true });
    console.log('All tables synced (alter: true).');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();
