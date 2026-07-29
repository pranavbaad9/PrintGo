import React from 'react';

export const StepIndicator = ({ step }) => (
  <div className="flex justify-center gap-2 align-center" style={{ padding: '1rem 0 0.5rem' }}>
    {['Upload', 'Settings', 'Pay', 'Done'].map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex align-center gap-1" style={{ flexDirection: 'column' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700,
            background: step > i + 1 ? 'var(--success-500)' : step === i + 1 ? 'var(--primary-gradient)' : 'var(--gray-200)',
            color: step >= i + 1 ? 'white' : 'var(--gray-500)',
            transition: 'all 0.3s var(--ease-out)'
          }}>
            {step > i + 1 ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: '0.6rem', color: step >= i + 1 ? 'var(--text-main)' : 'var(--gray-400)', fontWeight: 500 }}>{label}</span>
        </div>
        {i < 3 && (
          <div style={{
            width: 28, height: 2, borderRadius: 1,
            background: step > i + 1 ? 'var(--success-500)' : 'var(--gray-200)',
            transition: 'background 0.3s var(--ease-out)',
            marginBottom: '1rem'
          }} />
        )}
      </React.Fragment>
    ))}
  </div>
);
