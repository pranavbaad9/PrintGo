import React from 'react';
import { Smartphone, CheckCircle } from 'lucide-react';

export const Step2Connected = () => (
  <div className="text-center animate-scale-in" style={{ maxWidth: 500, margin: '0 auto' }}>
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '2rem' }}>
      <div 
        style={{
          position: 'absolute',
          inset: -30,
          background: 'var(--success-50)',
          borderRadius: '50%',
          animation: 'pulse 2s ease-out infinite'
        }}
      />
      <div className="success-circle" style={{ background: 'var(--success-50)', position: 'relative', zIndex: 10 }}>
        <Smartphone size={40} style={{ color: 'var(--success-600)' }} />
      </div>
      <div className="animate-scale-in" style={{ position: 'absolute', top: -10, right: -10, zIndex: 20, background: 'white', borderRadius: '50%', padding: 2, boxShadow: 'var(--shadow-sm)' }}>
        <CheckCircle size={32} style={{ color: 'var(--success-500)' }} />
      </div>
    </div>
    
    <h1 className="text-4xl font-extrabold" style={{ marginBottom: '1rem', letterSpacing: '-0.03em' }}>Device Connected</h1>
    <p className="text-lg text-muted mb-8">Your phone is securely connected to PrintGo</p>
    
    <div className="flex align-center justify-center gap-3 animate-slide-up" style={{ color: 'var(--success-600)', background: 'var(--success-50)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', border: '1px solid var(--success-200)' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success-500)' }} />
      <p className="text-sm font-semibold">Waiting for document upload...</p>
    </div>
  </div>
);
