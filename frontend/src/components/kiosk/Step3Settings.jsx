import React from 'react';
import { CheckCircle, FileText, Loader } from 'lucide-react';
import { Card } from '../ui/Card';

export const Step3Settings = ({ fileData, settingsData, price }) => (
  <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6 w-full" style={{ maxWidth: 900, margin: '0 auto' }}>
    <Card glass style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex align-center gap-3 mb-6">
        <div style={{ background: 'var(--success-50)', borderRadius: 'var(--radius-full)', padding: '0.625rem', display: 'flex', boxShadow: '0 0 0 1px var(--success-200)' }}>
          <CheckCircle size={24} style={{ color: 'var(--success-600)' }} />
        </div>
        <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>Document Received</h2>
      </div>

      <div className="animate-scale-in" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'inline-flex', background: 'var(--primary-50)', padding: '1.25rem', borderRadius: '50%', marginBottom: '1rem', color: 'var(--primary-600)' }}>
          <FileText size={48} />
        </div>
        <h3 className="font-extrabold text-xl truncate px-4" title={fileData?.originalName}>{fileData?.originalName}</h3>
        <p className="text-sm text-muted font-medium" style={{ marginTop: '0.5rem' }}>
          {(fileData?.size / (1024 * 1024)).toFixed(2)} MB · {fileData?.mimetype?.split('/')[1]?.toUpperCase()}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 'auto' }}>
        <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', border: '1px solid var(--gray-100)' }}>
          <p className="text-xs text-muted font-semibold uppercase tracking-wider" style={{ marginBottom: '0.25rem' }}>Pages</p>
          <p className="text-2xl font-extrabold">{fileData?.pages}</p>
        </div>
        <div style={{ background: 'var(--success-50)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', border: '1px solid var(--success-100)' }}>
          <p className="text-xs text-success-600 font-semibold uppercase tracking-wider" style={{ marginBottom: '0.25rem', color: 'var(--success-600)' }}>Status</p>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--success-600)' }}>Ready</p>
        </div>
      </div>
    </Card>

    <Card glass style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <h3 className="text-2xl font-bold mb-6" style={{ letterSpacing: '-0.02em' }}>Live Settings</h3>
        {settingsData ? (
          <div className="stagger-children flex flex-col gap-4">
            {[
              ['Color Mode', settingsData.color === 'bw' ? 'Black & White' : 'Color'],
              ['Sides', `${settingsData.duplex} Sided`],
              ['Copies', settingsData.copies],
              ['Pages', settingsData.pagesToPrint],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center" style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)', transition: 'background 0.3s' }}>
                <span className="text-muted text-sm font-medium">{label}</span>
                {/* When value changes, the key changes, forcing React to remount and trigger animate-slide-up */}
                <span key={value} className="font-bold text-lg capitalize animate-slide-up" style={{ color: 'var(--primary-700)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <Loader size={36} className="animate-spin" style={{ color: 'var(--primary-300)', marginBottom: '1rem' }} />
            <p className="text-md text-muted font-medium">Waiting for your settings...</p>
          </div>
        )}
      </div>

      {settingsData && (
        <div className="price-card animate-scale-in" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--primary-gradient)', borderRadius: 'var(--radius-xl)' }}>
          <p className="text-sm opacity-90 font-semibold tracking-wide uppercase mb-1">Total Cost</p>
          {/* Key forces remount for smooth transition on price change */}
          <p key={price} className="text-5xl font-extrabold animate-slide-up">₹{price.toFixed(2)}</p>
        </div>
      )}
    </Card>
  </div>
);
