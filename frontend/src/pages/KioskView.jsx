import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { WifiOff } from 'lucide-react';
import { Step1Scan } from '../components/kiosk/Step1Scan';
import { Step2Connected } from '../components/kiosk/Step2Connected';
import { Step3Settings } from '../components/kiosk/Step3Settings';
import { Step4Payment } from '../components/kiosk/Step4Payment';
import { Step5Status } from '../components/kiosk/Step5Status';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const [timeLeft, setTimeLeft] = useState(null);

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

    return () => newSocket.close();
  }, []);

  // Dynamic Inactivity timer logic
  useEffect(() => {
    let interval;
    if (step === 2) {
      setTimeLeft(40); // 40 seconds to upload a file
    } else if (step === 3) {
      setTimeLeft(120); // 2 minutes to select settings and hit pay
    } else if (step === 4) {
      setTimeLeft(180); // 3 minutes to complete payment
    } else if (step === 5 && (jobStatus === 'COMPLETED' || jobStatus === 'CANCELLED' || jobStatus === 'FAILED')) {
      setTimeLeft(15); // 15 seconds to view success screen
    } else {
      setTimeLeft(null);
    }

    if (step > 1) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            window.location.reload(); // Time's up, reset kiosk!
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [step, jobStatus, fileData, settingsData, price, jobId]);

  useEffect(() => {
    if (step === 5 && jobId) {
      const fetchJob = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/jobs/${jobId}`);
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

      {/* Auto-reset Timer Badge */}
      {timeLeft !== null && step > 1 && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0,0,0,0.05)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: timeLeft < 15 ? 'var(--error-500)' : 'var(--warning-500)' }} />
          Session resets in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      )}
    </div>
  );
};

export default KioskView;
