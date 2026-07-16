import React from 'react';
import { XCircle, RefreshCw, AlertTriangle, Mail } from 'lucide-react';

const Refunds = () => {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
      <div className="glass-panel animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Refunds & Cancellations</h1>
        <p className="text-muted mb-6" style={{ lineHeight: 1.7 }}>
          At PrintGo, we strive to provide a seamless automated printing experience. Our refund and cancellation policies are outlined below.
        </p>

        {/* Cancellation Notice */}
        <div style={{ padding: '1.25rem', background: 'var(--warning-50)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: '1.25rem' }}>
          <div className="flex align-center gap-2 mb-2">
            <XCircle size={18} style={{ color: 'var(--warning-600)' }} />
            <h3 className="font-bold text-sm">Cancellations</h3>
          </div>
          <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
            Because printing is an automated and immediate physical process, <strong style={{ color: 'var(--text-main)' }}>orders cannot be cancelled</strong> once payment is successful and the document enters the print queue.
          </p>
        </div>

        {/* Refund Eligibility */}
        <div style={{ padding: '1.25rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <div className="flex align-center gap-2 mb-3">
            <RefreshCw size={18} style={{ color: 'var(--primary-color)' }} />
            <h3 className="font-bold text-sm">Refund Eligibility</h3>
          </div>
          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Hardware Failure', desc: 'Kiosk runs out of paper, paper jam, or power loss after payment but before printing.' },
              { label: 'Payment Failure', desc: 'Money deducted but order not created — automatic refund within 3–5 business days.' },
              { label: 'Print Quality', desc: 'Printer ink is smudged, unreadable, or defective.' },
            ].map((item) => (
              <div key={item.label} className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-color)', marginTop: 7, flexShrink: 0 }} />
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Request */}
        <div style={{ padding: '1.25rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex align-center gap-2 mb-2">
            <Mail size={18} style={{ color: 'var(--primary-color)' }} />
            <h3 className="font-bold text-sm">How to Request a Refund</h3>
          </div>
          <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
            Email <strong style={{ color: 'var(--primary-color)' }}>support@printgo.in</strong> within 48 hours with your Order ID and a brief description. Approved refunds are credited within 5–7 business days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Refunds;
