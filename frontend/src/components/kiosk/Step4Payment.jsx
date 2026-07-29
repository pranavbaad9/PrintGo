import React from 'react';
import { Loader } from 'lucide-react';
import { Card } from '../ui/Card';

export const Step4Payment = ({ price, jobId }) => (
  <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
    <h1 className="text-3xl font-bold mb-4">Complete Payment</h1>
    <p className="text-lg text-muted mb-8">Pay securely on your mobile device</p>

    <Card glass className="inline-block p-8">
      <Loader size={48} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
      <p className="font-semibold text-center">Waiting for payment...</p>
    </Card>

    <div className="price-card" style={{ maxWidth: 280, margin: '1.5rem auto 0' }}>
      <p className="text-sm opacity-80">Amount</p>
      <p className="text-4xl font-extrabold">₹{price}</p>
      <p className="text-xs opacity-60" style={{ marginTop: '0.25rem' }}>Order #{jobId}</p>
    </div>
  </div>
);
