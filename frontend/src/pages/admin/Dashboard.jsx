import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import './Dashboard.css';

const STATUS_COLORS = { OPEN: '#3b82f6', ACKNOWLEDGED: '#10b981', CLOSED: '#6b7280' };
const PRIORITY_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', URGENT: '#ef4444' };

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div className="fd-stat-card">
      <div className="fd-stat-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div className="fd-stat-body">
        <div className="fd-stat-value">{value}</div>
        <div className="fd-stat-label">{label}</div>
        {sub && <div className="fd-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="fd-loading">
      <div className="fd-spinner" />
      <span>Loading dashboard...</span>
    </div>
  );

  if (!data) return (
    <div className="fd-empty">
      <div className="fd-empty-icon">⚠️</div>
      <h3>Failed to load dashboard</h3>
      <p>Make sure the backend is running on port 3001</p>
      <button className="fd-btn fd-btn-primary" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const { stats, statusCounts, priorityCounts, recentTickets } = data;

  return (
    <div className="fd-dashboard">
      {/* Header */}
      <div className="fd-page-header">
        <div>
          <h1 className="fd-page-title">Overview</h1>
          <p className="fd-page-sub">Welcome back! Here's what's happening with your support tickets.</p>
        </div>
        <Link to="/admin/tickets" className="fd-btn fd-btn-primary">
          <span>🎫</span> View All Tickets
        </Link>
      </div>

      {/* Stat cards */}
      <div className="fd-stat-grid">
        <StatCard label="Total Tickets" value={stats.total} color="#2563eb" icon="🎫" />
        <StatCard label="Open" value={stats.OPEN || 0} color="#3b82f6" icon="📬" sub="Awaiting reply" />
        <StatCard label="Acknowledged" value={stats.ACKNOWLEDGED || 0} color="#10b981" icon="✅" sub="Admin replied" />
        <StatCard label="Closed" value={stats.CLOSED || 0} color="#6b7280" icon="🔒" sub="Resolved" />
        <StatCard label="Urgent" value={stats.URGENT || 0} color="#ef4444" icon="🚨" sub="High priority" />
        <StatCard label="High Priority" value={stats.HIGH || 0} color="#f97316" icon="⬆️" />
      </div>

      {/* Charts */}
      <div className="fd-chart-grid">
        <div className="fd-card">
          <div className="fd-card-header">
            <h3>Tickets by Status</h3>
          </div>
          <div className="fd-card-body">
            {statusCounts.length === 0 ? (
              <div className="fd-chart-empty">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusCounts.map(r => ({ name: r.status.replace('_', ' '), value: parseInt(r.count) }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusCounts.map((r, i) => <Cell key={i} fill={STATUS_COLORS[r.status] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="fd-card">
          <div className="fd-card-header">
            <h3>Tickets by Priority</h3>
          </div>
          <div className="fd-card-body">
            {priorityCounts.length === 0 ? (
              <div className="fd-chart-empty">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityCounts.map(r => ({ name: r.priority, count: parseInt(r.count) }))} barSize={40}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityCounts.map((r, i) => <Cell key={i} fill={PRIORITY_COLORS[r.priority] || '#94a3b8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="fd-card fd-card-full">
          <div className="fd-card-header">
            <h3>Tickets Created — Last 7 Days</h3>
          </div>
          <div className="fd-card-body">
            {recentTickets.length === 0 ? (
              <div className="fd-chart-empty">No tickets in the last 7 days</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={recentTickets.map(r => ({ date: r.date, count: parseInt(r.count) }))} barSize={32}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
