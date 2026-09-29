const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { ImapFlow } = require('imapflow');
const sequelize = require('../config/database');
const { Ticket, TicketComment, TicketAttachment, TicketStatusHistory, TicketAuditLog } = require('../models');
const { sanitizeHtml } = require('../utils/sanitize');
const { sendEmail, sendTicketCreatedEmail } = require('./emailService');
const { generatePublicToken } = require('../utils/helpers');
const { generateTicketNumber } = require('./ticketNumberService');
const { uploadDir } = require('../middleware/upload');
const logger = require('../utils/logger');

// Extract ref — Priority: 1) In-Reply-To/References header  2) Hidden div in body
function extractRef(raw = '') {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, ' ');
  const headerSection = normalized.slice(0, normalized.indexOf('\n\n'));
  const msgIdMatch = headerSection.match(/(?:in-reply-to|references):[^\n]*<ticket-([a-f0-9]{16})[^>]*>/i);
  if (msgIdMatch) return msgIdMatch[1];
  const bodyRef = raw.match(/ref:([a-f0-9]{16})/i);
  if (bodyRef) return bodyRef[1];
  return null;
}

function decodeQuotedPrintable(str = '') {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Split a MIME block into its parts using the boundary declared in its Content-Type header
function splitMimeParts(block) {
  // Find the header section — handle blocks that start with \n (after boundary delimiter)
  const headerStart = block.search(/[^\r\n]/);
  const trimmed = headerStart > 0 ? block.slice(headerStart) : block;
  const headerEndIdx = trimmed.indexOf('\n\n');
  // Unfold header lines (CRLF/LF + whitespace = continuation) before matching boundary
  const headerSection = headerEndIdx !== -1 ? trimmed.slice(0, headerEndIdx) : trimmed;
  const unfolded = headerSection.replace(/\n[ \t]+/g, ' ');
  const boundaryMatch = unfolded.match(/boundary="([^"]+)"|boundary=([^\s;\r\n]+)/i);
  if (!boundaryMatch) return null;
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return block.split(new RegExp(`--${escaped}(?:--)?`)).slice(1);
}

function decodeBase64Part(str = '') {
  return Buffer.from(str.replace(/\s/g, ''), 'base64');
}

// Recursively find body parts AND attachment parts from any MIME structure
function findBodyParts(block) {
  const headerEnd = block.indexOf('\n\n');
  if (headerEnd === -1) return { html: null, plain: null, attachments: [] };
  const body = block.slice(headerEnd + 2);

  // Recurse into multipart/* FIRST — before checking disposition
  if (/content-type:\s*multipart\//i.test(block)) {
    const parts = splitMimeParts(block);
    if (parts) {
      let html = null, plain = null, attachments = [];
      for (const part of parts) {
        const r = findBodyParts(part);
        if (!html && r.html) html = r.html;
        if (!plain && r.plain) plain = r.plain;
        attachments = attachments.concat(r.attachments);
      }
      return { html, plain, attachments };
    }
  }

  // Attachment part — unfold headers first so filename on continuation line is found
  const unfoldedBlock = block.slice(0, headerEnd).replace(/\n[ \t]+/g, ' ') + block.slice(headerEnd);
  const dispositionMatch = unfoldedBlock.match(/content-disposition:\s*(attachment|inline)[^\n]*/i);
  // Support both filename="x" and RFC 2231 filename*=charset''encoded-name
  const filenameMatch =
    unfoldedBlock.match(/(?:content-disposition|content-type)[^\n]*(?:filename\*=[^']*''([^\s;\r\n]+))/i) ||
    unfoldedBlock.match(/(?:content-disposition|content-type)[^\n]*(?:filename|name)="?([^"\s;\r\n]+)"?/i);
  if (dispositionMatch && filenameMatch) {
    let filename = filenameMatch[1];
    try { filename = decodeURIComponent(filename); } catch {}
    const mimeMatch = unfoldedBlock.match(/content-type:\s*([^;\s\r\n]+)/i);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const isBase64 = /base64/i.test(unfoldedBlock.slice(0, headerEnd));
    const isQP = /quoted-printable/i.test(unfoldedBlock.slice(0, headerEnd));
    let data;
    if (isBase64) data = decodeBase64Part(body);
    else if (isQP) data = Buffer.from(decodeQuotedPrintable(body), 'binary');
    else data = Buffer.from(body, 'binary');
    return { html: null, plain: null, attachments: [{ filename, mime, data }] };
  }

  if (/content-type:\s*text\/html/i.test(block)) {
    let html = /quoted-printable/i.test(block) ? decodeQuotedPrintable(body) : body;
    return { html, plain: null, attachments: [] };
  }

  if (/content-type:\s*text\/plain/i.test(block)) {
    let plain = /quoted-printable/i.test(block) ? decodeQuotedPrintable(body) : body;
    return { html: null, plain, attachments: [] };
  }

  return { html: null, plain: null, attachments: [] };
}

const QUOTE_PATTERNS = [
  /<blockquote/i,
  /<div[^>]+class="[^"]*zmail_extra[^"]*"/i,
  /<div[^>]+id="divRplyFwdMsg"/i,
  /<div[^>]+id="appendonsend"/i,
  /<div[^>]+class="[^"]*yahoo_quoted[^"]*"/i,
  /<div[^>]+class="[^"]*gmail_quote[^"]*"/i,
];

function extractNewContent(raw = '') {
  const normalized = raw.replace(/\r\n/g, '\n');
  const { html, plain } = findBodyParts(normalized); // attachments handled separately in processEmail

  if (html) {
    let cutAt = html.length;
    for (const p of QUOTE_PATTERNS) {
      const m = html.search(p);
      if (m !== -1 && m < cutAt) cutAt = m;
    }
    const result = html.slice(0, cutAt)
      .replace(/<div[^>]*display[^>]*none[^>]*>[\s\S]*?<\/div>/gi, '')
      .trim();
    if (result) return result;
  }

  if (plain) {
    const text = cutAtQuote(plain);
    if (text) return `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
  }

  // Fallback: treat whole body as plain text
  const headerEnd = normalized.indexOf('\n\n');
  if (headerEnd === -1) return normalized.trim();
  const headers = normalized.slice(0, headerEnd);
  let body = normalized.slice(headerEnd + 2);
  if (/quoted-printable/i.test(headers)) body = decodeQuotedPrintable(body);
  const text = cutAtQuote(body);
  return `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
}

function cutAtQuote(text = '') {
  const patterns = [
    /^On .+wrote:\s*$/m,
    /^>.*$/m,
    /^From:\s*.+\nSent:\s*/m,
    /^-{3,}\s*Original Message\s*-{3,}/im,
  ];
  let cutAt = text.length;
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m.index < cutAt) cutAt = m.index;
  }
  return text.slice(0, cutAt).replace(/\n{3,}/g, '\n\n').trim();
}

async function processEmail(client, uid) {
  const msg = await client.fetchOne(uid, { source: true, envelope: true });
  if (!msg) return false;

  const subject = msg.envelope?.subject || '';
  const fromObj = msg.envelope?.from?.[0];
  const fromEmail = fromObj?.address || '';

  if (fromEmail.toLowerCase() === (process.env.IMAP_USER || '').toLowerCase()) {
    logger.info(`IMAP: Skipping own outgoing email — "${subject}"`);
    return false;
  }

  const raw = msg.source.toString('utf8');
  const ref = extractRef(raw);
  const normalized = raw.replace(/\r\n/g, '\n');
  const { html, plain, attachments: emailAttachments } = findBodyParts(normalized);

  // Extract body content (cut quoted parts)
  let htmlContent = null;
  if (html) {
    let cutAt = html.length;
    for (const p of QUOTE_PATTERNS) {
      const m = html.search(p);
      if (m !== -1 && m < cutAt) cutAt = m;
    }
    htmlContent = html.slice(0, cutAt)
      .replace(/<div[^>]*display[^>]*none[^>]*>[\s\S]*?<\/div>/gi, '')
      .trim() || null;
  }
  if (!htmlContent && plain) {
    const text = cutAtQuote(plain);
    if (text) htmlContent = `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
  }

  // Allow attachment-only emails — use placeholder so comment is always saved
  if (!htmlContent) {
    if (emailAttachments.length > 0) {
      htmlContent = '<p><em>(Attachment only — no message body)</em></p>';
    } else {
      logger.info(`IMAP: Empty body after extraction, skipping uid=${uid}`);
      return false;
    }
  }

  const clean = sanitizeHtml(htmlContent);
  const senderDisplay = fromObj?.name ? `${fromObj.name} <${fromEmail}>` : fromEmail;
  const toList = (msg.envelope?.to || []).map(a => a.address).filter(Boolean).join(', ');
  const ccList = (msg.envelope?.cc || []).map(a => a.address).filter(Boolean).join(', ');
  const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip,rar').split(',');

  if (!ref) {
    // No ticket ref — create a new ticket from this email
    await sequelize.transaction(async (t) => {
      const ticket_number = await generateTicketNumber(t);
      const public_token = generatePublicToken();
      const ccEmails = (msg.envelope?.cc || []).map(a => a.address).filter(Boolean);

      const ticket = await Ticket.create({
        ticket_number,
        subject: subject || '(No Subject)',
        requester_email: fromEmail,
        priority: 'LOW',
        description: clean,
        source: 'EMAIL',
        public_token,
        cc_emails: ccEmails.join(',') || null,
      }, { transaction: t });

      await TicketStatusHistory.create({ ticket_id: ticket.id, old_status: null, new_status: 'OPEN' }, { transaction: t });
      await TicketAuditLog.create({ ticket_id: ticket.id, action: 'TICKET_CREATED', new_value: ticket_number, metadata: { source: 'EMAIL', from: fromEmail } }, { transaction: t });

      // Run post-commit work after transaction closes
      t.afterCommit(async () => {
        for (const att of emailAttachments) {
          try {
            const ext = path.extname(att.filename).toLowerCase().slice(1);
            if (!ALLOWED_TYPES.includes(ext)) { logger.warn(`IMAP: Skipping disallowed attachment .${ext} — ${att.filename}`); continue; }
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const storedName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
            const filePath = path.join(uploadDir, storedName);
            fs.writeFileSync(filePath, att.data);
            await TicketAttachment.create({ ticket_id: ticket.id, comment_id: null, original_file_name: att.filename, stored_file_name: storedName, file_path: filePath, mime_type: att.mime, file_size: att.data.length, uploaded_by: null });
            logger.info(`IMAP: Saved attachment ${att.filename} for new ticket ${ticket_number}`);
          } catch (attErr) {
            logger.error(`IMAP: Failed to save attachment ${att.filename}: ${attErr.message}`);
          }
        }
        sendTicketCreatedEmail(ticket).catch(err => logger.error(`IMAP ticket created email error: ${err.message}`));
        logger.info(`IMAP: New ticket ${ticket_number} created from email by ${fromEmail}`);
      });
    });
    return;
  }

  const ticket = await Ticket.findOne({ where: { public_token: { [Op.like]: `${ref}%` } } });
  if (!ticket) {
    logger.warn(`IMAP: No ticket found for ref=${ref}`);
    return false;
  }

  if (ticket.status === 'CLOSED') {
    logger.info(`IMAP: Ticket ${ticket.ticket_number} is CLOSED, skipping`);
    return false;
  }

  const toCcDisplay = [toList && `To: ${toList}`, ccList && `CC: ${ccList}`].filter(Boolean).join(' | ');

  const comment = await TicketComment.create({
    ticket_id: ticket.id,
    user_id: null,
    comment: clean,
    type: 'USER_REPLY',
    reply_to: senderDisplay,
    reply_cc: toCcDisplay || null,
  });

  // Save attachments — each in its own try/catch so one bad file never rolls back the comment
  for (const att of emailAttachments) {
    try {
      const ext = path.extname(att.filename).toLowerCase().slice(1);
      if (!ALLOWED_TYPES.includes(ext)) { logger.warn(`IMAP: Skipping disallowed attachment .${ext} — ${att.filename}`); continue; }
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const storedName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
      const filePath = path.join(uploadDir, storedName);
      fs.writeFileSync(filePath, att.data);
      await TicketAttachment.create({ ticket_id: ticket.id, comment_id: comment.id, original_file_name: att.filename, stored_file_name: storedName, file_path: filePath, mime_type: att.mime, file_size: att.data.length, uploaded_by: null });
      logger.info(`IMAP: Saved attachment ${att.filename} for ticket ${ticket.ticket_number}`);
    } catch (attErr) {
      logger.error(`IMAP: Failed to save attachment ${att.filename}: ${attErr.message}`);
    }
  }

  await TicketAuditLog.create({
    ticket_id: ticket.id,
    action: 'USER_REPLY_ADDED',
    metadata: { source: 'EMAIL', from: fromEmail, attachments: emailAttachments.length },
  });

  if (process.env.TICKET_ADMIN_EMAIL) {
    sendEmail({
      to: process.env.TICKET_ADMIN_EMAIL,
      subject: `[User Reply via Email] #${ticket.ticket_number} - ${ticket.subject}`,
      html: `<p>User <strong>${senderDisplay}</strong> replied via email to ticket <strong>#${ticket.ticket_number}</strong>.</p>
             <p><strong>Subject:</strong> ${ticket.subject}</p>
             <div style="background:#f9fafb;padding:12px;border-left:4px solid #2563eb">${clean}</div>`,
    }).catch(err => logger.error(`IMAP notify email error: ${err.message}`));
  }

  logger.info(`IMAP: User reply added to ticket ${ticket.ticket_number} from ${fromEmail}`);
}

let imapClient = null;

async function getClient() {
  if (imapClient && imapClient.usable) return imapClient;
  imapClient = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT) || 993,
    secure: process.env.IMAP_TLS !== 'false',
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASSWORD },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
  });
  await imapClient.connect();
  logger.info('IMAP: Connected');
  return imapClient;
}

async function pollInbox() {
  try {
    const client = await getClient();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ seen: false });
      if (uids.length === 0) { logger.info('IMAP: No new emails'); return; }
      logger.info(`IMAP: Processing ${uids.length} new email(s)`);
      for (const uid of uids) {
        try {
          await processEmail(client, uid);
          await client.messageFlagsAdd(uid, ['\\Seen']);
        } catch (err) {
          logger.error(`IMAP: Failed to process uid=${uid}: ${err.message}`);
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    logger.error(`IMAP poll error: ${err.message} — will retry next interval`);
    // Reset client so next poll reconnects fresh
    if (imapClient) { imapClient.logout().catch(() => {}); imapClient = null; }
  }
}

function startImapPoller() {
  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    logger.info('IMAP: credentials not configured, poller disabled');
    return;
  }
  logger.info('IMAP: Poller started — checking every 60s');
  pollInbox();
  setInterval(pollInbox, 60_000);
}

module.exports = { startImapPoller };
