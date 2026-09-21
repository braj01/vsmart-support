import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import './TicketTracking.css';

export default function TicketTracking() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/tickets/${token}`)
      .then(r => setTicket(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Ticket not found'))
      .finally(() => setLoading(false));
  }, [token]);

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
          <div className="st-brand">
            <span className="st-brand-v">v</span>
            <span className="st-brand-smart">SMART</span>
            <span className="st-brand-name">Velocis Systems Pvt Ltd</span>
          </div>
        </div>
      </header>
      <div className="st-title-bar"><h1>Ticket Status</h1></div>
      <div className="tt-body">
        <div className="card">
          <div className="tt-meta">
            <div className="tt-meta-row"><span>Ticket Number</span><strong>{ticket.ticket_number}</strong></div>
            <div className="tt-meta-row"><span>Subject</span><strong>{ticket.subject}</strong></div>
            <div className="tt-meta-row"><span>Status</span><StatusBadge status={ticket.status} /></div>
            <div className="tt-meta-row"><span>Priority</span><PriorityBadge priority={ticket.priority} /></div>
            <div className="tt-meta-row"><span>Submitted</span><span>{new Date(ticket.created_at).toLocaleString()}</span></div>
          </div>
          <div className="tt-description">
            <h3>Description</h3>
            <div dangerouslySetInnerHTML={{ __html: ticket.description }} />
          </div>
          {ticket.comments?.length > 0 && (
            <div className="tt-comments">
              <h3>Replies</h3>
              {ticket.comments.map(c => (
                <div key={c.id} className="tt-comment">
                  <div className="tt-comment-header">
                    <strong>{c.author?.name || 'Support Team'}</strong>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: c.comment }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
