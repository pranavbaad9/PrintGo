import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, DollarSign, Printer, List, XCircle, CheckCircle, Droplet, File, Search, RefreshCw, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = 'https://printgo-ssoi.onrender.com';

const AdminDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/jobs`);
        if (response.data.success) setJobs(response.data.jobs);
      } catch (err) { console.error('Failed to fetch jobs', err); }
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, status) => {
    try { await axios.put(`${API_URL}/api/jobs/${id}/status`, { status }); }
    catch (err) { console.error('Failed to change status', err); }
  };

  const handleReprint = (id) => {
    if (window.confirm('Reprint this job?')) handleStatusChange(id, 'Waiting');
  };

  const handleConfirmPayment = async (id) => {
    try { await axios.post(`${API_URL}/api/jobs/${id}/pay`); }
    catch (err) { console.error('Failed to confirm payment', err); }
  };

  const totalEarnings = jobs
    .filter(j => j.status !== 'Pending_Payment' && j.status !== 'Cancelled')
    .reduce((sum, j) => sum + j.price, 0);

  const completedJobs = jobs.filter(j => j.status === 'Completed').length;
  const pendingPayments = jobs.filter(j => j.status === 'Pending_Payment');
  const queue = jobs.filter(j => j.status === 'Waiting' || j.status === 'Printing');

  const filteredJobs = jobs.filter(j =>
    j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.file?.originalName && j.file.originalName.toLowerCase().includes(searchQuery.toLowerCase()))
  ).reverse();

  const generateChartData = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysJobs = jobs.filter(j => j.createdAt?.startsWith(todayStr) && j.status !== 'Pending_Payment' && j.status !== 'Cancelled');
    const hourlyRevenue = {};
    const currentHour = new Date().getHours();
    for (let i = Math.max(0, currentHour - 4); i <= currentHour; i++) {
      hourlyRevenue[`${i.toString().padStart(2, '0')}:00`] = 0;
    }
    todaysJobs.forEach(job => {
      const hourStr = `${new Date(job.createdAt).getHours().toString().padStart(2, '0')}:00`;
      hourlyRevenue[hourStr] = (hourlyRevenue[hourStr] || 0) + job.price;
    });
    return Object.keys(hourlyRevenue).sort().map(time => ({ time, revenue: hourlyRevenue[time] }));
  };

  const chartData = generateChartData();
  const paperLeft = Math.max(0, 500 - jobs.reduce((sum, j) => sum + (j.file?.pages || 0), 0));
  const inkLevel = Math.max(0, 100 - (jobs.length * 2));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="flex justify-between align-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <button className="btn" style={{ background: 'var(--success-50)', color: 'var(--success-600)', border: '1px solid rgba(16,185,129,0.2)' }} onClick={() => alert('Report downloaded!')}>
          <Download size={16} /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-50)' }}>
            <DollarSign size={22} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Revenue</p>
            <p className="text-2xl font-bold">₹{totalEarnings}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-50)' }}>
            <Activity size={22} style={{ color: 'var(--success-500)' }} />
          </div>
          <div>
            <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Completed</p>
            <p className="text-2xl font-bold">{completedJobs}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--error-50)' }}>
            <Droplet size={22} style={{ color: 'var(--error-500)' }} />
          </div>
          <div>
            <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Ink/Toner</p>
            <p className="text-2xl font-bold">{inkLevel}%</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-50)' }}>
            <File size={22} style={{ color: 'var(--warning-600)' }} />
          </div>
          <div>
            <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Paper</p>
            <p className="text-2xl font-bold">{paperLeft}<span className="text-xs font-medium text-muted"> sheets</span></p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-panel mb-6" style={{ height: 300 }}>
        <h3 className="font-bold mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="time" stroke="var(--gray-400)" fontSize={12} />
            <YAxis stroke="var(--gray-400)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', fontSize: '0.875rem' }}
              itemStyle={{ color: 'var(--primary-color)', fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="revenue" stroke="var(--primary-color)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary-color)', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="glass-panel mb-6 animate-fade-in" style={{ border: '1.5px solid rgba(245, 158, 11, 0.3)' }}>
          <div className="flex align-center gap-2 mb-4">
            <div className="stat-icon" style={{ background: 'var(--warning-50)', width: 32, height: 32 }}>
              <DollarSign size={16} style={{ color: 'var(--warning-600)' }} />
            </div>
            <h3 className="font-bold">Pending Payments ({pendingPayments.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pendingPayments.map(job => (
              <div key={job.id} className="job-row" style={{ background: 'white' }}>
                <div>
                  <p className="font-bold">#{job.id} — ₹{job.price}</p>
                  <p className="text-xs text-muted">{job.file?.originalName} · {job.settings?.copies} copies</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleConfirmPayment(job.id)} className="btn" style={{ background: 'var(--success-500)', color: 'white', border: 'none', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                    Confirm
                  </button>
                  <button onClick={() => handleStatusChange(job.id, 'Cancelled')} className="btn" style={{ background: 'var(--error-50)', color: 'var(--error-600)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Active Queue */}
        <div className="glass-panel">
          <div className="flex align-center gap-2 mb-4">
            <div className="stat-icon" style={{ background: 'var(--primary-50)', width: 32, height: 32 }}>
              <Printer size={16} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h3 className="font-bold">Active Queue</h3>
          </div>

          {queue.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem', color: 'var(--gray-400)' }}>
              <Printer size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
              <p className="text-sm">No active jobs</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {queue.map(job => (
                <div key={job.id} className="job-row">
                  <div>
                    <p className="font-semibold text-sm">#{job.id} — {job.file?.originalName}</p>
                    <p className="text-xs text-muted">{job.settings?.copies} copies · {job.settings?.color === 'color' ? 'Color' : 'B&W'}</p>
                  </div>
                  <div className="flex align-center gap-2">
                    <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
                    <button onClick={() => handleStatusChange(job.id, 'Cancelled')} title="Cancel" style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                      <XCircle size={18} style={{ color: 'var(--error-500)' }} />
                    </button>
                    {job.status === 'Printing' && (
                      <button onClick={() => handleStatusChange(job.id, 'Completed')} title="Complete" style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                        <CheckCircle size={18} style={{ color: 'var(--success-500)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job History */}
        <div className="glass-panel">
          <div className="flex justify-between align-center mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="flex align-center gap-2">
              <div className="stat-icon" style={{ background: 'var(--gray-100)', width: 32, height: 32 }}>
                <List size={16} style={{ color: 'var(--gray-600)' }} />
              </div>
              <h3 className="font-bold">History</h3>
            </div>
            <div className="flex align-center gap-2" style={{ background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '0.375rem 0.75rem' }}>
              <Search size={14} style={{ color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem', width: 100, color: 'var(--text-main)', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 360, overflowY: 'auto' }}>
            {filteredJobs.length === 0 ? (
              <p className="text-muted text-sm text-center" style={{ padding: '2rem' }}>No jobs found</p>
            ) : (
              filteredJobs.map(job => (
                <div key={job.id} className="job-row">
                  <div>
                    <p className="font-semibold text-sm flex align-center gap-2">
                      #{job.id} <span className="text-xs text-muted font-medium">₹{job.price}</span>
                    </p>
                    <p className="text-xs text-muted truncate" style={{ maxWidth: 180 }} title={job.file?.originalName}>{job.file?.originalName}</p>
                  </div>
                  <div className="flex align-center gap-2">
                    <span className={`badge badge-${job.status.toLowerCase().replace('_', '-')}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                    {(job.status === 'Completed' || job.status === 'Cancelled') && (
                      <button onClick={() => handleReprint(job.id)} title="Reprint" style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                        <RefreshCw size={14} style={{ color: 'var(--primary-color)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
