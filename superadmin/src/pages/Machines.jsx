import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Key } from 'lucide-react';

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await api.get('/admin/machines');
        setMachines(res.data.data.machines);
      } catch (error) {
        console.error('Failed to fetch machines', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMachines();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge success">ACTIVE</span>;
      case 'INACTIVE': return <span className="badge danger" style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>INACTIVE</span>;
      case 'MAINTENANCE': return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>MAINTENANCE</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const getHealthBadge = (health) => {
    if (health === 'ONLINE' || health === 'OK') return <span className="badge success">Healthy</span>;
    if (health === 'PAPER_OUT') return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Paper Out</span>;
    if (health === 'ERROR' || health === 'OFFLINE') return <span className="badge danger">{health}</span>;
    return <span className="badge">{health}</span>;
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Machines</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Global overview of all deployed kiosks.</p>
        </div>
        <button style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
          + Provision Machine
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <p>Loading machines...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Machine Name</th>
                <th>Company</th>
                <th>Location</th>
                <th>Secret Key</th>
                <th>Account Status</th>
                <th>Hardware Health</th>
              </tr>
            </thead>
            <tbody>
              {machines.map(machine => (
                <tr key={machine.id}>
                  <td style={{ fontWeight: '500' }}>{machine.name}</td>
                  <td>{machine.company?.name || 'Unassigned'}</td>
                  <td>{machine.location || 'Unknown'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                      <Key size={14} />
                      {machine.machineKey.substring(0, 8)}...
                    </div>
                  </td>
                  <td>{getStatusBadge(machine.status)}</td>
                  <td>{getHealthBadge(machine.healthStatus)}</td>
                </tr>
              ))}
              {machines.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No machines provisioned.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
