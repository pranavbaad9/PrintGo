import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, DollarSign, Printer, List, XCircle, CheckCircle, Droplet, File, Search, RefreshCw, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get(`https://printgo-ssoi.onrender.com/api/jobs`);
        if (response.data.success) {
          setJobs(response.data.jobs);
        }
      } catch (err) {
        console.error('Failed to fetch jobs', err);
      }
    };
    
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`https://printgo-ssoi.onrender.com/api/jobs/${id}/status`, { status });
    } catch (err) {
      console.error('Failed to change status', err);
    }
  };

  const handleReprint = async (id) => {
    if(window.confirm("Are you sure you want to reprint this job? It will be added to the queue.")) {
       handleStatusChange(id, 'Waiting');
    }
  };

  const handleConfirmPayment = async (id) => {
    try {
      await axios.post(`https://printgo-ssoi.onrender.com/api/jobs/${id}/pay`);
      // The backend emits job_status_changed on this endpoint, which will auto-update the frontend
    } catch (err) {
      console.error('Failed to confirm payment', err);
    }
  };

  const totalEarnings = jobs
    .filter(j => j.status !== 'Pending_Payment' && j.status !== 'Cancelled')
    .reduce((sum, j) => sum + j.price, 0);
    
  const jobsToday = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'Completed').length;
  const failedJobs = jobs.filter(j => j.status === 'Cancelled').length;
  
  const pendingPayments = jobs.filter(j => j.status === 'Pending_Payment');
  const queue = jobs.filter(j => j.status === 'Waiting' || j.status === 'Printing');

  const filteredJobs = jobs.filter(j => 
    j.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (j.file?.originalName && j.file.originalName.toLowerCase().includes(searchQuery.toLowerCase()))
  ).reverse(); // Newest first

  // Real data for the chart based on jobs history today
  const generateChartData = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysJobs = jobs.filter(j => j.createdAt && j.createdAt.startsWith(todayStr) && j.status !== 'Pending_Payment' && j.status !== 'Cancelled');
    
    const hourlyRevenue = {};
    const currentHour = new Date().getHours();
    
    for (let i = currentHour - 4; i <= currentHour; i++) {
      if (i >= 0) {
        hourlyRevenue[`${i.toString().padStart(2, '0')}:00`] = 0;
      }
    }

    todaysJobs.forEach(job => {
      const date = new Date(job.createdAt);
      const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;
      if (hourlyRevenue[hourStr] !== undefined) {
        hourlyRevenue[hourStr] += job.price;
      } else {
        hourlyRevenue[hourStr] = job.price; 
      }
    });

    return Object.keys(hourlyRevenue)
      .sort()
      .map(time => ({ time, revenue: hourlyRevenue[time] }));
  };

  const chartData = generateChartData();

  // Mock hardware stats calculation based on jobs today
  const paperLeft = Math.max(0, 500 - jobs.reduce((sum, j) => sum + (j.file?.pages || 0), 0));
  const inkLevel = Math.max(0, 100 - (jobs.length * 2));

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex justify-between align-center mb-6">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <button className="btn flex align-center gap-2" style={{ background: 'var(--success-color)' }} onClick={() => alert("Report downloaded!")}>
          <Download size={18} /> Download Reports
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid-2 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-panel flex align-center gap-4">
          <div className="p-4 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            <DollarSign style={{ color: 'var(--primary-color)' }} size={32} />
          </div>
          <div>
            <p className="text-muted">Today's Revenue</p>
            <p className="text-3xl font-bold">₹{totalEarnings}</p>
          </div>
        </div>
        
        <div className="glass-panel flex align-center gap-4">
          <div className="p-4 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <Activity style={{ color: 'var(--success-color)' }} size={32} />
          </div>
          <div>
            <p className="text-muted">Jobs Processed</p>
            <p className="text-3xl font-bold">{completedJobs}</p>
          </div>
        </div>
        
        <div className="glass-panel flex align-center gap-4">
          <div className="p-4 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <Droplet style={{ color: 'var(--error-color)' }} size={32} />
          </div>
          <div>
            <p className="text-muted">Ink / Toner</p>
            <p className="text-3xl font-bold">{inkLevel}%</p>
          </div>
        </div>
        
        <div className="glass-panel flex align-center gap-4">
          <div className="p-4 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <File style={{ color: '#d97706' }} size={32} />
          </div>
          <div>
            <p className="text-muted">Paper Status</p>
            <p className="text-3xl font-bold">{paperLeft} <span className="text-sm font-normal">sheets</span></p>
          </div>
        </div>
      </div>
      
      {/* Analytics Chart */}
      <div className="glass-panel mb-8" style={{ height: '350px' }}>
        <h3 className="text-xl font-bold mb-4">Revenue Trend (Today)</h3>
        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="time" stroke="var(--text-muted)" />
            <YAxis stroke="var(--text-muted)" />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-main)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
              itemStyle={{ color: 'var(--primary-color)', fontWeight: 'bold' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="var(--primary-color)" strokeWidth={3} dot={{ r: 5, fill: 'var(--primary-color)' }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pending Payments Queue */}
      {pendingPayments.length > 0 && (
        <div className="glass-panel mb-8 border border-warning-color" style={{ border: '2px solid var(--warning-color)' }}>
          <div className="flex align-center gap-2 mb-4">
            <DollarSign style={{ color: 'var(--warning-color)' }} />
            <h3 className="text-xl font-bold">Action Required: Pending Payments</h3>
          </div>
          <div className="flex flex-col gap-2">
            {pendingPayments.map(job => (
              <div key={job.id} className="p-4 rounded-lg flex justify-between align-center bg-white shadow-sm">
                <div>
                  <p className="font-bold text-lg">#{job.id} - Verify ₹{job.price}</p>
                  <p className="text-sm text-muted">{job.file?.originalName} • {job.settings?.color === 'color' ? 'Color' : 'B&W'} • {job.settings?.copies} Copies</p>
                </div>
                <div className="flex align-center gap-2">
                  <button 
                    onClick={() => handleConfirmPayment(job.id)}
                    className="btn" 
                    style={{ background: 'var(--success-color)', color: 'white', padding: '0.5rem 1rem' }}
                  >
                    Confirm Payment Received
                  </button>
                  <button 
                    onClick={() => handleStatusChange(job.id, 'Cancelled')}
                    className="btn" 
                    style={{ background: 'var(--error-color)', color: 'white', padding: '0.5rem 1rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Print Queue */}
        <div className="glass-panel">
          <div className="flex align-center gap-2 mb-4">
            <Printer style={{ color: 'var(--primary-color)' }} />
            <h3 className="text-xl font-bold">Active Live Jobs</h3>
          </div>
          
          {queue.length === 0 ? (
            <p className="text-muted p-4 text-center">Queue is currently empty.</p>
          ) : (
            <div className="flex flex-col gap-2" style={{ flexDirection: 'column' }}>
              {queue.map(job => (
                <div key={job.id} className="p-4 rounded-lg flex justify-between align-center" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <div>
                    <p className="font-bold">#{job.id} - {job.file?.originalName}</p>
                    <p className="text-sm text-muted">{job.settings?.copies} Copies • {job.settings?.color === 'color' ? 'Color' : 'B&W'}</p>
                  </div>
                  <div className="flex align-center gap-2">
                    <span className={`badge ${job.status === 'Printing' ? 'badge-printing' : 'badge-pending'}`}>
                      {job.status}
                    </span>
                    <button 
                      onClick={() => handleStatusChange(job.id, 'Cancelled')}
                      className="p-1 rounded text-muted hover:bg-gray-200" 
                      title="Cancel Job"
                      style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                    >
                      <XCircle size={20} style={{ color: 'var(--error-color)' }} />
                    </button>
                    {job.status === 'Printing' && (
                      <button 
                        onClick={() => handleStatusChange(job.id, 'Completed')}
                        className="p-1 rounded text-muted hover:bg-gray-200" 
                        title="Force Complete"
                        style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                      >
                        <CheckCircle size={20} style={{ color: 'var(--success-color)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Jobs / Payment History */}
        <div className="glass-panel">
          <div className="flex justify-between align-center mb-4">
            <div className="flex align-center gap-2">
              <List style={{ color: 'var(--primary-color)' }} />
              <h3 className="text-xl font-bold">Job History</h3>
            </div>
            <div className="flex align-center gap-2 px-3 py-1 rounded bg-white shadow-sm" style={{ border: '1px solid var(--glass-border)' }}>
              <Search size={16} className="text-muted" />
              <input 
                type="text" 
                placeholder="Search jobs..." 
                className="bg-transparent border-none outline-none text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2" style={{ flexDirection: 'column', maxHeight: '400px', overflowY: 'auto' }}>
            {filteredJobs.length === 0 ? (
              <p className="text-muted p-4 text-center">No jobs found.</p>
            ) : (
              filteredJobs.map(job => (
                <div key={job.id} className="p-4 rounded-lg flex justify-between align-center" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <div>
                    <p className="font-bold flex align-center gap-2">
                      #{job.id} <span className="text-muted text-sm font-normal">₹{job.price}</span>
                      {job.status === 'Cancelled' && <span className="text-xs px-2 rounded bg-red-100 text-red-600">Failed</span>}
                    </p>
                    <p className="text-sm text-muted truncate max-w-[200px]" title={job.file?.originalName}>{job.file?.originalName}</p>
                  </div>
                  <div className="flex align-center gap-2">
                    <span className={`badge badge-${job.status.toLowerCase().replace('_', '-')}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                    {(job.status === 'Completed' || job.status === 'Cancelled') && (
                      <button 
                        onClick={() => handleReprint(job.id)}
                        className="p-1 rounded text-muted hover:bg-gray-200 ml-2" 
                        title="Reprint Job"
                        style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                      >
                        <RefreshCw size={16} style={{ color: 'var(--primary-color)' }} />
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
