import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Printer, Loader } from 'lucide-react';

const KioskView = React.lazy(() => import('./pages/KioskView'));
const MobileView = React.lazy(() => import('./pages/MobileView'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Refunds = React.lazy(() => import('./pages/Refunds'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', marginTop: '15vh' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            The application encountered an unexpected error.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoadingFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '1rem' }}>
    <Loader size={32} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
    <p className="text-muted text-sm">Loading...</p>
  </div>
);

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isMobile = location.pathname.startsWith('/m/');

  return (
    <div className="container" style={isMobile ? { padding: 0, maxWidth: '100%' } : {}}>
      <header className="app-header" style={isMobile ? { padding: '0.75rem 1rem' } : {}}>
        <Link 
          to={isMobile ? "#" : "/kiosk"} 
          className="logo" 
          style={{ textDecoration: 'none', pointerEvents: isMobile ? 'none' : 'auto' }}
        >
          <div style={{
            background: 'var(--primary-gradient)',
            borderRadius: 'var(--radius-md)',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Printer size={22} color="white" />
          </div>
          <span style={{ color: 'var(--text-main)' }}>
            Print<span style={{ color: 'var(--primary-color)' }}>Go</span>
          </span>
          {isMobile && (
            <span style={{ 
              fontSize: '0.65rem', 
              background: 'var(--primary-50)', 
              color: 'var(--primary-600)', 
              padding: '2px 8px', 
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}>
              MOBILE
            </span>
          )}
        </Link>
        {!isAdmin && !isMobile && (
          <Link
            to="/admin"
            className="btn"
            style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
          >
            Admin
          </Link>
        )}
      </header>

      <main className="main-content" style={isMobile ? { padding: 0 } : {}}>
        {children}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1rem 0',
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0.25rem',
        borderTop: '1px solid var(--gray-100)'
      }}>
        <Link to="/contact">Contact Us</Link>
        <Link to="/terms">Terms & Conditions</Link>
        <Link to="/refunds">Refunds & Cancellations</Link>
      </footer>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppLayout>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
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
