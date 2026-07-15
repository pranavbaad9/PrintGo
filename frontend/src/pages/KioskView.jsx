import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Smartphone, FileText, CheckCircle, Loader, Printer } from 'lucide-react';

const KioskView = () => {
  const [sessionId, setSessionId] = useState('');
  const [socket, setSocket] = useState(null);
  const [step, setStep] = useState(1); // 1: QR, 2: Connected, 3: File, 4: Payment, 5: Queue
  
  const [fileData, setFileData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [price, setPrice] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('');
  const [eta, setEta] = useState(null);

  useEffect(() => {
    const id = uuidv4().substring(0, 8);
    setSessionId(id);

    const newSocket = io(`${import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`}`);
    setSocket(newSocket);

    newSocket.emit('join_session', id);

    newSocket.on('kiosk_user_connected', () => {
      setStep(2); // User connected
    });

    newSocket.on('kiosk_file_uploaded', (data) => {
      setFileData(data);
      setStep(3); // File received
    });

    newSocket.on('kiosk_settings_updated', ({ settingsData, price }) => {
      setSettingsData(settingsData);
      setPrice(price);
    });

    newSocket.on('kiosk_payment_initiated', ({ price, jobId }) => {
      setPrice(price);
      setJobId(jobId);
      setStep(4); // Payment UI
    });

    newSocket.on('kiosk_payment_success', ({ jobId }) => {
      setStep(5); // Status UI
    });

    // Listen for queue updates
    newSocket.on('job_status_changed', (job) => {
      setJobId((currentJobId) => {
        if (job.id === currentJobId) {
          setJobStatus(job.status);
          if (job.status === 'Waiting' || job.status === 'Printing' || job.status === 'Completed') {
            setStep(5);
          }
        }
        return currentJobId;
      });
    });

    return () => newSocket.close();
  }, []);

  // Poll ETA when in status screen
  useEffect(() => {
    if (step === 5 && jobId) {
      const fetchJob = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`}/api/jobs/${jobId}`);
          if (res.data.success) {
            setJobStatus(res.data.job.status);
            setEta(res.data.job.eta);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchJob();
      const interval = setInterval(fetchJob, 2000);
      return () => clearInterval(interval);
    }
  }, [step, jobId]);

  const mobileUrl = `${window.location.protocol}//${window.location.hostname}:5173/m/${sessionId}`;

  const renderContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl font-bold mb-4">Scan QR Code to Start Printing</h1>
            <p className="text-xl text-muted mb-8">Use your phone's camera to connect instantly.</p>
            <div className="p-8 bg-white inline-block rounded-2xl shadow-lg mb-8">
              <QRCodeSVG value={mobileUrl} size={300} />
            </div>
            <div className="flex justify-center align-center gap-2 text-muted">
              <Loader className="animate-spin" size={24} />
              <p>Waiting for connection...</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="text-center animate-fade-in">
            <Smartphone size={80} className="mx-auto mb-6 text-primary-color" style={{ color: 'var(--primary-color)' }} />
            <h1 className="text-4xl font-bold mb-4">Device Connected</h1>
            <p className="text-xl text-muted mb-8">Please upload your document on your phone...</p>
            <Loader className="animate-spin mx-auto text-muted" size={40} />
          </div>
        );
      case 3:
        return (
          <div className="animate-fade-in grid-2 w-full max-w-4xl mx-auto">
            <div className="glass-panel">
              <div className="flex align-center gap-2 mb-6">
                <CheckCircle size={32} style={{ color: 'var(--success-color)' }} />
                <h2 className="text-2xl font-bold">Document Received</h2>
              </div>
              <div className="p-6 rounded-xl text-center mb-6" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <FileText size={64} className="mx-auto mb-4 text-primary-color" style={{ color: 'var(--primary-color)' }} />
                <h3 className="text-xl font-bold truncate" title={fileData?.originalName}>{fileData?.originalName}</h3>
                <p className="text-muted mt-2">
                  {(fileData?.size / (1024 * 1024)).toFixed(2)} MB • {fileData?.mimetype.split('/')[1].toUpperCase()}
                </p>
              </div>
              <div className="grid-2 gap-4">
                <div className="p-4 rounded-lg bg-black bg-opacity-5" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <p className="text-sm text-muted">Total Pages</p>
                  <p className="text-2xl font-bold">{fileData?.pages}</p>
                </div>
                <div className="p-4 rounded-lg bg-black bg-opacity-5" style={{ background: 'rgba(0,0,0,0.05)' }}>
                  <p className="text-sm text-muted">Status</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--success-color)' }}>Ready to Print</p>
                </div>
              </div>
            </div>
            
            <div className="glass-panel flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-6">Live Print Settings</h3>
              {settingsData ? (
                <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="flex justify-between p-3 border-b" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <span className="text-muted">Color Mode</span>
                    <span className="font-bold capitalize">{settingsData.color === 'bw' ? 'Black & White' : 'Color'}</span>
                  </div>
                  <div className="flex justify-between p-3 border-b" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <span className="text-muted">Sides</span>
                    <span className="font-bold capitalize">{settingsData.duplex} Sided</span>
                  </div>
                  <div className="flex justify-between p-3 border-b" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <span className="text-muted">Copies</span>
                    <span className="font-bold">{settingsData.copies}</span>
                  </div>
                  <div className="flex justify-between p-3 border-b" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <span className="text-muted">Pages to Print</span>
                    <span className="font-bold">{settingsData.pagesToPrint}</span>
                  </div>
                  <div className="mt-6 p-6 rounded-xl text-center" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                    <p className="text-sm opacity-80 mb-1">Total Cost</p>
                    <p className="text-5xl font-bold">₹{price}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  <Loader className="animate-spin mx-auto text-muted mb-4" size={32} />
                  <p className="text-muted">Waiting for user to select settings...</p>
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl font-bold mb-4">Complete Payment</h1>
            <p className="text-xl text-muted mb-8">Please complete the payment securely on your mobile device.</p>
            <div className="p-8 bg-white inline-block rounded-2xl shadow-lg mb-8">
              <Loader className="animate-spin mx-auto text-primary-color mb-4" size={64} style={{ color: 'var(--primary-color)' }} />
              <p className="text-lg font-bold">Waiting for payment confirmation...</p>
            </div>
            <div className="p-4 rounded-xl max-w-sm mx-auto" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
              <p className="text-sm text-muted">Amount to Pay</p>
              <p className="text-4xl font-bold" style={{ color: 'var(--primary-color)' }}>₹{price}</p>
              <p className="text-xs text-muted mt-2">Order ID: #{jobId}</p>
            </div>
          </div>
        );
      case 5:
        const formatEta = (seconds) => {
          if (!seconds) return 'calculating...';
          if (seconds < 60) return `${seconds} seconds`;
          return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
        };
        
        return (
          <div className="text-center animate-fade-in">
            {jobStatus === 'Waiting' && <Loader size={80} className="animate-spin text-warning-color mx-auto mb-6" />}
            {jobStatus === 'Printing' && <Printer size={80} className="animate-pulse mx-auto mb-6" style={{ color: 'var(--primary-color)' }} />}
            {jobStatus === 'Completed' && <CheckCircle size={80} className="mx-auto mb-6" style={{ color: 'var(--success-color)' }} />}
            {jobStatus === 'Cancelled' && <CheckCircle size={80} className="mx-auto mb-6" style={{ color: 'var(--error-color)' }} />}
            
            <h1 className="text-4xl font-bold mb-4">
              {jobStatus === 'Waiting' && 'In Print Queue'}
              {jobStatus === 'Printing' && 'Printing Now...'}
              {jobStatus === 'Completed' && 'Please Collect Your Documents'}
              {jobStatus === 'Cancelled' && 'Job Cancelled'}
            </h1>
            
            <p className="text-xl text-muted mb-8">
              {jobStatus === 'Waiting' && `Queue #${jobId} - Estimated wait time: ${formatEta(eta)}`}
              {jobStatus === 'Printing' && `Queue #${jobId} - Estimated time remaining: ${formatEta(eta)}`}
              {jobStatus === 'Completed' && 'Thank you for using PrintGo!'}
              {jobStatus === 'Cancelled' && 'Please contact the administrator.'}
            </p>

            {jobStatus === 'Completed' && (
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Start New Session
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {renderContent()}
    </div>
  );
};

export default KioskView;
