import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/audit-logs', { params: { page, limit: 50 } })
      .then(r => { setLogs(r.data.data.logs); setTotal(r.data.data.total); })
      .finally(() => setLoading(false));
  }, [page]);

  const pages = Math.ceil(total / 50);

  return (
    <div>
      <div className="page-header"><h1>Audit Logs <span style={{ fontSize: 16, color: '#6b7280', fontWeight: 400 }}>({total})</span></h1></div>
      <div className="card">
        {loading ? <div className="page-loading"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Time</th><th>Ticket</th><th>Action</th><th>Actor</th><th>Old Value</th><th>New Value</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{l.createdAt ? new Date(l.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td><Link to={`/admin/tickets/${l.ticket_id}`} style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: 13 }}>#{l.ticket_id}</Link></td>
                    <td><span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{l.action}</span></td>
                    <td style={{ fontSize: 13 }}>{l.actor?.name || '—'}</td>
                    <td style={{ fontSize: 13, color: '#6b7280' }}>{l.old_value || '—'}</td>
                    <td style={{ fontSize: 13 }}>{l.new_value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: '16px 0', fontSize: 14, color: '#6b7280' }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {pages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
