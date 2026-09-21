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

async function submitTicket(req, res) {
  const { subject, requester_email, priority = 'LOW', description, captcha_token, cc_emails } = req.body;
  const files = req.files || [];

  const captchaOk = await verifyCaptcha(captcha_token);
  if (!captchaOk) return errorResponse(res, 'CAPTCHA verification failed', 422, { captcha_token: ['Please complete the CAPTCHA'] });

  const t = await sequelize.transaction();
  try {
    const ticket_number = await generateTicketNumber();
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
    // Clean up uploaded files on failure
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    logger.error(`Ticket creation failed: ${err.message}`);
    return errorResponse(res, err.message);
  }
}

async function getTicketByToken(req, res) {
  try {
    const ticket = await Ticket.findOne({
      where: { public_token: req.params.token },
      include: [
        { model: TicketAttachment, as: 'attachments', attributes: ['id', 'original_file_name', 'file_size', 'mime_type', 'created_at'] },
        { model: require('../models').TicketComment, as: 'comments', where: { type: 'PUBLIC_REPLY' }, required: false, include: [{ model: User, as: 'author', attributes: ['name'] }] },
      ],
    });
    if (!ticket) return errorResponse(res, 'Ticket not found', 404);
    return successResponse(res, ticket);
  } catch (err) {
    return errorResponse(res, err.message);
  }
}

module.exports = { submitTicket, getTicketByToken };
