const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.ENUM('SUPER_ADMIN', 'SUPPORT_AGENT'), allowNull: false, unique: true },
  description: { type: DataTypes.STRING },
}, { tableName: 'roles' });

module.exports = Role;
