import React from 'react';
import { Smartphone, Loader } from 'lucide-react';

export const Step2Connected = () => (
  <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
    <div className="success-circle" style={{ background: 'var(--primary-50)' }}>
      <Smartphone size={40} style={{ color: 'var(--primary-color)' }} />
    </div>
    <div style={{ position: 'relative' }}>
      <div className="success-circle" style={{ width: 48, height: 48, position: 'absolute', top: -70, right: 'calc(50% - 60px)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-500)' }} />
      </div>
    </div>
    <h1 className="text-3xl font-bold" style={{ marginBottom: '0.5rem' }}>Device Connected</h1>
    <p className="text-lg text-muted mb-8">Upload your document on your phone to continue</p>
    <Loader size={28} className="animate-spin" style={{ color: 'var(--primary-300)', margin: '0 auto' }} />
  </div>
);
