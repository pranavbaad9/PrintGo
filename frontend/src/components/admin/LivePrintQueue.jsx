import React from 'react';
import { Printer, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const LivePrintQueue = ({ queue, onStatusChange }) => (
  <Card glass className="flex-col">
    <div className="flex align-center gap-2 mb-4">
      <div className="stat-icon" style={{ background: 'var(--primary-50)', width: 32, height: 32 }}>
        <Printer size={16} style={{ color: 'var(--primary-color)' }} />
      </div>
      <h3 className="font-bold">Live Print Queue</h3>
    </div>

    {queue.length === 0 ? (
      <div className="text-center" style={{ padding: '2rem', color: 'var(--gray-400)', margin: 'auto' }}>
        <Printer size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
        <p className="text-sm">No active jobs</p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {queue.map(job => (
          <div key={job.id} className="job-row">
            <div>
              <p className="font-semibold text-sm">#{job.shortId || job.id} — {job.originalName}</p>
              <p className="text-xs text-muted">{job.copies || 1} copies · {job.color === 'color' ? 'Color' : 'B&W'}</p>
            </div>
            <div className="flex align-center gap-2">
              <Badge status={job.status} />
              <button onClick={() => onStatusChange(job.id, 'CANCELLED')} title="Cancel" className="btn" style={{ padding: '4px' }}>
                <XCircle size={18} style={{ color: 'var(--error-500)' }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);
