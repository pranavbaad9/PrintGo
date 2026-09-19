import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { WifiOff } from 'lucide-react';
import { Step1Scan } from '../components/kiosk/Step1Scan';
import { Step2Connected } from '../components/kiosk/Step2Connected';
import { Step3Settings } from '../components/kiosk/Step3Settings';
import { Step4Payment } from '../components/kiosk/Step4Payment';
import { Step5Status } from '../components/kiosk/Step5Status';

const API_URL = import.meta.env.VITE_API_URL || 'https://printgo-ssoi.onrender.com';

const KioskView = () => {
  const [sessionId, setSessionId] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [price, setPrice] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('');
  const [eta, setEta] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);

  const authHeaders = () => sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};

  useEffect(() => {
    let newSocket = null;

    // Create a server-side session (P0-006: server generates session code)
    const acquireSession = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/auth/session/create`, {});
        if (res.data.success) {
          const token = res.data.sessionToken;
          const code = res.data.sessionCode;
          setSessionId(code);
          setSessionToken(token);

          newSocket = io(API_URL, { 
            transports: ['websocket'],
            auth: { token }
          });
          setSocket(newSocket);
          
          newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('join_session', code);
          });
          newSocket.on('disconnect', () => setIsConnected(false));
          newSocket.on('connect_error', () => setIsConnected(false));

          newSocket.on('kiosk_user_connected', () => setStep(prev => prev < 2 ? 2 : prev));
          newSocket.on('kiosk_file_uploaded', (data) => { setFileData(data); setStep(3); });
          newSocket.on('kiosk_settings_updated', ({ settingsData: s, price: p }) => { setSettingsData(s); setPrice(p); });
          newSocket.on('kiosk_payment_initiated', ({ price: p, jobId: j }) => { setPrice(p); setJobId(j); setStep(4); });
          newSocket.on('kiosk_payment_success', () => { setStep(5); setJobStatus('WAITING'); });
          newSocket.on('job_status_changed', (job) => {
            setJobId((cur) => {
              if (job.shortId === cur) {
                setJobStatus(job.status);
                if (['WAITING', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) setStep(5);
              }
              return cur;
            });
          });
        }
      } catch (err) { 
        console.error('Failed to acquire kiosk session. Server might be waking up. Retrying in 5s...', err); 
        // Auto-retry to handle Render cold starts gracefully
        setTimeout(acquireSession, 5000);
      }
    };
    acquireSession();

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  // Removed Inactivity timer logic as per request

  useEffect(() => {
    if (step === 5 && jobId) {
      const fetchJob = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/jobs/${jobId}`, { headers: authHeaders() });
          if (res.data.success) {
            setJobStatus(res.data.job.status);
            setEta(res.data.job.eta || null);
          }
        } catch (e) { console.error(e); }
      };
      fetchJob();
      const interval = setInterval(fetchJob, 2000);
      return () => clearInterval(interval);
    }
  }, [step, jobId]);

  const mobileUrl = `${window.location.protocol}//${window.location.host}/m/${sessionId}`;

  const formatEta = (seconds) => {
    if (!seconds) return 'calculating...';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const renderContent = () => {
    switch (step) {
      case 1: return <Step1Scan mobileUrl={mobileUrl} />;
      case 2: return <Step2Connected />;
      case 3: return <Step3Settings fileData={fileData} settingsData={settingsData} price={price} />;
      case 4: return <Step4Payment price={price} jobId={jobId} />;
      case 5: return <Step5Status jobStatus={jobStatus} eta={eta} formatEta={formatEta} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
      {!isConnected && (
        <div className="animate-fade-in" style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--warning-50)', color: 'var(--warning-600)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 9999, border: '1px solid var(--warning-500)', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.15)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning-500)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>Connection interrupted. Reconnecting...</span>
        </div>
      )}
      
      {/* Step Indicator */}
      <div className="flex align-center justify-center w-full max-w-md mx-auto mb-10">
        {[1, 2, 3, 4, 5].map((s, idx) => (
          <React.Fragment key={s}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease',
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: '50%',
                background: step > s ? 'var(--success-500)' : step === s ? 'var(--primary-500)' : 'var(--gray-200)',
                color: step > s || step === s ? 'white' : 'var(--gray-500)',
                boxShadow: step === s ? '0 0 0 4px var(--primary-100)' : 'none'
              }}
            >
              {step > s ? '✓' : s}
            </div>
            {idx < 4 && (
              <div
                style={{
                  flex: 1,
                  height: 4,
                  margin: '0 0.5rem',
                  borderRadius: 2,
                  transition: 'all 0.5s ease',
                  background: step > s + 1 
                    ? 'var(--success-500)' 
                    : step > s
                    ? 'var(--primary-300)'
                    : 'var(--gray-200)',
                  boxShadow: step > s ? '0 0 8px rgba(99,102,241,0.2)' : 'none'
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {renderContent()}

      {/* Manual Start Over Button */}
      {step > 1 && (
        <button 
          onClick={() => {
            if (socket) socket.emit('cancel_session', { sessionId });
            setTimeout(() => window.location.reload(), 100);
          }}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            padding: '0.75rem 1.5rem',
            background: 'white',
            border: '2px solid var(--error-200)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--error-600)',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.2s ease',
            zIndex: 50
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--error-50)'; e.currentTarget.style.borderColor = 'var(--error-300)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--error-200)'; }}
        >
          Cancel / Start Over
        </button>
      )}
    </div>
  );
};

export default KioskView;
