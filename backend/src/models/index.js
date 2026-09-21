const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Ticket = require('./Ticket');
const TicketComment = require('./TicketComment');
const TicketAttachment = require('./TicketAttachment');
const TicketStatusHistory = require('./TicketStatusHistory');
const TicketAuditLog = require('./TicketAuditLog');

// Associations
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id' });

Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Ticket.hasMany(TicketComment, { foreignKey: 'ticket_id', as: 'comments' });
Ticket.hasMany(TicketAttachment, { foreignKey: 'ticket_id', as: 'attachments' });
Ticket.hasMany(TicketStatusHistory, { foreignKey: 'ticket_id', as: 'statusHistory' });
Ticket.hasMany(TicketAuditLog, { foreignKey: 'ticket_id', as: 'auditLogs' });

TicketComment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
TicketAttachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
TicketStatusHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedBy' });
TicketAuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

module.exports = { sequelize, Role, User, Ticket, TicketComment, TicketAttachment, TicketStatusHistory, TicketAuditLog };
