import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import RichTextEditor from '../../components/RichTextEditor';
import EmailTagInput from '../../components/EmailTagInput';
import './TicketDetail.css';

const STATUSES = ['OPEN', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(d);
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [commentType, setCommentType] = useState('PUBLIC_REPLY');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('conversation');
  const [sidebarStatus, setSidebarStatus] = useState('');
  const [sidebarUpdating, setSidebarUpdating] = useState(false);

  // Editable reply recipients
  const [replyEmails, setReplyEmails] = useState([]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const tRes = await api.get(`/admin/tickets/${id}`);
      const t = tRes.data.data;
      setTicket(t);
      setSidebarStatus(t.status);
      // Pre-populate reply recipients from ticket
      const cc = t.cc_emails ? t.cc_emails.split(',').map(e => e.trim()).filter(Boolean) : [];
      setReplyEmails([t.requester_email, ...cc]);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load ticket');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function applySidebarUpdates() {
    setSidebarUpdating(true);
    try {
      if (sidebarStatus === ticket.status) { toast('No changes to save'); setSidebarUpdating(false); return; }
      await api.patch(`/admin/tickets/${id}/status`, { status: sidebarStatus });
      toast.success('Ticket updated');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
    finally { setSidebarUpdating(false); }
  }

  async function changeStatus(status) {
    try { await api.patch(`/admin/tickets/${id}/status`, { status }); toast.success(`Status → ${status.replace(/_/g, ' ')}`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  }

  async function changePriority(priority) {
    try { await api.patch(`/admin/tickets/${id}/priority`, { priority }); toast.success(`Priority → ${priority}`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  }

  async function assignAgent(assigned_to) {
    try { await api.patch(`/admin/tickets/${id}/assignment`, { assigned_to: assigned_to || null }); toast.success(assigned_to ? 'Ticket assigned' : 'Unassigned'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  }

  async function submitComment(e, closeAfter = false) {
    e.preventDefault();
    if (!comment || comment === '<p></p>' || comment.trim() === '') { toast.error('Reply cannot be empty'); return; }
    if (commentType === 'PUBLIC_REPLY' && replyEmails.length === 0) { toast.error('At least one recipient email is required'); return; }
    setSubmitting(true);
    try {
      await api.post(`/admin/tickets/${id}/comments`, {
        comment,
        type: commentType,
        reply_to: replyEmails[0] || ticket.requester_email,
        reply_cc: replyEmails.slice(1).join(','),
        close_after: closeAfter,
      });
      toast.success(closeAfter ? 'Reply sent & ticket closed' : commentType === 'INTERNAL_NOTE' ? 'Note added' : 'Reply sent');
      setComment('');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  }

  const [attachPreview, setAttachPreview] = useState(null); // { url, name, type }

  async function downloadAttachment(attId, name) {
    try {
      const res = await api.get(`/admin/tickets/${id}/attachments/${attId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  }

  async function previewAttachment(attId, name) {
    const ext = name.split('.').pop().toLowerCase();
    const isImage = ['jpg','jpeg','png','gif'].includes(ext);
    const isPdf = ext === 'pdf';
    if (!isImage && !isPdf) { downloadAttachment(attId, name); return; }
    try {
      const res = await api.get(`/admin/tickets/${id}/attachments/${attId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setAttachPreview({ url, name, type: isImage ? 'image' : 'pdf' });
    } catch { toast.error('Preview failed'); }
  }

  function closeAttachPreview() {
    if (attachPreview?.url) URL.revokeObjectURL(attachPreview.url);
    setAttachPreview(null);
  }

  // Attachment preview modal
  const AttachModal = attachPreview && (
    <div className="fd-att-overlay" onClick={closeAttachPreview}>
      <div className="fd-att-modal" onClick={e => e.stopPropagation()}>
        <div className="fd-att-modal-header">
          <span>{attachPreview.name}</span>
          <button className="fd-att-modal-close" onClick={closeAttachPreview}>✕</button>
        </div>
        <div className="fd-att-modal-body">
          {attachPreview.type === 'image' && <img src={attachPreview.url} alt={attachPreview.name} className="fd-att-preview-img" />}
          {attachPreview.type === 'pdf' && <iframe src={attachPreview.url} title={attachPreview.name} className="fd-att-preview-pdf" />}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="fd-detail-loading"><div className="fd-spinner" /><span>Loading ticket...</span></div>;
  if (error) return <div className="fd-detail-error"><div>⚠️</div><h3>{error}</h3><button className="fd-btn fd-btn-secondary" onClick={() => navigate('/admin/tickets')}>← Back</button></div>;
  if (!ticket) return null;

  const ccEmails = ticket.cc_emails ? ticket.cc_emails.split(',').map(e => e.trim()).filter(Boolean) : [];

  return (
    <>
    <div className="fd-detail">
      <div className="fd-detail-topbar">
        <button className="fd-back-btn" onClick={() => navigate('/admin/tickets')}>← All Tickets</button>
      </div>

      <div className="fd-detail-layout">
        <div className="fd-detail-main">
          {/* Header */}
          <div className="fd-detail-header">
            <div className="fd-detail-header-top">
              <span className="fd-ticket-num-lg">{ticket.ticket_number}</span>
              <div className="fd-detail-badges"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
            </div>
            <h1 className="fd-detail-subject">{ticket.subject}</h1>
            <div className="fd-detail-meta">
              <span>📧 <strong>To:</strong> {ticket.requester_email}</span>
              {ccEmails.length > 0 && <span>📋 <strong>CC:</strong> {ccEmails.join(', ')}</span>}
              <span>🕐 {timeAgo(ticket.createdAt)}</span>
              <span>📅 {formatDate(ticket.createdAt)}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="fd-detail-tabs">
            {['conversation', 'history', 'attachments'].map(tab => (
              <button key={tab} className={`fd-detail-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'conversation' && `💬 Conversation (${ticket.comments?.length || 0})`}
                {tab === 'history' && `📜 Status History (${ticket.statusHistory?.length || 0})`}
                {tab === 'attachments' && `📎 Attachments (${ticket.attachments?.length || 0})`}
              </button>
            ))}
          </div>

          {activeTab === 'conversation' && (
            <div className="fd-conversation">
              {/* Original message */}
              <div className="fd-message fd-message-original">
                <div className="fd-message-avatar fd-avatar-requester">{ticket.requester_email[0].toUpperCase()}</div>
                <div className="fd-message-body">
                  <div className="fd-message-header">
                    <strong>{ticket.requester_email}</strong>
                    <span className="fd-tag fd-tag-reply">Requester</span>
                    <span className="fd-message-time">{timeAgo(ticket.createdAt)}</span>
                  </div>
                  <div className="fd-message-content" dangerouslySetInnerHTML={{ __html: ticket.description }} />
                  {ticket.attachments?.length > 0 && (
                    <div className="fd-msg-attachments">
                      {ticket.attachments.map(a => (
                        <button key={a.id} type="button" className="fd-att-chip" onClick={() => previewAttachment(a.id, a.original_file_name)} title="Click to preview / download">
                          📎 {a.original_file_name} <span className="fd-att-chip-size">({(a.file_size/1024).toFixed(1)} KB)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              {ticket.comments?.map(c => (
                <div key={c.id} className={`fd-message ${c.type === 'INTERNAL_NOTE' ? 'fd-message-note' : 'fd-message-reply'}`}>
                  <div className={`fd-message-avatar ${c.type === 'INTERNAL_NOTE' ? 'fd-avatar-note' : 'fd-avatar-agent'}`}>
                    {(c.author?.name || 'S')[0].toUpperCase()}
                  </div>
                  <div className="fd-message-body">
                    <div className="fd-message-header">
                      <strong>{c.author?.name || 'Support'}</strong>
                      {c.type === 'INTERNAL_NOTE' ? <span className="fd-tag fd-tag-note">🔒 Internal Note</span> : <span className="fd-tag fd-tag-reply">↩ Reply</span>}
                      <span className="fd-message-time">{timeAgo(c.createdAt)}</span>
                    </div>
                    {c.type === 'PUBLIC_REPLY' && c.reply_to && (
                      <div className="fd-reply-to-bar">
                        <span className="fd-reply-to-bar-to"><strong>To:</strong> {c.reply_to}</span>
                        {c.reply_cc && <span className="fd-reply-to-bar-cc"><strong>CC:</strong> {c.reply_cc}</span>}
                      </div>
                    )}
                    <div className="fd-message-content" dangerouslySetInnerHTML={{ __html: c.comment }} />
                  </div>
                </div>
              ))}

              {/* Reply box */}
              <div className="fd-reply-box">
                <div className="fd-reply-tabs">
                  <button className={`fd-reply-tab${commentType === 'PUBLIC_REPLY' ? ' active' : ''}`} onClick={() => setCommentType('PUBLIC_REPLY')}>↩ Reply</button>
                  <button className={`fd-reply-tab fd-reply-tab-note${commentType === 'INTERNAL_NOTE' ? ' active' : ''}`} onClick={() => setCommentType('INTERNAL_NOTE')}>🔒 Add Note</button>
                </div>

                {/* Editable recipients — only for public reply */}
                {commentType === 'PUBLIC_REPLY' && (
                  <div className="fd-reply-recipients">
                    <div className="fd-reply-recipients-label">Recipients</div>
                    <EmailTagInput
                      emails={replyEmails}
                      onChange={setReplyEmails}
                      hasError={false}
                    />
                    <p className="fd-reply-recipients-hint">First email = TO (requester). Additional emails = CC. Edit before sending.</p>
                  </div>
                )}

                <div className={`fd-reply-editor${commentType === 'INTERNAL_NOTE' ? ' note-mode' : ''}`}>
                  <RichTextEditor value={comment} onChange={setComment} />
                </div>
                <div className="fd-reply-actions">
                  <button className="fd-btn fd-btn-primary" onClick={e => submitComment(e, false)} disabled={submitting}>
                    {submitting ? 'Sending...' : commentType === 'INTERNAL_NOTE' ? '🔒 Add Note' : '↩ Send Reply'}
                  </button>
                  {commentType === 'PUBLIC_REPLY' && ticket.status !== 'CLOSED' && (
                    <button className="fd-btn fd-btn-close-send" onClick={e => submitComment(e, true)} disabled={submitting}>
                      ↩ Send & Close
                    </button>
                  )}
                  {commentType === 'PUBLIC_REPLY' && replyEmails.length > 0 && (
                    <span className="fd-reply-to-preview">
                      → {replyEmails[0]}{replyEmails.length > 1 ? ` +${replyEmails.length - 1} CC` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="fd-history-tab">
              {ticket.statusHistory?.length === 0 ? <div className="fd-tab-empty">No status changes recorded</div> : (
                <div className="fd-timeline">
                  {ticket.statusHistory?.map(h => (
                    <div key={h.id} className="fd-timeline-item">
                      <div className="fd-timeline-dot" />
                      <div className="fd-timeline-content">
                        <div className="fd-timeline-text">
                          {h.old_status
                            ? <><span className="fd-status-from">{h.old_status.replace(/_/g, ' ')}</span> → <span className="fd-status-to">{h.new_status.replace(/_/g, ' ')}</span></>
                            : <span className="fd-status-to">Ticket Created — {h.new_status}</span>
                          }
                          {h.changedBy && <span className="fd-timeline-by"> by <strong>{h.changedBy.name}</strong></span>}
                        </div>
                        <div className="fd-timeline-time">{formatDate(h.createdAt)}</div>
                        {h.reason && <div className="fd-timeline-reason">"{h.reason}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="fd-attachments-tab">
              {ticket.attachments?.length === 0 ? <div className="fd-tab-empty">No attachments</div> : (
                <div className="fd-attachments-grid">
                  {ticket.attachments?.map(a => (
                    <div key={a.id} className="fd-attachment-item">
                      <div className="fd-attachment-icon">📄</div>
                      <div className="fd-attachment-info">
                        <div className="fd-attachment-name">{a.original_file_name}</div>
                        <div className="fd-attachment-size">{(a.file_size / 1024).toFixed(1)} KB · {formatDate(a.createdAt)}</div>
                      </div>
                      <button className="fd-btn fd-btn-secondary fd-btn-sm" onClick={() => previewAttachment(a.id, a.original_file_name)}>👁 Preview</button>
                      <button className="fd-btn fd-btn-secondary fd-btn-sm" onClick={() => downloadAttachment(a.id, a.original_file_name)}>↓ Download</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="fd-detail-sidebar">
          <div className="fd-props-card">
            <div className="fd-props-header">Ticket Properties</div>
            <div className="fd-prop-group">
              <label className="fd-prop-label">Status</label>
              <select className="fd-prop-select" value={sidebarStatus} onChange={e => setSidebarStatus(e.target.value)}>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="fd-prop-group">
              <label className="fd-prop-label">Priority</label>
              <div className="fd-prop-select fd-prop-select-disabled"><PriorityBadge priority={ticket.priority} /></div>
            </div>
            <div className="fd-prop-group">
              <button className="fd-btn fd-btn-primary" style={{ width: '100%' }} onClick={applySidebarUpdates} disabled={sidebarUpdating}>
                {sidebarUpdating ? 'Updating...' : '✓ Update'}
              </button>
            </div>
            <div className="fd-prop-divider" />
            <div className="fd-prop-group">
              <label className="fd-prop-label">Requester</label>
              <div className="fd-requester-block">
                <div className="fd-req-avatar">{ticket.requester_email[0].toUpperCase()}</div>
                <div className="fd-req-email">{ticket.requester_email}</div>
              </div>
            </div>
            {ccEmails.length > 0 && (
              <div className="fd-prop-group">
                <label className="fd-prop-label">CC</label>
                <div className="fd-prop-value" style={{ fontSize: 12 }}>{ccEmails.join(', ')}</div>
              </div>
            )}
            <div className="fd-prop-group">
              <label className="fd-prop-label">Source</label>
              <div className="fd-prop-value">{ticket.source?.replace(/_/g, ' ')}</div>
            </div>
            <div className="fd-prop-group">
              <label className="fd-prop-label">Created</label>
              <div className="fd-prop-value">{formatDate(ticket.createdAt)}</div>
            </div>
            <div className="fd-prop-group">
              <label className="fd-prop-label">Last Updated</label>
              <div className="fd-prop-value">{formatDate(ticket.updatedAt)}</div>
            </div>
            {ticket.resolvedAt && (
              <div className="fd-prop-group">
                <label className="fd-prop-label">Resolved At</label>
                <div className="fd-prop-value">{formatDate(ticket.resolvedAt)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {AttachModal}
    </>
  );
}
