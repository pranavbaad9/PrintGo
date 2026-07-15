import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Printer } from 'lucide-react';

import KioskView from './pages/KioskView';
import MobileView from './pages/MobileView';
import AdminDashboard from './pages/AdminDashboard';
import ContactUs from './pages/ContactUs';
import Terms from './pages/Terms';
import Refunds from './pages/Refunds';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isMobile = location.pathname.startsWith('/m/');

  return (
    <div className="container" style={isMobile ? { padding: 0 } : {}}>
      <header className="app-header">
        <Link to="/kiosk" className="logo text-light" style={{ color: 'white', textDecoration: 'none' }}>
          <Printer size={32} style={{ color: 'var(--primary-color)' }} />
          <span>Print<span style={{ color: 'var(--primary-color)' }}>Go</span> {isMobile && <span style={{fontSize:'1rem', opacity:0.8}}>Mobile</span>}</span>
        </Link>
        {!isAdmin && !isMobile && (
          <Link to="/admin" className="btn" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            Admin Login
          </Link>
        )}
      </header>
      <main className="main-content" style={isMobile ? { padding: 0 } : {}}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: '1rem', marginTop: 'auto', fontSize: '0.8rem', opacity: 0.8 }}>
        <Link to="/contact" style={{ margin: '0 10px', color: 'var(--text-color)' }}>Contact Us</Link>
        <Link to="/terms" style={{ margin: '0 10px', color: 'var(--text-color)' }}>Terms & Conditions</Link>
        <Link to="/refunds" style={{ margin: '0 10px', color: 'var(--text-color)' }}>Refunds & Cancellations</Link>
      </footer>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<KioskView />} />
          <Route path="/kiosk" element={<KioskView />} />
          <Route path="/m/:sessionId" element={<MobileView />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refunds" element={<Refunds />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

export default App;
