import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Server, Cpu, HardDrive } from 'lucide-react';

export const TelemetryDashboard = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="glass-panel" style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Live Kiosk Telemetry</h2>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Waiting for telemetry data from printer agent...
        </div>
      </div>
    );
  }

  const latest = history[history.length - 1];

  const formatUptime = (secondsStr) => {
    const totalSeconds = parseInt(secondsStr, 10);
    if (isNaN(totalSeconds)) return 'N/A';
    const days = Math.floor(totalSeconds / (3600*24));
    const hours = Math.floor(totalSeconds % (3600*24) / 3600);
    const mins = Math.floor(totalSeconds % 3600 / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={20} color="var(--primary)" /> 
        Live Kiosk Telemetry 
        <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          {latest.printerName}
        </span>
      </h2>
      
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="stat-header">
            Uptime
            <div className="icon-wrapper"><Server size={18} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {formatUptime(latest.telemetry?.uptime)}
          </div>
        </div>

        <div className="stat-card" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="stat-header">
            Memory Usage
            <div className="icon-wrapper"><HardDrive size={18} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {latest.telemetry?.memoryUsage || 'N/A'}
          </div>
        </div>

        <div className="stat-card" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="stat-header">
            Hardware / OS
            <div className="icon-wrapper"><Cpu size={18} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {latest.telemetry?.platform} / {latest.telemetry?.arch}
          </div>
        </div>
      </div>

      <div style={{ height: '250px', width: '100%', marginTop: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="var(--text-secondary)" 
              fontSize={12} 
              tickMargin={10} 
            />
            <YAxis 
              stroke="var(--text-secondary)" 
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip 
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: 'var(--primary)' }}
            />
            <Line 
              type="monotone" 
              dataKey="memVal" 
              stroke="var(--primary)" 
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--primary)' }}
              activeDot={{ r: 6 }}
              name="Memory Usage %"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
