const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketComment = sequelize.define('TicketComment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  comment: { type: DataTypes.TEXT('long'), allowNull: false },
  type: { type: DataTypes.ENUM('PUBLIC_REPLY', 'INTERNAL_NOTE'), defaultValue: 'PUBLIC_REPLY' },
  reply_to: { type: DataTypes.STRING, allowNull: true },
  reply_cc: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'ticket_comments' });

module.exports = TicketComment;
