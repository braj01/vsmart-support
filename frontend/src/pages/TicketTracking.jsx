import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import logo from '../assets/images/logo.png';
import './TicketTracking.css';

export default function TicketTracking() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadTicket() {
    return api.get(`/tickets/${token}`)
      .then(r => setTicket(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Ticket not found'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTicket(); }, [token]);

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tickets/${token}/reply`, { comment: reply });
      toast.success('Reply submitted successfully');
      setReply('');
      loadTicket(); // refresh thread
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (error) return (
    <div className="tt-page">
      <div className="tt-error">
        <h2>Ticket Not Found</h2>
        <p>{error}</p>
        <Link to="/submit-ticket" className="btn btn-primary">Submit a New Ticket</Link>
      </div>
    </div>
  );

  return (
    <div className="tt-page">
      <header className="st-header">
        <div className="st-header-inner">
          <div className="st-brand"><img src={logo} alt="vSmart" className="st-logo" /></div>
          <span className="st-header-title">Ticket Status</span>
        </div>
      </header>

      <div className="tt-body">
        <div className="card">
          {/* Ticket Meta */}
          <div className="tt-meta">
            <div className="tt-meta-row"><span>Ticket #</span><strong>{ticket.ticket_number}</strong></div>
            <div className="tt-meta-row"><span>Subject</span><strong>{ticket.subject}</strong></div>
            <div className="tt-meta-row"><span>Status</span><StatusBadge status={ticket.status} /></div>
            <div className="tt-meta-row"><span>Priority</span><PriorityBadge priority={ticket.priority} /></div>
            <div className="tt-meta-row"><span>Submitted</span><span>{new Date(ticket.createdAt).toLocaleString()}</span></div>
          </div>

          {/* Original Description */}
          <div className="tt-thread">
            <div className="tt-bubble tt-bubble-user">
              <div className="tt-bubble-header">
                <strong>{ticket.requester_email}</strong>
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              {ticket.requester_email && (
                <div className="fd-reply-to-bar">
                  <span className="fd-reply-to-bar-to"><strong>To:</strong> {ticket.requester_email}</span>
                  {ticket.cc_emails && <span className="fd-reply-to-bar-cc"><strong>CC:</strong> {ticket.cc_emails}</span>}
                </div>
              )}
              <div className="tt-bubble-body" dangerouslySetInnerHTML={{ __html: ticket.description }} />
            </div>

            {/* Conversation Thread */}
            {ticket.comments?.map(c => (
              <div key={c.id} className={`tt-bubble ${c.type === 'USER_REPLY' ? 'tt-bubble-user' : 'tt-bubble-admin'}`}>
                <div className="tt-bubble-header">
                  <strong>
                    {c.type === 'USER_REPLY'
                      ? (c.reply_to || ticket.requester_email)
                      : (c.author?.name || 'Support Team')}
                  </strong>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                {c.type === 'USER_REPLY' && c.reply_cc && (
                  <div className="fd-reply-to-bar">
                    <span>{c.reply_cc}</span>
                  </div>
                )}
                <div className="tt-bubble-body" dangerouslySetInnerHTML={{ __html: c.comment }} />
                {c.commentAttachments?.length > 0 && (
                  <div className="fd-msg-attachments">
                    {c.commentAttachments.map(a => (
                      <span key={a.id} className="fd-att-chip">
                        📎 {a.original_file_name} <span className="fd-att-chip-size">({(a.file_size/1024).toFixed(1)} KB)</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reply Box — hidden if closed */}
          {ticket.status !== 'CLOSED' ? (
            <div className="tt-reply-box">
              <h4>Add a Reply</h4>
              <form onSubmit={handleReply}>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Type your reply here..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                />
                <div className="tt-reply-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting || !reply.trim()}>
                    {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending...</> : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="tt-closed-notice">
              This ticket is closed. <Link to="/submit-ticket">Submit a new ticket</Link> if you need further assistance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
