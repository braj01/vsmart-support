require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { sequelize, Role, User } = require('../../backend/src/models');
const logger = require('../../backend/src/utils/logger');

async function seed() {
  try {
    await sequelize.authenticate();

    const [superAdminRole] = await Role.findOrCreate({ where: { name: 'SUPER_ADMIN' }, defaults: { description: 'Super Administrator' } });
    const [agentRole] = await Role.findOrCreate({ where: { name: 'SUPPORT_AGENT' }, defaults: { description: 'Support Agent' } });

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@velocis.in';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin';

    const [admin, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: { name: adminName, password: adminPassword, role_id: superAdminRole.id, is_active: true },
    });

    if (created) {
      logger.info(`Admin user created: ${adminEmail}`);
    } else {
      logger.info(`Admin user already exists: ${adminEmail}`);
    }

    logger.info('Seeding completed');
    logger.info(`Admin login: ${adminEmail} / ${adminPassword}`);
    process.exit(0);
  } catch (err) {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
}

seed();
