import React from 'react';
import { CheckCircle, FileText, Loader } from 'lucide-react';
import { Card } from '../ui/Card';

export const Step3Settings = ({ fileData, settingsData, price }) => (
  <div className="animate-fade-in grid-2 w-full" style={{ maxWidth: 900, margin: '0 auto' }}>
    <Card glass>
      <div className="flex align-center gap-3 mb-6">
        <div style={{ background: 'var(--success-50)', borderRadius: 'var(--radius-md)', padding: '8px', display: 'flex' }}>
          <CheckCircle size={22} style={{ color: 'var(--success-500)' }} />
        </div>
        <h2 className="text-xl font-bold">Document Received</h2>
      </div>

      <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
        <FileText size={48} style={{ color: 'var(--primary-color)', marginBottom: '0.75rem', display: 'inline-block' }} />
        <h3 className="font-bold text-lg truncate" title={fileData?.originalName}>{fileData?.originalName}</h3>
        <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
          {(fileData?.size / (1024 * 1024)).toFixed(2)} MB · {fileData?.mimetype?.split('/')[1]?.toUpperCase()}
        </p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
          <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Pages</p>
          <p className="text-xl font-bold">{fileData?.pages}</p>
        </div>
        <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
          <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Status</p>
          <p className="font-bold" style={{ color: 'var(--success-500)' }}>Ready</p>
        </div>
      </div>
    </Card>

    <Card glass className="flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-bold mb-6">Live Settings</h3>
        {settingsData ? (
          <div className="stagger-children flex flex-col gap-3">
            {[
              ['Color', settingsData.color === 'bw' ? 'Black & White' : 'Color'],
              ['Sides', `${settingsData.duplex} Sided`],
              ['Copies', settingsData.copies],
              ['Pages', settingsData.pagesToPrint],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span className="text-muted text-sm">{label}</span>
                <span className="font-semibold text-sm capitalize">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader size={24} className="animate-spin" style={{ color: 'var(--gray-300)', margin: '0 auto 0.75rem' }} />
            <p className="text-sm text-muted">Waiting for settings...</p>
          </div>
        )}
      </div>

      {settingsData && (
        <div className="price-card mt-6">
          <p className="text-sm opacity-80 mb-1">Total Cost</p>
          <p className="text-4xl font-extrabold">₹{price}</p>
        </div>
      )}
    </Card>
  </div>
);
