import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

const ContactUs = () => {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
      <div className="glass-panel animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
        <p className="text-muted mb-6" style={{ lineHeight: 1.7 }}>
          We're here to help! If you have any issues with your print job or payment, reach out using the details below.
        </p>

        <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex align-center gap-3" style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <div className="stat-icon" style={{ background: 'var(--primary-50)', width: 40, height: 40 }}>
              <Mail size={18} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="font-semibold text-sm">support@printgo.in</p>
            </div>
          </div>

          <div className="flex align-center gap-3" style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <div className="stat-icon" style={{ background: 'var(--success-50)', width: 40, height: 40 }}>
              <Phone size={18} style={{ color: 'var(--success-500)' }} />
            </div>
            <div>
              <p className="text-xs text-muted">Phone</p>
              <p className="font-semibold text-sm">+91 9876543210</p>
            </div>
          </div>

          <div className="flex align-center gap-3" style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <div className="stat-icon" style={{ background: 'var(--warning-50)', width: 40, height: 40 }}>
              <Clock size={18} style={{ color: 'var(--warning-600)' }} />
            </div>
            <div>
              <p className="text-xs text-muted">Hours</p>
              <p className="font-semibold text-sm">Mon–Sat, 9 AM – 6 PM</p>
            </div>
          </div>

          <div className="flex align-center gap-3" style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <div className="stat-icon" style={{ background: 'var(--error-50)', width: 40, height: 40 }}>
              <MapPin size={18} style={{ color: 'var(--error-500)' }} />
            </div>
            <div>
              <p className="text-xs text-muted">Address</p>
              <p className="font-semibold text-sm">PrintGo Technologies<br />123 Innovation Drive, Sector 5<br />Mumbai, Maharashtra 400001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
