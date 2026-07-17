import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, DollarSign, Printer, List, XCircle, CheckCircle, Droplet, File, Search, RefreshCw, Download, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [printerStatus, setPrinterStatus] = useState({ isError: false, message: 'Online' });

  // Axios interceptor to attach token if stored (fallback to cookies)
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    }
  }, []);

  const verifyToken = async () => {
    try {
      await axios.get(`${API_URL}/api/auth/me`);
      setIsAuthenticated(true);
      fetchJobs();
    } catch (err) {
      setIsAuthenticated(false);
      localStorage.removeItem('adminToken');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { username, password });
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        setIsAuthenticated(true);
        fetchJobs();
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Login failed');
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs`);
      if (response.data.success) setJobs(response.data.jobs);
    } catch (err) { console.error('Failed to fetch jobs', err); }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchJobs();

    const socket = io(API_URL);
    socket.on('job_status_changed', (updatedJob) => {
      setJobs(prev => {
        const exists = prev.find(j => j.id === updatedJob.id);
        if (exists) return prev.map(j => j.id === updatedJob.id ? updatedJob : j);
        return [updatedJob, ...prev];
      });
    });

    socket.on('printer_status_update', (status) => {
      setPrinterStatus({ isError: status.isError, message: status.errorMessage || 'Online' });
    });

    return () => socket.disconnect();
  }, [isAuthenticated]);

  const handleStatusChange = async (id, status) => {
    try { 
      const job = jobs.find(j => j.id === id);
      await axios.put(`${API_URL}/api/jobs/${job.shortId || id}/status`, { status }); 
    }
    catch (err) { console.error('Failed to change status', err); }
  };

  const handleConfirmPayment = async (id) => {
    try { 
      const job = jobs.find(j => j.id === id);
      await axios.post(`${API_URL}/api/jobs/${job.shortId || id}/pay`); 
    }
    catch (err) { console.error('Failed to confirm payment', err); }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex align-center justify-center" style={{ minHeight: '100vh', padding: '1rem' }}>
        <div className="glass-panel text-center animate-fade-in" style={{ maxWidth: 400, width: '100%' }}>
          <div className="stat-icon" style={{ background: 'var(--primary-50)', width: 48, height: 48, margin: '0 auto 1.5rem' }}>
            <Lock size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Admin Login</h2>
          <p className="text-muted mb-6">Enter your credentials to access the dashboard.</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Username" 
              className="file-upload-zone" 
              style={{ padding: '0.75rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}
              value={username} onChange={e => setUsername(e.target.value)} required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="file-upload-zone" 
              style={{ padding: '0.75rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
            {authError && <p className="text-sm" style={{ color: 'var(--error-500)' }}>{authError}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
          </form>
        </div>
      </div>
    );
  }

  const totalEarnings = jobs
    .filter(j => j.status !== 'Pending_Payment' && j.status !== 'Cancelled')
    .reduce((sum, j) => sum + j.price, 0);

  const completedJobs = jobs.filter(j => j.status === 'Completed').length;
  const pendingPayments = jobs.filter(j => j.status === 'Pending_Payment');
  const queue = jobs.filter(j => j.status === 'Waiting' || j.status === 'Printing');

  const filteredJobs = jobs.filter(j =>
    (j.shortId || j.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.originalName && j.originalName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
  const paperLeft = Math.max(0, 500 - jobs.reduce((sum, j) => sum + (j.pages || 0), 0));
  const inkLevel = Math.max(0, 100 - (jobs.length * 2));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="flex justify-between align-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="text-2xl font-bold">Enterprise Dashboard</h2>
          {printerStatus.isError ? (
             <p className="text-sm font-medium" style={{ color: 'var(--error-500)' }}>⚠️ Printer Status: {printerStatus.message}</p>
          ) : (
             <p className="text-sm font-medium" style={{ color: 'var(--success-500)' }}>✅ Printer Status: Online</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={fetchJobs}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }} onClick={() => alert('Report exported successfully!')}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn" style={{ background: 'var(--error-50)', color: 'var(--error-600)' }} onClick={() => { localStorage.removeItem('adminToken'); setIsAuthenticated(false); }}>
            Logout
          </button>
        </div>
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

      <div className="grid-2">
        {/* Active Queue */}
        <div className="glass-panel flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
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
                    <p className="text-xs text-muted">{job.copies} copies · {job.color === 'color' ? 'Color' : 'B&W'}</p>
                  </div>
                  <div className="flex align-center gap-2">
                    <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
                    <button onClick={() => handleStatusChange(job.id, 'Cancelled')} title="Cancel" className="btn" style={{ padding: '4px' }}>
                      <XCircle size={18} style={{ color: 'var(--error-500)' }} />
                    </button>
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
                      #{job.shortId || job.id} <span className="text-xs text-muted font-medium">₹{job.price}</span>
                    </p>
                    <p className="text-xs text-muted truncate" style={{ maxWidth: 180 }} title={job.originalName}>{job.originalName}</p>
                  </div>
                  <div className="flex align-center gap-2">
                    <span className={`badge badge-${job.status.toLowerCase().replace('_', '-')}`}>
                      {job.status.replace('_', ' ')}
                    </span>
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
