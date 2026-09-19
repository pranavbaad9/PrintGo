import React from 'react';
import { Loader, Printer, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export const Step5Status = ({ jobStatus, eta, formatEta }) => (
  <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
    {jobStatus === 'WAITING' && (
      <div className="animate-scale-in">
        <div style={{ display: 'inline-flex', background: 'var(--warning-50)', borderRadius: '50%', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--warning-200)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -10, border: '2px dashed var(--warning-300)', borderRadius: '50%', animation: 'spin 8s linear infinite' }} />
          <Loader size={48} style={{ color: 'var(--warning-500)' }} />
        </div>
        <h1 className="text-4xl font-extrabold mb-3" style={{ letterSpacing: '-0.03em' }}>In Print Queue</h1>
        <p className="text-xl text-muted font-medium">Estimated wait: {formatEta(eta)}</p>
      </div>
    )}
    
    {jobStatus === 'PRINTING' && (
      <div className="animate-scale-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', marginTop: '1rem', position: 'relative' }}>
          <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-50)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--primary-200)', boxShadow: 'var(--shadow-lg)' }}>
            <Printer size={56} style={{ color: 'var(--primary-600)', zIndex: 10, background: 'var(--primary-50)' }} />
            <div style={{ position: 'absolute', top: -10, zIndex: 5, animation: 'slideUp 2s ease-in-out infinite alternate-reverse' }}>
              <FileText size={40} style={{ color: 'var(--gray-400)' }} />
            </div>
            <div style={{ position: 'absolute', bottom: -15, width: '60%', height: 4, background: 'var(--primary-500)', borderRadius: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold mb-3" style={{ letterSpacing: '-0.03em' }}>Printing Now...</h1>
        <p className="text-xl text-muted font-medium mb-6">Time remaining: {formatEta(eta)}</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-primary-500 h-2 rounded-full" style={{ width: '60%', transition: 'width 1s ease', animation: 'pulse-ring 2s infinite' }}></div>
        </div>
      </div>
    )}
    
    {jobStatus === 'COMPLETED' && (
      <div className="animate-scale-in">
        <div className="success-circle" style={{ width: 120, height: 120, marginBottom: '2rem', background: 'var(--success-50)' }}>
          <CheckCircle size={64} style={{ color: 'var(--success-500)' }} />
        </div>
        <h1 className="text-4xl font-extrabold mb-3" style={{ letterSpacing: '-0.03em' }}>Printing Complete</h1>
        <p className="text-xl text-muted font-medium mb-10">Your documents are ready for collection.</p>
        <Button onClick={() => window.location.reload()} className="w-full text-lg py-3 rounded-full font-bold shadow-lg">
          Start New Session
        </Button>
      </div>
    )}
    
    {(jobStatus === 'CANCELLED' || jobStatus === 'FAILED') && (
      <div className="animate-scale-in">
        <div style={{ display: 'inline-flex', background: 'var(--error-50)', borderRadius: '50%', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--error-200)' }}>
          <AlertTriangle size={56} style={{ color: 'var(--error-500)' }} />
        </div>
        <h1 className="text-4xl font-extrabold mb-3" style={{ letterSpacing: '-0.03em' }}>Job Interrupted</h1>
        <p className="text-xl text-muted font-medium mb-8">Please contact the administrator for assistance.</p>
        <Button className="mt-4 w-full rounded-full py-3 font-bold" onClick={() => window.location.reload()}>
          Start Over
        </Button>
      </div>
    )}
  </div>
);
