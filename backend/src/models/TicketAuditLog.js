const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketAuditLog = sequelize.define('TicketAuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING(100), allowNull: false },
  old_value: { type: DataTypes.TEXT, allowNull: true },
  new_value: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'ticket_audit_logs', updatedAt: false });

module.exports = TicketAuditLog;
