const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

// Parse CC emails from ticket (stored as comma-separated string)
function getCcList(ticket) {
  if (!ticket.cc_emails) return [];
  return ticket.cc_emails.split(',').map(e => e.trim()).filter(Boolean);
}

async function sendEmail({ to, cc = [], subject, html }) {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
    };
    if (cc.length > 0) mailOptions.cc = cc.join(', ');
    await getTransporter().sendMail(mailOptions);
    logger.info(`Email sent to ${to}${cc.length ? ` CC: ${cc.join(', ')}` : ''} | ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    // Never throw — email failure must not break any operation
  }
}

// Shared branded email wrapper
function emailWrapper(title, accentColor, bodyHtml) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:${accentColor};padding:20px 28px">
      <h2 style="margin:0;color:#fff;font-size:18px">${title}</h2>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Velocis Systems Pvt Ltd — vSmart Support</p>
    </div>
    <div style="padding:24px 28px;background:#f9fafb">
      ${bodyHtml}
    </div>
    <div style="padding:14px 28px;background:#f3f4f6;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">
      This is an automated notification from vSmart Support. Please do not reply to this email.
    </div>
  </div>`;
}

function ticketInfoTable(ticket) {
  return `
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr style="background:#fff"><td style="padding:8px 12px;font-weight:600;color:#6b7280;width:140px;border:1px solid #e5e7eb">Ticket #</td><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:700;color:#2563eb">${ticket.ticket_number}</td></tr>
    <tr style="background:#f9fafb"><td style="padding:8px 12px;font-weight:600;color:#6b7280;border:1px solid #e5e7eb">Subject</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${ticket.subject}</td></tr>
    <tr style="background:#fff"><td style="padding:8px 12px;font-weight:600;color:#6b7280;border:1px solid #e5e7eb">Priority</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${ticket.priority}</td></tr>
    <tr style="background:#f9fafb"><td style="padding:8px 12px;font-weight:600;color:#6b7280;border:1px solid #e5e7eb">Status</td><td style="padding:8px 12px;border:1px solid #e5e7eb">${ticket.status.replace('_', ' ')}</td></tr>
  </table>`;
}

// ── Ticket Created ──────────────────────────────────────────────
async function sendTicketCreatedEmail(ticket) {
  const cc = getCcList(ticket);
  const html = emailWrapper('✅ Ticket Created Successfully', '#2563eb', `
    <p style="color:#374151">Your support ticket has been successfully created. We'll get back to you shortly.</p>
    ${ticketInfoTable(ticket)}
    <p style="font-size:13px;color:#6b7280;margin-top:8px">You can track your ticket status using the ticket number above.</p>
  `);
  await sendEmail({ to: ticket.requester_email, cc, subject: `Ticket Created - ${ticket.ticket_number}`, html });

  if (process.env.TICKET_ADMIN_EMAIL) {
    const adminHtml = emailWrapper('🎫 New Ticket Submitted', '#1e293b', `
      <p>A new support ticket has been submitted.</p>
      ${ticketInfoTable(ticket)}
      <p style="font-size:13px;color:#6b7280">Requester: ${ticket.requester_email}${cc.length ? `<br>CC: ${cc.join(', ')}` : ''}</p>
    `);
    await sendEmail({ to: process.env.TICKET_ADMIN_EMAIL, subject: `[New Ticket] ${ticket.ticket_number} - ${ticket.subject}`, html: adminHtml });
  }
}

// ── Status Changed ──────────────────────────────────────────────
async function sendStatusChangedEmail(ticket, oldStatus, newStatus, changedByName) {
  const cc = getCcList(ticket);
  const colorMap = { RESOLVED: '#059669', CLOSED: '#6b7280', REOPENED: '#dc2626', IN_PROGRESS: '#d97706', PENDING: '#7c3aed', OPEN: '#2563eb' };
  const color = colorMap[newStatus] || '#2563eb';
  const html = emailWrapper(`🔄 Ticket Status Updated`, color, `
    <p style="color:#374151">The status of your support ticket has been updated.</p>
    ${ticketInfoTable({ ...ticket, status: newStatus })}
    <div style="background:#fff;border-left:4px solid ${color};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
      <p style="margin:0;font-size:14px;color:#374151">
        Status changed from <strong>${(oldStatus || 'NEW').replace('_', ' ')}</strong> → <strong style="color:${color}">${newStatus.replace('_', ' ')}</strong>
        ${changedByName ? `<br><span style="color:#6b7280;font-size:13px">Updated by: ${changedByName}</span>` : ''}
      </p>
    </div>
  `);
  await sendEmail({ to: ticket.requester_email, cc, subject: `[${ticket.ticket_number}] Status Updated: ${newStatus.replace('_', ' ')}`, html });
}

// ── Priority Changed ────────────────────────────────────────────
async function sendPriorityChangedEmail(ticket, oldPriority, newPriority, changedByName) {
  const cc = getCcList(ticket);
  const html = emailWrapper('⚡ Ticket Priority Updated', '#f59e0b', `
    <p style="color:#374151">The priority of your support ticket has been updated.</p>
    ${ticketInfoTable(ticket)}
    <div style="background:#fff;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
      <p style="margin:0;font-size:14px;color:#374151">
        Priority changed from <strong>${oldPriority}</strong> → <strong style="color:#d97706">${newPriority}</strong>
        ${changedByName ? `<br><span style="color:#6b7280;font-size:13px">Updated by: ${changedByName}</span>` : ''}
      </p>
    </div>
  `);
  await sendEmail({ to: ticket.requester_email, cc, subject: `[${ticket.ticket_number}] Priority Updated: ${newPriority}`, html });
}

// ── Ticket Assigned ─────────────────────────────────────────────
async function sendTicketAssignedEmail(ticket, agentName) {
  const cc = getCcList(ticket);
  const html = emailWrapper('👤 Ticket Assigned to Agent', '#7c3aed', `
    <p style="color:#374151">Your support ticket has been assigned to an agent who will assist you.</p>
    ${ticketInfoTable(ticket)}
    <div style="background:#fff;border-left:4px solid #7c3aed;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
      <p style="margin:0;font-size:14px;color:#374151">
        Assigned to: <strong>${agentName || 'Support Team'}</strong>
      </p>
    </div>
  `);
  await sendEmail({ to: ticket.requester_email, cc, subject: `[${ticket.ticket_number}] Ticket Assigned`, html });
}

// ── New Reply / Comment ─────────────────────────────────────────
async function sendCommentNotificationEmail(ticket, comment, authorName) {
  const cc = getCcList(ticket);
  const html = emailWrapper('💬 New Reply on Your Ticket', '#2563eb', `
    <p style="color:#374151">A new reply has been added to your support ticket.</p>
    ${ticketInfoTable(ticket)}
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:600">REPLY FROM ${(authorName || 'Support Team').toUpperCase()}</p>
      <div style="font-size:14px;color:#374151;line-height:1.6">${comment.comment}</div>
    </div>
  `);
  await sendEmail({ to: ticket.requester_email, cc, subject: `Re: [${ticket.ticket_number}] ${ticket.subject}`, html });
}

module.exports = {
  sendTicketCreatedEmail,
  sendStatusChangedEmail,
  sendPriorityChangedEmail,
  sendTicketAssignedEmail,
  sendCommentNotificationEmail,
  sendEmail,
};
