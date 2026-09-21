import React from 'react';

const labels = { OPEN: 'Open', ACKNOWLEDGED: 'Acknowledged', CLOSED: 'Closed' };

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status?.toLowerCase()}`}>{labels[status] || status}</span>;
}
