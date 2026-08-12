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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real scenario, you'd need to log in first and get the token.
    // For now, we simulate fetching stats.
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Note: This endpoint is protected by SUPERADMIN role. 
        // We will mock the data if the server returns 401/403 for demonstration.
        const response = await api.get('/admin/stats');
        setStats(response.data.data);
        setError(null);
      } catch (err) {
        console.warn('Authentication required or server offline. Using mock data for preview.');
        // Fallback mock data so the UI looks complete even before auth is fully wired up on the client side
        setStats({
          totalCompanies: 14,
          totalMachines: 87,
          totalUsers: 142,
          totalRevenue: 125400,
        });
        setError('Using mock data - Please login as Super Admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Recent Platform Activity</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Action</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>City University Library</td>
                <td>New Kiosk Provisioned</td>
                <td>2 mins ago</td>
                <td><span className="badge success">Completed</span></td>
              </tr>
              <tr>
                <td>TechHub Co-working</td>
                <td>Subscription Renewed (Pro)</td>
                <td>1 hour ago</td>
                <td><span className="badge success">Success</span></td>
              </tr>
              <tr>
                <td>Metro Station Cyber</td>
                <td>Kiosk Offline Alert</td>
                <td>3 hours ago</td>
                <td><span className="badge danger">Warning</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
