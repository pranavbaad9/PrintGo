import React from 'react';
import { Card } from '../ui/Card';
import { ShieldCheck } from 'lucide-react';

export const Step4Payment = ({ price, jobId }) => (
  <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
    <div className="flex justify-center mb-6 animate-slide-up">
      <div style={{ background: 'var(--success-50)', padding: '0.75rem', borderRadius: '50%', color: 'var(--success-600)' }}>
        <ShieldCheck size={40} />
      </div>
    </div>
    <h1 className="text-4xl font-extrabold mb-2" style={{ letterSpacing: '-0.03em' }}>Complete Payment</h1>
    <p className="text-lg text-muted mb-8">Please complete the payment on your mobile device</p>

    <div className="price-card animate-scale-in" style={{ maxWidth: 320, margin: '0 auto 2rem', padding: '2rem 1rem' }}>
      <p className="text-sm opacity-90 font-semibold tracking-wide uppercase mb-2">Total Amount</p>
      <p className="text-6xl font-extrabold" style={{ letterSpacing: '-0.05em' }}>₹{price.toFixed(2)}</p>
      <div style={{ width: '40%', height: 2, background: 'rgba(255,255,255,0.2)', margin: '1rem auto' }} />
      <p className="text-xs opacity-75 font-mono">Order ID: {jobId}</p>
    </div>

    <Card glass className="inline-flex items-center gap-4 py-4 px-8 border-none" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'pulse 1s infinite' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'pulse 1s infinite 0.2s' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'pulse 1s infinite 0.4s' }} />
      </div>
      <p className="font-semibold text-primary-600 text-lg">Waiting for confirmation...</p>
    </Card>
  </div>
);
