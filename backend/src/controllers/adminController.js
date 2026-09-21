const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');
const { Ticket, TicketComment, TicketAttachment, TicketStatusHistory, TicketAuditLog, User, Role } = require('../models');
const { sanitizeHtml } = require('../utils/sanitize');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendCommentNotificationEmail, sendStatusChangedEmail, sendPriorityChangedEmail, sendTicketAssignedEmail } = require('../services/emailService');
const { uploadDir } = require('../middleware/upload');
const logger = require('../utils/logger');

async function listTickets(req, res) {
  const { page = 1, limit = 20, status, priority, assigned_to, search, sort = 'created_at', order = 'DESC' } = req.query;
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigned_to) where.assigned_to = assigned_to === 'unassigned' ? null : assigned_to;
  if (search) {
    where[Op.or] = [
      { ticket_number: { [Op.like]: `%${search}%` } },
      { subject: { [Op.like]: `%${search}%` } },
      { requester_email: { [Op.like]: `%${search}%` } },
    ];
  }
  const allowedSort = ['created_at', 'updated_at', 'priority', 'status', 'ticket_number'];
  const sortField = allowedSort.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await Ticket.findAndCountAll({
    where,
    include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }],
    order: [[sortField, sortOrder]],
    limit: Math.min(parseInt(limit), 100),
    offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 100),
  });
  return successResponse(res, { tickets: rows, total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) });
}

async function getTicket(req, res) {
  const ticket = await Ticket.findByPk(req.params.id, {
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
      { model: TicketAttachment, as: 'attachments', attributes: { exclude: ['file_path'] } },
      { model: TicketComment, as: 'comments', include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }], order: [['created_at', 'ASC']] },
      { model: TicketStatusHistory, as: 'statusHistory', include: [{ model: User, as: 'changedBy', attributes: ['id', 'name'] }], order: [['created_at', 'ASC']] },
    ],
  });
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  return successResponse(res, ticket);
}

async function updateTicket(req, res) {
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  const { subject, priority, status, assigned_to } = req.body;
  const updates = {};
  if (subject) updates.subject = subject;
  if (priority) updates.priority = priority;
  if (status) updates.status = status;
  if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
  await ticket.update(updates);
  return successResponse(res, ticket, 'Ticket updated successfully');
}

async function changeStatus(req, res) {
  const { status, reason } = req.body;
  if (!['OPEN', 'ACKNOWLEDGED', 'CLOSED'].includes(status)) return errorResponse(res, 'Invalid status', 400);
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  const oldStatus = ticket.status;
  const updates = { status };
  if (status === 'CLOSED') updates.closed_at = new Date();

  const t = await sequelize.transaction();
  try {
    await ticket.update(updates, { transaction: t });
    await TicketStatusHistory.create({ ticket_id: ticket.id, old_status: oldStatus, new_status: status, changed_by: req.user.id, reason }, { transaction: t });
    await TicketAuditLog.create({ ticket_id: ticket.id, user_id: req.user.id, action: 'STATUS_CHANGED', old_value: oldStatus, new_value: status }, { transaction: t });
    await t.commit();
    sendStatusChangedEmail(ticket, oldStatus, status, req.user.name).catch(err => logger.error(err.message));
    return successResponse(res, ticket, 'Status updated');
  } catch (err) {
    await t.rollback();
    return errorResponse(res, err.message);
  }
}

async function changePriority(req, res) {
  const { priority } = req.body;
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  const old = ticket.priority;
  await ticket.update({ priority });
  await TicketAuditLog.create({ ticket_id: ticket.id, user_id: req.user.id, action: 'PRIORITY_CHANGED', old_value: old, new_value: priority });
  sendPriorityChangedEmail(ticket, old, priority, req.user.name).catch(err => logger.error(err.message));
  return successResponse(res, ticket, 'Priority updated');
}

async function assignTicket(req, res) {
  const { assigned_to } = req.body;
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  const old = ticket.assigned_to;
  await ticket.update({ assigned_to: assigned_to || null });
  await TicketAuditLog.create({ ticket_id: ticket.id, user_id: req.user.id, action: 'TICKET_ASSIGNED', old_value: old ? String(old) : null, new_value: assigned_to ? String(assigned_to) : null });
  if (assigned_to) {
    const agent = agents.find ? null : await User.findByPk(assigned_to, { attributes: ['name'] });
    const agentName = agent?.name || agents?.find?.(a => a.id == assigned_to)?.name;
    sendTicketAssignedEmail(ticket, agentName).catch(err => logger.error(err.message));
  }
  return successResponse(res, ticket, 'Ticket assigned');
}

async function addComment(req, res) {
  const { comment, type = 'PUBLIC_REPLY', reply_to, reply_cc, close_after = false } = req.body;
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  const clean = sanitizeHtml(comment);

  const t = await sequelize.transaction();
  try {
    const newComment = await TicketComment.create({ ticket_id: ticket.id, user_id: req.user.id, comment: clean, type, reply_to: reply_to || ticket.requester_email, reply_cc: reply_cc || ticket.cc_emails || null }, { transaction: t });
    await TicketAuditLog.create({ ticket_id: ticket.id, user_id: req.user.id, action: type === 'INTERNAL_NOTE' ? 'INTERNAL_NOTE_ADDED' : 'REPLY_ADDED' }, { transaction: t });

    // Auto-acknowledge on first admin public reply
    if (type === 'PUBLIC_REPLY' && ticket.status === 'OPEN') {
      const newStatus = close_after ? 'CLOSED' : 'ACKNOWLEDGED';
      await ticket.update({ status: newStatus, ...(close_after ? { closed_at: new Date() } : {}) }, { transaction: t });
      await TicketStatusHistory.create({ ticket_id: ticket.id, old_status: 'OPEN', new_status: newStatus, changed_by: req.user.id }, { transaction: t });
    } else if (type === 'PUBLIC_REPLY' && close_after) {
      await ticket.update({ status: 'CLOSED', closed_at: new Date() }, { transaction: t });
      await TicketStatusHistory.create({ ticket_id: ticket.id, old_status: ticket.status, new_status: 'CLOSED', changed_by: req.user.id }, { transaction: t });
    }

    await t.commit();

    if (type === 'PUBLIC_REPLY') {
      const emailTarget = { ...ticket.dataValues };
      if (reply_to) emailTarget.requester_email = reply_to;
      if (reply_cc !== undefined) emailTarget.cc_emails = reply_cc;
      sendCommentNotificationEmail(emailTarget, newComment, req.user.name).catch(err => logger.error(err.message));
    }
    return successResponse(res, newComment, 'Comment added', 201);
  } catch (err) {
    await t.rollback();
    return errorResponse(res, err.message);
  }
}

async function uploadAttachment(req, res) {
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return errorResponse(res, 'Ticket not found', 404);
  const files = req.files || [];
  if (!files.length) return errorResponse(res, 'No files uploaded', 400);
  const attachments = await TicketAttachment.bulkCreate(files.map(f => ({
    ticket_id: ticket.id, original_file_name: f.originalname, stored_file_name: f.filename,
    file_path: f.path, mime_type: f.mimetype, file_size: f.size, uploaded_by: req.user.id,
  })));
  await TicketAuditLog.create({ ticket_id: ticket.id, user_id: req.user.id, action: 'ATTACHMENT_UPLOADED', metadata: { count: files.length } });
  return successResponse(res, attachments, 'Attachments uploaded', 201);
}

async function downloadAttachment(req, res) {
  const att = await TicketAttachment.findOne({ where: { id: req.params.attachmentId, ticket_id: req.params.id } });
  if (!att) return errorResponse(res, 'Attachment not found', 404);
  if (!fs.existsSync(att.file_path)) return errorResponse(res, 'File not found on server', 404);
  res.download(att.file_path, att.original_file_name);
}

async function getDashboard(req, res) {
  try {
    const [statusCounts, priorityCounts, recentTickets] = await Promise.all([
      Ticket.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'], raw: true }),
      Ticket.findAll({ attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['priority'], raw: true }),
      Ticket.findAll({ attributes: [[sequelize.fn('DATE', sequelize.col('created_at')), 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: [sequelize.fn('DATE', sequelize.col('created_at'))], order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']], limit: 7, raw: true }),
    ]);
    const stats = { total: 0, OPEN: 0, ACKNOWLEDGED: 0, CLOSED: 0, URGENT: 0, HIGH: 0 };
    statusCounts.forEach(r => { stats[r.status] = parseInt(r.count); stats.total += parseInt(r.count); });
    priorityCounts.forEach(r => { if (r.priority === 'URGENT') stats.URGENT = parseInt(r.count); if (r.priority === 'HIGH') stats.HIGH = parseInt(r.count); });
    return successResponse(res, { stats, statusCounts, priorityCounts, recentTickets });
  } catch (err) {
    logger.error(`Dashboard error: ${err.message}`);
    return errorResponse(res, err.message);
  }
}

async function getAuditLogs(req, res) {
  const { page = 1, limit = 50, ticket_id } = req.query;
  const where = ticket_id ? { ticket_id } : {};
  const { count, rows } = await TicketAuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email'] }],
    order: [['created_at', 'DESC']],
    limit: Math.min(parseInt(limit), 100),
    offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 100),
  });
  return successResponse(res, { logs: rows, total: count });
}

async function listAgents(req, res) {
  const agents = await User.findAll({ where: { is_active: true }, include: [{ model: Role, as: 'role' }], attributes: ['id', 'name', 'email'] });
  return successResponse(res, agents);
}

module.exports = { listTickets, getTicket, updateTicket, changeStatus, changePriority, assignTicket, addComment, uploadAttachment, downloadAttachment, getDashboard, getAuditLogs, listAgents };
