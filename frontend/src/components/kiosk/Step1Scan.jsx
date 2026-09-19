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

    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '3rem', marginTop: '1rem' }}>
      {/* Ambient glowing background pulse */}
      <div 
        style={{
          position: 'absolute',
          inset: -20,
          background: 'var(--primary-200)',
          borderRadius: 'var(--radius-full)',
          filter: 'blur(30px)',
          opacity: 0.5,
          animation: 'pulse 3s ease-in-out infinite'
        }}
      />
      {/* The QR Container itself doesn't distort */}
      <div 
        style={{
          padding: '2rem',
          background: 'white',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--gray-100)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <QRCodeSVG value={mobileUrl} size={280} level="H" />
        
        {/* Scanning Line overlay inside the white card but over the QR */}
        <div style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          right: '2rem',
          height: 2,
          background: 'var(--primary-500)',
          boxShadow: '0 0 10px 2px var(--primary-400)',
          animation: 'scanLine 3s ease-in-out infinite',
          zIndex: 20
        }} />
      </div>
    </div>

    <div className="flex align-center justify-center gap-3 animate-slide-up" style={{ color: 'var(--text-main)', background: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary-color)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <p className="text-sm font-semibold">Waiting for connection...</p>
    </div>
  </div>
);
