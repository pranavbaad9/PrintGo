import React from 'react';
import { Loader, Printer, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export const Step5Status = ({ jobStatus, eta, formatEta }) => (
  <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
    {jobStatus === 'WAITING' && (
      <>
        <div style={{ display: 'inline-flex', background: 'var(--warning-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <Loader size={48} className="animate-spin" style={{ color: 'var(--warning-500)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2">In Print Queue</h1>
        <p className="text-lg text-muted">Estimated wait: {formatEta(eta)}</p>
      </>
    )}
    {jobStatus === 'PRINTING' && (
      <>
        <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <Printer size={48} className="animate-pulse" style={{ color: 'var(--primary-color)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Printing Now</h1>
        <p className="text-lg text-muted">Time remaining: {formatEta(eta)}</p>
      </>
    )}
    {jobStatus === 'COMPLETED' && (
      <>
        <div className="success-circle">
          <CheckCircle size={48} style={{ color: 'var(--success-500)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Collect Your Documents</h1>
        <p className="text-lg text-muted mb-8">Thank you for using PrintGo!</p>
        <Button onClick={() => window.location.reload()}>
          Start New Session
        </Button>
      </>
    )}
    {(jobStatus === 'CANCELLED' || jobStatus === 'FAILED') && (
      <>
        <div style={{ display: 'inline-flex', background: 'var(--error-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <CheckCircle size={48} style={{ color: 'var(--error-500)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Job Failed or Cancelled</h1>
        <p className="text-lg text-muted">Please contact the administrator.</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Start Over
        </Button>
      </>
    )}
  </div>
);
