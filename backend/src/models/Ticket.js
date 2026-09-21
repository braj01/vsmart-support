const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  subject: { type: DataTypes.STRING(500), allowNull: false },
  requester_email: { type: DataTypes.STRING, allowNull: false },
  cc_emails: { type: DataTypes.TEXT, allowNull: true, comment: 'Comma-separated CC email addresses' },
  priority: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'), defaultValue: 'LOW' },
  status: {
    type: DataTypes.ENUM('OPEN', 'ACKNOWLEDGED', 'CLOSED'),
    defaultValue: 'OPEN',
  },
  description: { type: DataTypes.TEXT('long'), allowNull: false },
  source: { type: DataTypes.ENUM('PUBLIC_FORM', 'ADMIN', 'API'), defaultValue: 'PUBLIC_FORM' },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  public_token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  resolved_at: { type: DataTypes.DATE, allowNull: true },
  closed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'tickets',
  indexes: [
    { fields: ['ticket_number'] },
    { fields: ['requester_email'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['assigned_to'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Ticket;
