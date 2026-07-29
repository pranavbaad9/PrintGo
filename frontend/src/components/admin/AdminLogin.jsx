import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const AdminLogin = ({ onLogin, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="flex align-center justify-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <Card glass className="text-center animate-fade-in w-full" style={{ maxWidth: 400 }}>
        <div className="stat-icon" style={{ background: 'var(--primary-50)', width: 48, height: 48, margin: '0 auto 1.5rem' }}>
          <Lock size={24} style={{ color: 'var(--primary-color)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Admin Login</h2>
        <p className="text-muted mb-6">Enter your credentials to access the dashboard.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="email" 
            placeholder="Email" 
            className="form-input" 
            value={email} onChange={e => setEmail(e.target.value)} required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="form-input" 
            value={password} onChange={e => setPassword(e.target.value)} required 
          />
          {authError && <p className="text-sm" style={{ color: 'var(--error-500)' }}>{authError}</p>}
          <Button type="submit" className="w-full">Login</Button>
        </form>
      </Card>
    </div>
  );
};
