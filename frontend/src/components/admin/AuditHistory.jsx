import React, { useState } from 'react';
import { List, Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const AuditHistory = ({ jobs }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = jobs.filter(j =>
    (j.shortId || j.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.originalName && j.originalName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card glass>
      <div className="flex justify-between align-center mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="flex align-center gap-2">
          <div className="stat-icon" style={{ background: 'var(--gray-100)', width: 32, height: 32 }}>
            <List size={16} style={{ color: 'var(--gray-600)' }} />
          </div>
          <h3 className="font-bold">Audit History</h3>
        </div>
        <div className="flex align-center gap-2 file-upload-zone" style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--gray-200)' }}>
          <Search size={14} style={{ color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Search ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem', width: 120, color: 'var(--text-main)' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 400, overflowY: 'auto' }}>
        {filteredJobs.length === 0 ? (
          <p className="text-muted text-sm text-center" style={{ padding: '2rem' }}>No records found</p>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="job-row">
              <div>
                <p className="font-semibold text-sm flex align-center gap-2">
                  #{job.shortId || job.id} <span className="text-xs text-muted font-medium">₹{job.cost || 0}</span>
                </p>
                <p className="text-xs text-muted truncate" style={{ maxWidth: 180 }} title={job.originalName}>{job.originalName}</p>
              </div>
              <div className="flex align-center gap-2">
                <Badge status={job.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
