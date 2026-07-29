import React from 'react';

export const Card = ({ children, className = '', glass = false, ...props }) => {
  const baseClass = glass ? 'glass-panel' : 'stat-card';
  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
