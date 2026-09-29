const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');
const { Ticket, TicketAttachment, TicketStatusHistory, TicketAuditLog, User } = require('../models');
const { generateTicketNumber } = require('../services/ticketNumberService');
const { sendTicketCreatedEmail } = require('../services/emailService');
const { verifyCaptcha } = require('../services/captchaService');
const { sanitizeHtml } = require('../utils/sanitize');
const { generatePublicToken, successResponse, errorResponse } = require('../utils/helpers');
const { uploadDir } = require('../middleware/upload');
const logger = require('../utils/logger');

// Layer 3 — per-email rate limit: max 3 tickets per email per hour (in-memory)
const emailSubmitMap = new Map();
const EMAIL_LIMIT = 20;
const EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isEmailRateLimited(email) {
  const now = Date.now();
  const record = emailSubmitMap.get(email) || { count: 0, windowStart: now };
  if (now - record.windowStart > EMAIL_WINDOW_MS) {
    // Reset window
    emailSubmitMap.set(email, { count: 1, windowStart: now });
    return false;
  }
  if (record.count >= EMAIL_LIMIT) return true;
  record.count++;
  emailSubmitMap.set(email, record);
  return false;
}

async function submitTicket(req, res) {
  const { subject, requester_email, priority = 'LOW', description, captcha_token, cc_emails } = req.body;
  const files = req.files || [];

  const captchaOk = await verifyCaptcha(captcha_token);
  if (!captchaOk) return errorResponse(res, 'CAPTCHA verification failed', 422, { captcha_token: ['Please complete the CAPTCHA'] });

  // Layer 3 — per-email rate limit
  if (isEmailRateLimited(requester_email.toLowerCase())) {
    logger.warn(`Email rate limit hit: ${requester_email}`);
    return errorResponse(res, 'Too many tickets submitted from this email. Please try again later.', 429);
  }

  const t = await sequelize.transaction();
  try {
    const ticket_number = await generateTicketNumber(t);
    const public_token = generatePublicToken();
    const cleanDescription = sanitizeHtml(description);

    const ticket = await Ticket.create({
      ticket_number, subject, requester_email,
      priority: priority.toUpperCase(),
      description: cleanDescription,
      source: 'PUBLIC_FORM',
      public_token,
      cc_emails: cc_emails || null,
    }, { transaction: t });

    if (files.length > 0) {
      await TicketAttachment.bulkCreate(files.map(f => ({
        ticket_id: ticket.id,
        original_file_name: f.originalname,
        stored_file_name: f.filename,
        file_path: f.path,
        mime_type: f.mimetype,
        file_size: f.size,
      })), { transaction: t });
    }

    await TicketStatusHistory.create({ ticket_id: ticket.id, old_status: null, new_status: 'OPEN' }, { transaction: t });
    await TicketAuditLog.create({ ticket_id: ticket.id, action: 'TICKET_CREATED', new_value: ticket_number, metadata: { source: 'PUBLIC_FORM', requester_email } }, { transaction: t });

    await t.commit();

    // Send emails asynchronously — do not await
    sendTicketCreatedEmail(ticket).catch(err => logger.error(`Email error: ${err.message}`));

    logger.info(`Ticket created: ${ticket_number} by ${requester_email}`);
    return successResponse(res, { ticketNumber: ticket_number, publicToken: public_token }, 'Ticket created successfully', 201);
  } catch (err) {
    await t.rollback();
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    logger.error(`Ticket creation failed: ${err.message}`);
    return errorResponse(res, 'Failed to create ticket', 500);
  }
}

async function getTicketByToken(req, res) {
  try {
    const ticket = await Ticket.findOne({
      where: { public_token: req.params.token },
      include: [
        { model: TicketAttachment, as: 'attachments', where: { comment_id: null }, required: false, attributes: ['id', 'original_file_name', 'file_size', 'mime_type', 'created_at'] },
        { model: require('../models').TicketComment, as: 'comments', where: { type: ['PUBLIC_REPLY', 'USER_REPLY'] }, required: false, attributes: ['id', 'comment', 'type', 'reply_to', 'reply_cc', 'createdAt'], include: [
          { model: User, as: 'author', attributes: ['name'] },
          { model: require('../models').TicketAttachment, as: 'commentAttachments', attributes: ['id', 'original_file_name', 'file_size', 'mime_type'] },
        ], order: [['created_at', 'ASC']] },
      ],
    });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    return successResponse(res, ticket);
  } catch (err) {
    logger.error(`getTicketByToken failed: ${err.message}`);
    return errorResponse(res, 'Failed to retrieve ticket', 500);
  }
}

async function userReply(req, res) {
  const { comment } = req.body;
  if (!comment?.trim()) return errorResponse(res, 'Reply cannot be empty', 400);
  try {
    const ticket = await Ticket.findOne({ where: { public_token: req.params.token } });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    if (ticket.status === 'CLOSED') return errorResponse(res, 'Cannot reply to a closed ticket', 400);

    const clean = sanitizeHtml(comment);
    const newComment = await require('../models').TicketComment.create({
      ticket_id: ticket.id,
      user_id: null,
      comment: clean,
      type: 'USER_REPLY',
      reply_to: ticket.requester_email,  // always set so frontend always has a display name
      reply_cc: null,
    });

    await TicketAuditLog.create({ ticket_id: ticket.id, action: 'USER_REPLY_ADDED' });

    // Notify admin
    const { sendEmail } = require('../services/emailService');
    if (process.env.TICKET_ADMIN_EMAIL) {
      sendEmail({
        to: process.env.TICKET_ADMIN_EMAIL,
        subject: `[User Reply] Ticket #${ticket.ticket_number} - ${ticket.subject}`,
        html: `<p>The user has replied to ticket <strong>#${ticket.ticket_number}</strong>.</p>
               <p><strong>Subject:</strong> ${ticket.subject}</p>
               <p><strong>Reply:</strong></p>
               <div style="background:#f9fafb;padding:12px;border-left:4px solid #2563eb">${clean}</div>`,
      }).catch(err => logger.error(`User reply email error: ${err.message}`));
    }

    return successResponse(res, newComment, 'Reply submitted', 201);
  } catch (err) {
    logger.error(`userReply failed: ${err.message}`);
    return errorResponse(res, 'Failed to submit reply', 500);
  }
}

module.exports = { submitTicket, getTicketByToken, userReply };
