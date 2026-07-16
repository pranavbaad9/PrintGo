import React from 'react';
import { Shield, Eye, UserCheck, Server } from 'lucide-react';

const sections = [
  {
    icon: UserCheck,
    color: 'var(--primary-color)',
    bg: 'var(--primary-50)',
    title: '1. Use of Service',
    text: 'The PrintGo kiosk is provided for lawful personal and business printing needs. You agree not to print any illegal, explicit, or copyrighted materials for which you do not have permission.'
  },
  {
    icon: Eye,
    color: 'var(--success-500)',
    bg: 'var(--success-50)',
    title: '2. Document Privacy',
    text: 'We take your privacy seriously. Documents uploaded to our servers are encrypted and automatically deleted immediately after printing is completed or cancelled. We do not store or read the contents of your files.'
  },
  {
    icon: Shield,
    color: 'var(--warning-600)',
    bg: 'var(--warning-50)',
    title: '3. User Responsibility',
    text: 'It is your responsibility to ensure you have selected the correct document and print settings (color, duplex, copies) before completing the payment.'
  },
  {
    icon: Server,
    color: 'var(--error-500)',
    bg: 'var(--error-50)',
    title: '4. Service Availability',
    text: 'While we strive for 100% uptime, PrintGo is not liable for temporary kiosk downtime due to internet outages, paper jams, or hardware maintenance.'
  }
];

const Terms = () => {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
      <div className="glass-panel animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Terms & Conditions</h1>
        <p className="text-muted mb-6" style={{ lineHeight: 1.7 }}>
          By using our automated printing kiosks and services, you agree to comply with the following terms.
        </p>

        <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map((s) => (
            <div key={s.title} style={{ padding: '1.25rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${s.color}` }}>
              <div className="flex align-center gap-2 mb-2">
                <div className="stat-icon" style={{ background: s.bg, width: 32, height: 32 }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <h3 className="font-bold text-sm">{s.title}</h3>
              </div>
              <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Terms;
