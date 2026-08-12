import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Building2, MonitorSmartphone, CreditCard, Settings, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Companies from './pages/Companies';
import Machines from './pages/Machines';
import { AuthProvider, useAuth } from './context/AuthContext';

function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <MonitorSmartphone className="accent" size={28} />
        PrintGo <span className="accent">Admin</span>
      </div>
      
      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Welcome,</div>
        <div style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Super Admin'}</div>
      </div>

      <nav className="nav-links">
        <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link to="/companies" className={`nav-item ${isActive('/companies') ? 'active' : ''}`}>
          <Building2 size={20} />
          Companies
        </Link>
        <Link to="/machines" className={`nav-item ${isActive('/machines') ? 'active' : ''}`}>
          <MonitorSmartphone size={20} />
          Machines
        </Link>
        <Link to="/subscriptions" className={`nav-item ${isActive('/subscriptions') ? 'active' : ''}`}>
          <CreditCard size={20} />
          Subscriptions
        </Link>
        <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
          <Settings size={20} />
          Settings
        </Link>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <button 
          onClick={logout} 
          className="nav-item" 
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AdminLayout><Dashboard /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/companies" element={
            <ProtectedRoute>
              <AdminLayout><Companies /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/machines" element={
            <ProtectedRoute>
              <AdminLayout><Machines /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/subscriptions" element={
            <ProtectedRoute>
              <AdminLayout>
                <div className="glass-panel">
                  <h1>Subscriptions</h1><p className="subtitle">SaaS billing and plans.</p>
                </div>
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <AdminLayout>
                <div className="glass-panel">
                  <h1>Settings</h1><p className="subtitle">Global platform configuration.</p>
                </div>
              </AdminLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
