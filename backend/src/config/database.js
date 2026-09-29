require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,  // max ms to get a connection from pool
      idle: 10000,     // ms before idle connection is released
      evict: 10000,    // ms interval to evict stale connections
    },
    dialectOptions: {
      connectTimeout: 10000,          // TCP connect timeout 10s
      socketPath: process.env.DB_SOCKET || undefined, // fallback to socket if set
    },
    retry: {
      max: 3,  // retry failed queries up to 3 times
    },
    define: { timestamps: true, underscored: true },
  }
);

module.exports = sequelize;
