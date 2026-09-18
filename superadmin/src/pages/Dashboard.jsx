import React, { useState, useEffect } from 'react';
import { Building2, MonitorSmartphone, Users, IndianRupee } from 'lucide-react';
import { api } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalMachines: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, jobsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/jobs')
        ]);
        setStats(statsRes.data.data);
        setJobs(jobsRes.data.jobs || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch data - Please login as Super Admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Super Admin Dashboard</h1>
      <p className="subtitle">Overview of the entire PrintGo SaaS Platform</p>
      
      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            Total Revenue
            <div className="icon-wrapper"><IndianRupee size={20} /></div>
          </div>
          <div className="stat-value">₹{stats.totalRevenue.toLocaleString()}</div>
        </div>
        
        <div className="glass-panel stat-card">
          <div className="stat-header">
            Active Companies (Franchisees)
            <div className="icon-wrapper"><Building2 size={20} /></div>
          </div>
          <div className="stat-value">{stats.totalCompanies}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            Total Kiosks Deployed
            <div className="icon-wrapper"><MonitorSmartphone size={20} /></div>
          </div>
          <div className="stat-value">{stats.totalMachines}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            Total Registered Users
            <div className="icon-wrapper"><Users size={20} /></div>
          </div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
      </div>

      <div className="glass-panel">
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Recent Print Jobs & Refunds</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 10).map((job) => (
                <tr key={job.id}>
                  <td>{job.shortId}</td>
                  <td>
                    <span className={`badge ${job.status === 'FAILED' ? 'danger' : job.status === 'COMPLETED' ? 'success' : ''}`} 
                          style={job.status === 'REFUNDED' ? { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' } : {}}>
                      {job.status}
                    </span>
                  </td>
                  <td>₹{job.cost.toFixed(2)}</td>
                  <td>
                    {job.status === 'FAILED' && (
                      <button 
                        onClick={async () => {
                          if(window.confirm(`Process instant Cashfree refund for ₹${job.cost}?`)) {
                            try {
                              await api.post(`/payments/refund/${job.shortId}`);
                              alert('Refund successful!');
                              setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'REFUNDED' } : j));
                            } catch(e) {
                              alert('Error: ' + (e.response?.data?.message || e.message));
                            }
                          }
                        }}
                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Refund Customer
                      </button>
                    )}
                    {job.status !== 'FAILED' && '-'}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No recent jobs</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
