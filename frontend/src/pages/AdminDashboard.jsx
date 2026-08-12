import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Download } from 'lucide-react';
import { io } from 'socket.io-client';
import { AdminLogin } from '../components/admin/AdminLogin';
import { DashboardStats } from '../components/admin/DashboardStats';
import { LivePrintQueue } from '../components/admin/LivePrintQueue';
import { AuditHistory } from '../components/admin/AuditHistory';
import { MachinesList } from '../components/admin/MachinesList';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [printerStatus, setPrinterStatus] = useState({ isError: false, message: 'Online' });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    }
  }, []);

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`);
      setIsAuthenticated(true);
      setUserRole(res.data.user.role);
      
      if (res.data.user.role === 'SUPERADMIN' || res.data.user.role === 'FRANCHISEE') {
        fetchJobs();
        fetchMachines();
      }
    } catch (err) {
      setIsAuthenticated(false);
      localStorage.removeItem('adminToken');
    }
  };

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        setIsAuthenticated(true);
        setUserRole(response.data.user.role);
        
        if (response.data.user.role === 'SUPERADMIN' || response.data.user.role === 'FRANCHISEE') {
          fetchJobs();
          fetchMachines();
        }
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

  const fetchMachines = async () => {
    try {
      const endpoint = userRole === 'SUPERADMIN' ? '/api/machines' : '/api/machines/my-machines';
      const response = await axios.get(`${API_URL}${endpoint}`);
      if (response.data.success) setMachines(response.data.machines);
    } catch (err) { console.error('Failed to fetch machines', err); }
  };

  const toggleMachineStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await axios.put(`${API_URL}/api/machines/${id}`, { status: newStatus });
      fetchMachines();
    } catch (err) { console.error('Failed to toggle machine status', err); }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchJobs();

    const token = localStorage.getItem('adminToken');
    const socket = io(API_URL, { 
      transports: ['websocket'],
      auth: { token }
    });
    
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
      fetchJobs();
    }
    catch (err) { console.error('Failed to change status', err); }
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} authError={authError} />;
  }

  const queue = jobs.filter(j => j.status === 'WAITING' || j.status === 'PRINTING');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '1rem' }}>
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
          <button className="btn" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn" style={{ background: 'var(--error-50)', color: 'var(--error-600)' }} onClick={() => { localStorage.removeItem('adminToken'); setIsAuthenticated(false); }}>
            Logout
          </button>
        </div>
      </div>

      <DashboardStats jobs={jobs} machines={machines} />

      <div className="grid-2">
        <LivePrintQueue queue={queue} onStatusChange={handleStatusChange} />
        <AuditHistory jobs={jobs} />
      </div>

      <MachinesList 
        machines={machines} 
        onToggleMachineStatus={toggleMachineStatus} 
      />
    </div>
  );
};

export default AdminDashboard;
