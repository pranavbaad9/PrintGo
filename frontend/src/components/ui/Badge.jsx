import React from 'react';

export const Badge = ({ status, children, className = '' }) => {
  const getBadgeClass = (s) => {
    switch(s?.toLowerCase()) {
      case 'completed':
      case 'active':
      case 'paid':
        return 'badge-completed';
      case 'printing':
        return 'badge-printing';
      case 'cancelled':
      case 'failed':
      case 'error':
        return 'badge-cancelled';
      case 'pending':
      case 'pending_payment':
      case 'waiting':
      default:
        return 'badge-pending';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)} ${className}`}>
      {children || status}
    </span>
  );
};
