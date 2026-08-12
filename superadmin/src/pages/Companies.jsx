import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Users, MonitorSmartphone } from 'lucide-react';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/admin/companies');
        setCompanies(res.data.data.companies);
      } catch (error) {
        console.error('Failed to fetch companies', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Companies</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Manage all franchisee businesses.</p>
        </div>
        <button style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
          + Add Company
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <p>Loading companies...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact</th>
                <th>Staff / Users</th>
                <th>Kiosks</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id}>
                  <td style={{ fontWeight: '500' }}>{company.name}</td>
                  <td>
                    <div>{company.contactEmail}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{company.contactPhone || 'N/A'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color="var(--text-secondary)" />
                      {company._count.users}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MonitorSmartphone size={16} color="var(--text-secondary)" />
                      {company._count.machines}
                    </div>
                  </td>
                  <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No companies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
