import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Scan } from 'lucide-react';

export const Step1Scan = ({ mobileUrl }) => (
  <div className="text-center animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
    <div style={{ marginBottom: '2rem' }}>
      <div className="animate-float" style={{ display: 'inline-flex', padding: '1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-2xl)', marginBottom: '1.5rem' }}>
        <Scan size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
      <h1 className="text-4xl font-extrabold" style={{ marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
        Scan to <span className="gradient-text">Print</span>
      </h1>
      <p className="text-lg text-muted" style={{ maxWidth: 400, margin: '0 auto' }}>
        Point your phone's camera at the QR code to start printing instantly
      </p>
    </div>

    <div className="qr-container" style={{ marginBottom: '2rem' }}>
      <QRCodeSVG value={mobileUrl} size={260} level="H" />
    </div>

    <div className="flex align-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <p className="text-sm font-medium">Waiting for connection...</p>
    </div>
  </div>
);
