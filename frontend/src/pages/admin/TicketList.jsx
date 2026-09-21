import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import './TicketList.css';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED', 'REOPENED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function TicketList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const search = searchParams.get('search') || '';

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (search) params.search = search;
      const { data } = await api.get('/admin/tickets', { params });
      setTickets(data.data.tickets);
      setTotal(data.data.total);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load tickets. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [page, status, priority, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  function setParam(key, val) {
    const p = Object.fromEntries(searchParams);
    if (val) p[key] = val; else delete p[key];
    p.page = '1';
    setSearchParams(p);
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="fd-ticketlist">
      {/* Page header */}
      <div className="fd-page-header">
        <div>
          <h1 className="fd-page-title">All Tickets</h1>
          <p className="fd-page-sub">{total} ticket{total !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="fd-tabs">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            className={`fd-tab${status === t.value ? ' active' : ''}`}
            onClick={() => setParam('status', t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="fd-filters-bar">
        <div className="fd-search-wrap">
          <span className="fd-search-icon">🔍</span>
          <input
            className="fd-search-input"
            placeholder="Search by ticket #, subject, or email..."
            value={search}
            onChange={e => setParam('search', e.target.value)}
          />
          {search && <button className="fd-search-clear" onClick={() => setParam('search', '')}>✕</button>}
        </div>
        <select className="fd-filter-select" value={priority} onChange={e => setParam('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="fd-btn fd-btn-secondary fd-btn-sm" onClick={fetchTickets}>↻ Refresh</button>
      </div>

      {/* Table */}
      <div className="fd-table-card">
        {error ? (
          <div className="fd-error-state">
            <div className="fd-error-icon">⚠️</div>
            <h3>Could not load tickets</h3>
            <p>{error}</p>
            <button className="fd-btn fd-btn-primary" onClick={fetchTickets}>Try Again</button>
          </div>
        ) : loading ? (
          <div className="fd-table-loading">
            <div className="fd-spinner" />
            <span>Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="fd-empty-state">
            <div className="fd-empty-icon-lg">🎫</div>
            <h3>No tickets found</h3>
            <p>{search || status || priority ? 'Try adjusting your filters.' : 'No tickets have been submitted yet.'}</p>
          </div>
        ) : (
          <>
            <table className="fd-table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Ticket #</th>
                  <th>Subject</th>
                  <th style={{ width: 200 }}>Requester</th>
                  <th style={{ width: 100 }}>Priority</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 110 }}>Created</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="fd-table-row" onClick={() => window.location.href = `/admin/tickets/${t.id}`}>
                    <td>
                      <span className="fd-ticket-num">{t.ticket_number}</span>
                    </td>
                    <td>
                      <span className="fd-ticket-subject">{t.subject}</span>
                    </td>
                    <td>
                      <div className="fd-requester">
                        <div className="fd-requester-avatar">{t.requester_email[0].toUpperCase()}</div>
                        <span className="fd-requester-email">{t.requester_email}</span>
                      </div>
                    </td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="fd-date">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <Link to={`/admin/tickets/${t.id}`} className="fd-btn fd-btn-secondary fd-btn-sm">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="fd-pagination">
                <span className="fd-pagination-info">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="fd-pagination-btns">
                  <button className="fd-page-btn" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>‹ Prev</button>
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} className={`fd-page-btn${page === p ? ' active' : ''}`} onClick={() => setParam('page', String(p))}>{p}</button>
                    );
                  })}
                  <button className="fd-page-btn" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>Next ›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
