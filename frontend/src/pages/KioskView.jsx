import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Smartphone, FileText, CheckCircle, Loader, Printer, Scan, WifiOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://printgo-ssoi.onrender.com';

const KioskView = () => {
  const [sessionId, setSessionId] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [price, setPrice] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('');
  const [eta, setEta] = useState(null);

  useEffect(() => {
    const id = uuidv4().substring(0, 8);
    setSessionId(id);
    const newSocket = io(API_URL, { transports: ['websocket'] });
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_session', id);
    });
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('kiosk_user_connected', () => setStep(prev => prev < 2 ? 2 : prev));
    newSocket.on('kiosk_file_uploaded', (data) => { setFileData(data); setStep(3); });
    newSocket.on('kiosk_settings_updated', ({ settingsData: s, price: p }) => { setSettingsData(s); setPrice(p); });
    newSocket.on('kiosk_payment_initiated', ({ price: p, jobId: j }) => { setPrice(p); setJobId(j); setStep(4); });
    newSocket.on('kiosk_payment_success', () => setStep(5));
    newSocket.on('job_status_changed', (job) => {
      setJobId((cur) => {
        if (job.shortId === cur) {
          setJobStatus(job.status);
          if (['Waiting', 'Printing', 'Completed'].includes(job.status)) setStep(5);
        }
        return cur;
      });
    });

    return () => newSocket.close();
  }, []);

  // Inactivity timeout
  useEffect(() => {
    let timeout;
    if (step > 1 && step < 5) {
      timeout = setTimeout(() => {
        window.location.reload(); // Auto-reset for next customer
      }, 3 * 60 * 1000); // 3 minutes inactivity
    }
    return () => clearTimeout(timeout);
  }, [step, fileData, settingsData, price, jobId]);

  useEffect(() => {
    if (step === 5 && jobId) {
      const fetchJob = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/jobs/${jobId}`);
          if (res.data.success) {
            setJobStatus(res.data.job.status);
            setEta(res.data.job.eta);
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
      case 1:
        return (
          <div className="text-center animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div className="animate-float" style={{ display: 'inline-flex', padding: '1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-2xl)', marginBottom: '1.5rem' }}>
                <Scan size={48} style={{ color: 'var(--primary-color)' }} />
              </div>
              <h1 className="text-4xl font-extrabold" style={{ marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
                Scan to <span className="gradient-text">Print</span>
              </h1>
              <p className="text-lg text-muted" style={{ maxWidth: 400, margin: '0 auto' }}>
                Point your phone's camera at the QR code to start printing instantly
              </p>
            </div>

            <div className="qr-container" style={{ marginBottom: '2rem' }}>
              <QRCodeSVG value={mobileUrl} size={260} level="H" />
            </div>

            <div className="flex align-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-color)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <p className="text-sm font-medium">Waiting for connection...</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
            <div className="success-circle" style={{ background: 'var(--primary-50)' }}>
              <Smartphone size={40} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <div className="success-circle" style={{ width: 48, height: 48, position: 'absolute', top: -70, right: 'calc(50% - 60px)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-500)' }} />
              </div>
            </div>
            <h1 className="text-3xl font-bold" style={{ marginBottom: '0.5rem' }}>Device Connected</h1>
            <p className="text-lg text-muted mb-8">Upload your document on your phone to continue</p>
            <Loader size={28} className="animate-spin" style={{ color: 'var(--primary-300)', margin: '0 auto' }} />
          </div>
        );

      case 3:
        return (
          <div className="animate-fade-in grid-2 w-full" style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="glass-panel">
              <div className="flex align-center gap-3 mb-6">
                <div style={{ background: 'var(--success-50)', borderRadius: 'var(--radius-md)', padding: '8px', display: 'flex' }}>
                  <CheckCircle size={22} style={{ color: 'var(--success-500)' }} />
                </div>
                <h2 className="text-xl font-bold">Document Received</h2>
              </div>

              <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                <FileText size={48} style={{ color: 'var(--primary-color)', marginBottom: '0.75rem' }} />
                <h3 className="font-bold text-lg truncate" title={fileData?.originalName}>{fileData?.originalName}</h3>
                <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                  {(fileData?.size / (1024 * 1024)).toFixed(2)} MB · {fileData?.mimetype?.split('/')[1]?.toUpperCase()}
                </p>
              </div>

              <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                  <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Pages</p>
                  <p className="text-xl font-bold">{fileData?.pages}</p>
                </div>
                <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                  <p className="text-xs text-muted" style={{ marginBottom: '0.125rem' }}>Status</p>
                  <p className="font-bold" style={{ color: 'var(--success-500)' }}>Ready</p>
                </div>
              </div>
            </div>

            <div className="glass-panel flex" style={{ flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="text-xl font-bold mb-6">Live Settings</h3>
                {settingsData ? (
                  <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      ['Color', settingsData.color === 'bw' ? 'Black & White' : 'Color'],
                      ['Sides', `${settingsData.duplex} Sided`],
                      ['Copies', settingsData.copies],
                      ['Pages', settingsData.pagesToPrint],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                        <span className="text-muted text-sm">{label}</span>
                        <span className="font-semibold text-sm capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center" style={{ padding: '2rem 0' }}>
                    <Loader size={24} className="animate-spin" style={{ color: 'var(--gray-300)', margin: '0 auto 0.75rem' }} />
                    <p className="text-sm text-muted">Waiting for settings...</p>
                  </div>
                )}
              </div>

              {settingsData && (
                <div className="price-card" style={{ marginTop: '1.25rem' }}>
                  <p className="text-sm opacity-80" style={{ marginBottom: '0.25rem' }}>Total Cost</p>
                  <p className="text-4xl font-extrabold">₹{price}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
            <h1 className="text-3xl font-bold mb-4">Complete Payment</h1>
            <p className="text-lg text-muted mb-8">Pay securely on your mobile device</p>

            <div className="glass-panel" style={{ display: 'inline-block', padding: '2rem' }}>
              <Loader size={48} className="animate-spin" style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
              <p className="font-semibold">Waiting for payment...</p>
            </div>

            <div className="price-card" style={{ maxWidth: 280, margin: '1.5rem auto 0' }}>
              <p className="text-sm opacity-80">Amount</p>
              <p className="text-4xl font-extrabold">₹{price}</p>
              <p className="text-xs opacity-60" style={{ marginTop: '0.25rem' }}>Order #{jobId}</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center animate-fade-in" style={{ maxWidth: 500, margin: '0 auto' }}>
            {jobStatus === 'Waiting' && (
              <>
                <div style={{ display: 'inline-flex', background: 'var(--warning-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <Loader size={48} className="animate-spin" style={{ color: 'var(--warning-500)' }} />
                </div>
                <h1 className="text-3xl font-bold mb-2">In Print Queue</h1>
                <p className="text-lg text-muted">Estimated wait: {formatEta(eta)}</p>
              </>
            )}
            {jobStatus === 'Printing' && (
              <>
                <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <Printer size={48} className="animate-pulse" style={{ color: 'var(--primary-color)' }} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Printing Now</h1>
                <p className="text-lg text-muted">Time remaining: {formatEta(eta)}</p>
              </>
            )}
            {jobStatus === 'Completed' && (
              <>
                <div className="success-circle">
                  <CheckCircle size={48} style={{ color: 'var(--success-500)' }} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Collect Your Documents</h1>
                <p className="text-lg text-muted mb-8">Thank you for using PrintGo!</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Start New Session
                </button>
              </>
            )}
            {jobStatus === 'Cancelled' && (
              <>
                <div style={{ display: 'inline-flex', background: 'var(--error-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <CheckCircle size={48} style={{ color: 'var(--error-500)' }} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Job Cancelled</h1>
                <p className="text-lg text-muted">Please contact the administrator.</p>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
      {!isConnected && (
        <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: 'var(--error-500)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
          <WifiOff size={16} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Mode. Trying to reconnect...</span>
        </div>
      )}
      {/* Step Indicator */}
      <div className="flex gap-2 align-center" style={{ marginBottom: '2rem' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`step-dot ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}
          />
        ))}
      </div>
      {renderContent()}
    </div>
  );
};

export default KioskView;
