import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Upload, Settings, CheckCircle, Smartphone, Loader, CreditCard, WifiOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://printgo-ssoi.onrender.com';

const MobileView = () => {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [settings, setSettings] = useState({
    color: 'bw',
    duplex: 'single',
    copies: 1,
    pageRangeType: 'all',
    customRange: '',
    pagesToPrint: 1
  });

  const [price, setPrice] = useState(0);

  useEffect(() => {
    const newSocket = io(API_URL, { transports: ['websocket'] });
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_session', sessionId);
      newSocket.emit('mobile_connected', sessionId);
    });
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('kiosk_payment_success', ({ jobId: j }) => { setJobId(j); setStep(3); });
    newSocket.on('job_status_changed', (job) => {
      if (['Waiting', 'Printing', 'Completed'].includes(job.status) && step !== 4) setStep(4);
    });

    return () => newSocket.close();
  }, [sessionId]);

  // Polling for payment verification
  useEffect(() => {
    let interval;
    if (step === 3 && jobId) {
      interval = setInterval(async () => {
        try {
          const verifyRes = await axios.get(`${API_URL}/api/jobs/${jobId}/verify`);
          if (verifyRes.data.success && verifyRes.data.job.status !== 'Pending_Payment') {
            setStep(4);
          }
        } catch (err) {
          console.error('Polling verify error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, jobId]);

  useEffect(() => {
    if (!fileData) return;

    const calculateCustomPages = (rangeStr, totalPages) => {
      if (!rangeStr.trim()) return totalPages;
      let count = 0;
      for (const part of rangeStr.split(',')) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end) && start <= end && start > 0)
            count += Math.min(end, totalPages) - start + 1;
        } else {
          const num = parseInt(part.trim());
          if (!isNaN(num) && num > 0 && num <= totalPages) count += 1;
        }
      }
      return count > 0 ? count : totalPages;
    };

    const totalPages = fileData.pages || 1;
    const pagesToPrint = settings.pageRangeType === 'custom'
      ? calculateCustomPages(settings.customRange, totalPages)
      : totalPages;

    let calc = 0;
    if (settings.color === 'color') {
      calc = pagesToPrint * settings.copies * 10;
    } else if (settings.duplex === 'double') {
      calc = Math.ceil(pagesToPrint / 2) * settings.copies * 3;
    } else {
      calc = pagesToPrint * settings.copies * 2;
    }

    if (settings.pagesToPrint !== pagesToPrint)
      setSettings(prev => ({ ...prev, pagesToPrint }));
    setPrice(calc);

    if (socket)
      socket.emit('settings_updated', { sessionId, settingsData: { ...settings, pagesToPrint }, price: calc });
  }, [settings.color, settings.duplex, settings.copies, settings.pageRangeType, settings.customRange, fileData, socket]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { alert('File too large! Max 25MB.'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        const data = response.data.file;
        setFileData(data);
        socket.emit('file_uploaded', { sessionId, fileData: data });
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'copies' ? parseInt(value) : value)
    }));
  };

  const handlePrintSettingsSubmit = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/jobs`, { file: fileData, settings, price });
      if (res.data.success) {
        setJobId(res.data.job.shortId);
        socket.emit('payment_initiated', { sessionId, price, jobId: res.data.job.shortId });
        setStep(3);
      }
    } catch (err) { console.error(err); }
  };

  const loadCashfree = () => new Promise((resolve) => {
    if (window.Cashfree) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleCashfreePayment = async () => {
    const res = await loadCashfree();
    if (!res) { alert('Payment SDK failed to load.'); return; }

    try {
      const orderRes = await axios.post(`${API_URL}/api/jobs/${jobId}/cashfree/order`);
      if (!orderRes.data.success) return;

      const { paymentSessionId, orderId, environment } = orderRes.data;
      const cashfree = window.Cashfree({ mode: environment || 'sandbox' });

      cashfree.checkout({ paymentSessionId, redirectTarget: '_modal' }).then(async (result) => {
        if (result.error) {
          console.log('Cashfree error:', result.error);
          alert('Payment failed or cancelled.');
        }
        if (result.paymentDetails) {
          console.log('Payment successful. Verifying...');
          try {
            const verifyRes = await axios.get(`${API_URL}/api/jobs/${jobId}/verify`);
            if (verifyRes.data.success && verifyRes.data.job.status !== 'Pending_Payment') {
              setStep(4);
            } else {
              // Wait for webhook if manual verify says still pending
              console.log('Verification still pending, waiting for webhook...');
            }
          } catch (err) {
            console.error('Verify error:', err);
          }
        }
      });
    } catch (err) {
      console.error('Payment init error:', err);
      alert('Failed to initialize payment.');
    }
  };

  const handleSimulatePayment = async () => {
    try {
      await axios.post(`${API_URL}/api/jobs/${jobId}/pay`);
      socket.emit('payment_success', { sessionId, jobId });
      setStep(4);
    } catch (err) { console.error(err); }
  };

  /* --- Step Indicator --- */
  const StepIndicator = () => (
    <div className="flex justify-center gap-2 align-center" style={{ padding: '1rem 0 0.5rem' }}>
      {['Upload', 'Settings', 'Pay', 'Done'].map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex align-center gap-1" style={{ flexDirection: 'column' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              background: step > i + 1 ? 'var(--success-500)' : step === i + 1 ? 'var(--primary-gradient)' : 'var(--gray-200)',
              color: step >= i + 1 ? 'white' : 'var(--gray-500)',
              transition: 'all 0.3s var(--ease-out)'
            }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.6rem', color: step >= i + 1 ? 'var(--text-main)' : 'var(--gray-400)', fontWeight: 500 }}>{label}</span>
          </div>
          {i < 3 && (
            <div style={{
              width: 28, height: 2, borderRadius: 1,
              background: step > i + 1 ? 'var(--success-500)' : 'var(--gray-200)',
              transition: 'background 0.3s var(--ease-out)',
              marginBottom: '1rem'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  if (step === 1) {
    return (
      <div style={{ padding: '1rem', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}>
        {!isConnected && (
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--error-500)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50, width: 'max-content', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            <WifiOff size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Mode</span>
          </div>
        )}
        <StepIndicator />
        <div className="glass-panel text-center animate-fade-in" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1rem', marginBottom: '1rem' }}>
            <Upload size={32} style={{ color: 'var(--primary-color)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Upload Document</h2>
          <p className="text-muted mb-6" style={{ fontSize: '0.9375rem' }}>Select a file from your phone to print</p>

          <label className="btn btn-primary w-full" style={{ display: 'flex', cursor: 'pointer', padding: '0.875rem', fontSize: '1rem' }}>
            {uploading ? (
              <><Loader size={18} className="animate-spin" /> Uploading...</>
            ) : (
              <>Choose File (Max 25MB)</>
            )}
            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" disabled={uploading} />
          </label>

          <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
            Supports PDF, DOCX, PPTX, JPG, PNG
          </p>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ padding: '1rem', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}>
        {!isConnected && (
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--error-500)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50, width: 'max-content', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            <WifiOff size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Mode</span>
          </div>
        )}
        <StepIndicator />
        <div className="glass-panel animate-fade-in" style={{ marginTop: '1rem' }}>
          <div className="flex align-center gap-3 mb-4">
            <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: '6px', display: 'flex' }}>
              <Settings size={20} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h2 className="text-xl font-bold">Print Settings</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Color Mode</label>
            <select name="color" className="form-select" value={settings.color} onChange={handleSettingsChange}>
              <option value="bw">Black & White (₹2/side)</option>
              <option value="color">Color (₹10/side)</option>
            </select>
          </div>

          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Sides</label>
              <select name="duplex" className="form-select" value={settings.duplex} onChange={handleSettingsChange}>
                <option value="single">Single</option>
                <option value="double">Double (₹3/sheet)</option>
              </select>
            </div>
            <div className="form-group" style={{ width: 90 }}>
              <label className="form-label">Copies</label>
              <input type="number" name="copies" className="form-input" min="1" max="100" value={settings.copies} onChange={handleSettingsChange} style={{ textAlign: 'center' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pages</label>
            <select name="pageRangeType" className="form-select" value={settings.pageRangeType} onChange={handleSettingsChange} style={{ marginBottom: settings.pageRangeType === 'custom' ? '0.5rem' : 0 }}>
              <option value="all">All Pages ({fileData?.pages})</option>
              <option value="custom">Custom Range</option>
            </select>
            {settings.pageRangeType === 'custom' && (
              <input type="text" name="customRange" placeholder="e.g. 1-3, 5" className="form-input" value={settings.customRange} onChange={handleSettingsChange} />
            )}
          </div>

          <div className="price-card" style={{ marginTop: '0.5rem' }}>
            <p className="text-sm opacity-80" style={{ marginBottom: '0.25rem' }}>Total</p>
            <p className="text-4xl font-extrabold" style={{ marginBottom: '0.75rem' }}>₹{price}</p>
            <button
              className="btn w-full"
              style={{ background: 'white', color: 'var(--primary-color)', border: 'none', fontWeight: 700 }}
              onClick={handlePrintSettingsSubmit}
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div style={{ padding: '1rem', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}>
        {!isConnected && (
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--error-500)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50, width: 'max-content', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            <WifiOff size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Mode</span>
          </div>
        )}
        <StepIndicator />
        <div className="glass-panel text-center animate-fade-in" style={{ marginTop: '1rem', paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1rem', marginBottom: '1.25rem' }}>
            <CreditCard size={36} style={{ color: 'var(--primary-color)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Required</h2>
          <p className="text-muted mb-6" style={{ fontSize: '0.9375rem' }}>Total: <strong style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>₹{price}</strong></p>

          <button
            className="btn btn-primary w-full"
            onClick={handleCashfreePayment}
            style={{ fontSize: '1.0625rem', padding: '0.875rem' }}
          >
            Pay Securely with Cashfree
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={{ padding: '1rem', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}>
        {!isConnected && (
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--error-500)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50, width: 'max-content', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            <WifiOff size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Mode</span>
          </div>
        )}
        <StepIndicator />
        <div className="glass-panel text-center animate-fade-in" style={{ marginTop: '1rem', paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div className="success-circle">
            <CheckCircle size={48} style={{ color: 'var(--success-500)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
          <p className="text-muted" style={{ fontSize: '0.9375rem' }}>Your document is now in the print queue.</p>
          <p className="font-semibold" style={{ marginTop: '1rem', color: 'var(--primary-color)' }}>
            Check the Kiosk screen for status
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default MobileView;
