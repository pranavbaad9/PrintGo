import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  onClick,
  ...props 
}) => {
  const baseClass = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary' : '';
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
