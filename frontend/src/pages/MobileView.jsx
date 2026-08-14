import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Upload, Settings, CheckCircle, Loader, CreditCard, WifiOff } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StepIndicator } from '../components/mobile/StepIndicator';

const API_URL = import.meta.env.VITE_API_URL || 'https://printgo-ssoi.onrender.com';

const MobileView = () => {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [error, setError] = useState('');
  const [price, setPrice] = useState(0);
  const [sessionToken, setSessionToken] = useState(null);

  // Helper: returns auth headers for API requests
  const authHeaders = () => sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  const [settings, setSettings] = useState({
    color: 'bw',
    duplex: 'single',
    copies: 1,
    pageRangeType: 'all',
    customRange: '',
    pagesToPrint: 1
  });

  useEffect(() => {
    let newSocket = null;

    // Join an existing server-side session (P0-006)
    const acquireSession = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/auth/session/join`, { sessionCode: sessionId });
        if (res.data.success) {
          const token = res.data.sessionToken;
          setSessionToken(token);

          newSocket = io(API_URL, { 
            transports: ['websocket'],
            auth: { token }
          });
          setSocket(newSocket);
          
          newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('join_session', sessionId);
            newSocket.emit('mobile_connected', sessionId);
          });
          newSocket.on('disconnect', () => setIsConnected(false));

          newSocket.on('kiosk_payment_success', ({ jobId: j }) => { setJobId(j); setStep(4); });
          newSocket.on('job_status_changed', (job) => {
            if (['WAITING', 'PRINTING', 'COMPLETED'].includes(job.status) && step !== 4) setStep(4);
          });
        }
      } catch (err) {
        console.error('Failed to join session:', err);
        const errorMsg = err.response?.data?.error || 'Failed to initialize session. Please reload.';
        showError(errorMsg);
      }
    };
    acquireSession();

    return () => {
      if (newSocket) newSocket.close();
    };
  }, [sessionId]);

  useEffect(() => {
    let interval;
    if (step === 3 && jobId) {
      interval = setInterval(async () => {
        try {
          const verifyRes = await axios.get(`${API_URL}/api/payments/verify/${jobId}`, { headers: authHeaders() });
          if (verifyRes.data.success && verifyRes.data.job.status !== 'PENDING_PAYMENT') {
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
    if (file.size > 50 * 1024 * 1024) {
      showError('File size exceeds 50MB limit.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() }
      });
      if (response.data.success) {
        const data = response.data.file;
        setFileData(data);
        socket.emit('file_uploaded', { sessionId, fileData: data });
        setStep(2);
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
        showError('Server is waking up, please try again in a few seconds.');
      } else {
        showError('Upload failed. Please try again.');
      }
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
    setIsSubmittingSettings(true);
    try {
      const res = await axios.post(`${API_URL}/api/jobs`, { file: fileData, settings }, { timeout: 15000, headers: authHeaders() });
      if (res.data.success) {
        setJobId(res.data.job.shortId);
        // Use the server-calculated cost as the authoritative price
        const serverCost = res.data.job.cost;
        setPrice(serverCost);
        socket.emit('payment_initiated', { sessionId, price: serverCost, jobId: res.data.job.shortId });
        setStep(3);
      }
    } catch (err) { 
      console.error(err);
      if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
        showError('Server is waking up, please try again in a few seconds.');
      } else {
        showError('Failed to save settings. Please try again.');
      }
    } finally {
      setIsSubmittingSettings(false);
    }
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
    setIsInitializingPayment(true);
    const res = await loadCashfree();
    if (!res) { 
      showError('Payment SDK failed to load.'); 
      setIsInitializingPayment(false);
      return; 
    }

    try {
      const orderRes = await axios.post(`${API_URL}/api/payments/order/${jobId}`, {}, { timeout: 15000, headers: authHeaders() });
      if (!orderRes.data.success) {
        showError('Failed to create order.');
        setIsInitializingPayment(false);
        return;
      }

      const { paymentSessionId, orderId, environment } = orderRes.data;
      const cashfree = window.Cashfree({ mode: environment || 'sandbox' });

      cashfree.checkout({ paymentSessionId, redirectTarget: '_modal' }).then(async (result) => {
        setIsInitializingPayment(false);
        if (result.error) {
          showError('Payment failed or cancelled.');
        }
        if (result.paymentDetails) {
          try {
            const verifyRes = await axios.get(`${API_URL}/api/payments/verify/${jobId}`, { headers: authHeaders() });
            if (verifyRes.data.success && verifyRes.data.job.status !== 'PENDING_PAYMENT') {
              setStep(4);
            }
          } catch (err) {
            console.error('Verify error:', err);
          }
        }
      });
    } catch (err) {
      setIsInitializingPayment(false);
      if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
        showError('Server is waking up, please try again in a few seconds.');
      } else {
        showError('Failed to initialize payment.');
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card glass className="text-center animate-fade-in mt-4">
            <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1rem', marginBottom: '1rem' }}>
              <Upload size={32} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Upload Document</h2>
            <p className="text-muted mb-6">Select a file from your phone to print</p>

            <label className="btn btn-primary w-full" style={{ display: 'flex', cursor: 'pointer', padding: '0.875rem', fontSize: '1rem' }}>
              {uploading ? <><Loader size={18} className="animate-spin" /> Uploading...</> : 'Choose File'}
              <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
            </label>
            <p className="text-xs text-muted mt-3">Supports PDF, DOCX, PPTX, JPG, PNG</p>
          </Card>
        );
      case 2:
        return (
          <Card glass className="animate-fade-in mt-4">
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
                <input type="number" name="copies" className="form-input text-center" min="1" max="100" value={settings.copies} onChange={handleSettingsChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pages</label>
              <select name="pageRangeType" className="form-select mb-2" value={settings.pageRangeType} onChange={handleSettingsChange}>
                <option value="all">All Pages ({fileData?.pages})</option>
                <option value="custom">Custom Range</option>
              </select>
              {settings.pageRangeType === 'custom' && (
                <input type="text" name="customRange" placeholder="e.g. 1-3, 5" className="form-input" value={settings.customRange} onChange={handleSettingsChange} />
              )}
            </div>

            <div className="price-card mt-2">
              <p className="text-sm opacity-80 mb-1">Total</p>
              <p className="text-4xl font-extrabold mb-3">₹{price}</p>
              <button 
                className="btn w-full font-bold" 
                style={{ background: 'white', color: 'var(--primary-color)', border: 'none', display: 'flex', justifyContent: 'center' }} 
                onClick={handlePrintSettingsSubmit}
                disabled={isSubmittingSettings}
              >
                {isSubmittingSettings ? <><Loader size={18} className="animate-spin mr-2" /> Processing...</> : 'Proceed to Payment'}
              </button>
            </div>
          </Card>
        );
      case 3:
        return (
          <Card glass className="text-center animate-fade-in mt-4 py-8">
            <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1rem', marginBottom: '1.25rem' }}>
              <CreditCard size={36} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Required</h2>
            <p className="text-muted mb-6">Total: <strong className="text-main text-xl">₹{price}</strong></p>

            <Button className="w-full text-lg py-3" onClick={handleCashfreePayment} disabled={isInitializingPayment} style={{ display: 'flex', justifyContent: 'center' }}>
              {isInitializingPayment ? <><Loader size={20} className="animate-spin mr-2" /> Loading...</> : 'Pay Securely'}
            </Button>
          </Card>
        );
      case 4:
        return (
          <Card glass className="text-center animate-fade-in mt-4 py-8">
            <div className="success-circle">
              <CheckCircle size={48} style={{ color: 'var(--success-500)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
            <p className="text-muted">Your document is now in the print queue.</p>
            <p className="font-semibold mt-4" style={{ color: 'var(--primary-color)' }}>
              Check the Kiosk screen for status
            </p>
          </Card>
        );
      default: return null;
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}>
      {!isConnected && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--error-500)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50, width: 'max-content', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
          <WifiOff size={16} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Offline Mode</span>
        </div>
      )}
      {error && (
        <div className="animate-fade-in" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600 }}>Error:</span> {error}
        </div>
      )}
      <StepIndicator step={step} />
      {renderStep()}
    </div>
  );
};

export default MobileView;
