const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketStatusHistory = sequelize.define('TicketStatusHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  old_status: { type: DataTypes.STRING(20), allowNull: true },
  new_status: { type: DataTypes.STRING(20), allowNull: false },
  changed_by: { type: DataTypes.INTEGER, allowNull: true },
  reason: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'ticket_status_history', updatedAt: false });

module.exports = TicketStatusHistory;
