const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketAttachment = sequelize.define('TicketAttachment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  original_file_name: { type: DataTypes.STRING, allowNull: false },
  stored_file_name: { type: DataTypes.STRING, allowNull: false },
  file_path: { type: DataTypes.STRING, allowNull: false },
  mime_type: { type: DataTypes.STRING, allowNull: false },
  file_size: { type: DataTypes.INTEGER, allowNull: false },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'ticket_attachments', updatedAt: false });

module.exports = TicketAttachment;
