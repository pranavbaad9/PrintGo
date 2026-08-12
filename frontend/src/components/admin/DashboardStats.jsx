import React from 'react';
import { DollarSign, Activity, Droplet, File } from 'lucide-react';
import { Card } from '../ui/Card';

export const DashboardStats = ({ jobs, machines }) => {
  const totalEarnings = jobs
    .filter(j => j.status !== 'PENDING_PAYMENT' && j.status !== 'CANCELLED')
    .reduce((sum, j) => sum + (j.cost || 0), 0);

  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
  
  // Use real data from first machine if available, else fallback to mock calculation
  let paperLeft = Math.max(0, 500 - jobs.reduce((sum, j) => sum + (j.pagesToPrint * j.copies || 0), 0));
  let inkLevel = Math.max(0, 100 - (jobs.length * 2));

  if (machines && machines.length > 0) {
    const latestStatus = machines[0]?.printerStatuses?.[0];
    if (latestStatus) {
       paperLeft = latestStatus.paperStatus === 'OK' ? 500 : (latestStatus.paperStatus === 'LOW' ? 50 : 0);
       const tonerStatus = latestStatus.tonerStatus === 'OK' ? 100 : (latestStatus.tonerStatus === 'LOW' ? 10 : 0);
       inkLevel = tonerStatus;
    }
  }

  return (
    <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <Card>
        <div className="stat-icon" style={{ background: 'var(--primary-50)' }}>
          <DollarSign size={22} style={{ color: 'var(--primary-color)' }} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Revenue</p>
          <p className="text-2xl font-bold">₹{totalEarnings}</p>
        </div>
      </Card>
      <Card>
        <div className="stat-icon" style={{ background: 'var(--success-50)' }}>
          <Activity size={22} style={{ color: 'var(--success-500)' }} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Completed</p>
          <p className="text-2xl font-bold">{completedJobs}</p>
        </div>
      </Card>
      <Card>
        <div className="stat-icon" style={{ background: 'var(--error-50)' }}>
          <Droplet size={22} style={{ color: 'var(--error-500)' }} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Ink/Toner</p>
          <p className="text-2xl font-bold">{inkLevel}%</p>
        </div>
      </Card>
      <Card>
        <div className="stat-icon" style={{ background: 'var(--warning-50)' }}>
          <File size={22} style={{ color: 'var(--warning-600)' }} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Paper</p>
          <p className="text-2xl font-bold">{paperLeft}<span className="text-xs font-medium text-muted"> sheets</span></p>
        </div>
      </Card>
    </div>
  );
};
