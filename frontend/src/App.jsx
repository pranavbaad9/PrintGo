import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Printer } from 'lucide-react';

const KioskView = React.lazy(() => import('./pages/KioskView'));
const MobileView = React.lazy(() => import('./pages/MobileView'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Refunds = React.lazy(() => import('./pages/Refunds'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', marginTop: '20vh' }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: 'var(--text-muted)' }}>The application encountered an unexpected error.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <Link to="/admin" className="btn" style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
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
        <ErrorBoundary>
          <Suspense fallback={<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<KioskView />} />
              <Route path="/kiosk" element={<KioskView />} />
              <Route path="/m/:sessionId" element={<MobileView />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refunds" element={<Refunds />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </Router>
  );
};

export default App;
