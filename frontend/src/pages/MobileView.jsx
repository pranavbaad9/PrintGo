import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Upload, Settings, CheckCircle, Loader, CreditCard, WifiOff } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StepIndicator } from '../components/mobile/StepIndicator';
import { PDFDocument } from 'pdf-lib';
import forge from 'node-forge';

const API_URL = import.meta.env.VITE_API_URL || 'https://printgo-ssoi.onrender.com';

const MobileView = () => {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [error, setError] = useState('');
  const [price, setPrice] = useState(0);
  const [sessionToken, setSessionToken] = useState(null);
  
  // E2E Encryption State
  const [publicKey, setPublicKey] = useState(null);
  const [encryptedKey, setEncryptedKey] = useState(null);
  const [iv, setIv] = useState(null);

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
          
          // Fetch the Kiosk's public key for E2E Encryption
          if (res.data.machineId) {
            axios.get(`${API_URL}/api/machines/${res.data.machineId}/public-key`)
              .then(pkRes => {
                if (pkRes.data.success) setPublicKey(pkRes.data.publicKey);
              })
              .catch(err => console.error('Failed to fetch Kiosk public key:', err));
          }
          newSocket.on('disconnect', () => setIsConnected(false));
          newSocket.on('connect_error', () => setIsConnected(false));

          newSocket.on('kiosk_payment_success', ({ jobId: j }) => { setJobId(j); setStep(4); });
          newSocket.on('session_cancelled', () => {
            showError('Session cancelled by the kiosk. Please scan a new QR code.');
            setStep(1); // Force back to an invalid state or keep error visible
          });
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
            if (socket && sessionId) {
              socket.emit('payment_success', { sessionId, jobId });
            }
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
    
    try {
      let payloadToUpload = file;
      let claimedPages = 1;
      let isEncrypted = false;
      
      // E2E Encryption Flow
      if (publicKey && file.type === 'application/pdf') {
        console.log('Initiating true E2E Encryption...');
        
        // 1. Read file locally
        const arrayBuffer = await file.arrayBuffer();
        
        // 2. Extract page count locally
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        claimedPages = pdfDoc.getPageCount();
        console.log(`Local page count: ${claimedPages}`);
        
        // 3. Generate AES-GCM Key & IV
        const rawKey = window.crypto.getRandomValues(new Uint8Array(32)); // 256-bit
        const rawIv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit
        
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']
        );
        
        // 4. Encrypt File
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: rawIv },
          cryptoKey,
          arrayBuffer
        );
        
        // Convert to Blob
        payloadToUpload = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
        
        // 5. Encrypt AES Key with Kiosk RSA Public Key
        const forgePublicKey = forge.pki.publicKeyFromPem(publicKey);
        const encryptedRawKey = forgePublicKey.encrypt(
          forge.util.createBuffer(rawKey).getBytes(), 
          'RSA-OAEP', 
          { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha1.create() } }
        );
        
        setEncryptedKey(forge.util.encode64(encryptedRawKey));
        setIv(forge.util.encode64(forge.util.createBuffer(rawIv).getBytes()));
        isEncrypted = true;
      }
      
      const formData = new FormData();
      formData.append('file', payloadToUpload, file.name);
      formData.append('isEncrypted', isEncrypted);
      formData.append('claimedPages', claimedPages);

      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() }
      });
      
      if (response.data.success) {
        const data = response.data.file;
        // Ensure local page count overrides backend's fallback
        data.pages = isEncrypted ? claimedPages : data.pages; 
        setFileData(data);
        socket.emit('file_uploaded', { sessionId, fileData: data });
        setStep(2);
      }
    } catch (err) {
      console.error(err);
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
      const payload = { file: fileData, settings };
      if (encryptedKey && iv) {
        payload.encryptedKey = encryptedKey;
        payload.iv = iv;
      }
      
      const res = await axios.post(`${API_URL}/api/jobs`, payload, { timeout: 15000, headers: authHeaders() });
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
              // Tell backend to notify the kiosk UI that payment succeeded
              socket.emit('payment_success', { sessionId, jobId });
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
          <Card glass className="text-center animate-fade-in mt-4 border-2 border-dashed border-gray-200">
            <div className="py-6">
              <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <Upload size={36} style={{ color: 'var(--primary-color)' }} className={uploading ? 'animate-bounce' : ''} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Upload Document</h2>
              <p className="text-muted mb-8 text-sm">Select a file from your phone to print</p>

              {uploading ? (
                <div className="w-full max-w-xs mx-auto animate-scale-in">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2 relative">
                    <div className="absolute top-0 left-0 h-full bg-primary-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '80%', transition: 'width 0.3s' }}></div>
                  </div>
                  <p className="text-sm font-semibold text-primary-500">Uploading...</p>
                </div>
              ) : (
                <label className="btn btn-primary w-full max-w-xs mx-auto" style={{ display: 'flex', cursor: 'pointer', padding: '1rem', fontSize: '1.05rem', borderRadius: 'var(--radius-lg)' }}>
                  Choose File
                  <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
              
              {!uploading && <p className="text-xs text-muted mt-5 opacity-70">Supports PDF, DOCX, PPTX, JPG, PNG</p>}
            </div>
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

            <div className="form-group mb-5">
              <label className="form-label mb-2 block">Color Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <div className={`selection-card ${settings.color === 'bw' ? 'selected' : ''}`} onClick={() => setSettings(p => ({ ...p, color: 'bw' }))}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">Black & White</p>
                      <p className="text-xs text-muted mt-1">₹2 / side</p>
                    </div>
                    {settings.color === 'bw' && <CheckCircle size={16} className="text-primary-500 animate-scale-in" />}
                  </div>
                </div>
                <div className={`selection-card ${settings.color === 'color' ? 'selected' : ''}`} onClick={() => setSettings(p => ({ ...p, color: 'color' }))}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">Color</p>
                      <p className="text-xs text-muted mt-1">₹10 / side</p>
                    </div>
                    {settings.color === 'color' && <CheckCircle size={16} className="text-primary-500 animate-scale-in" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group mb-5">
              <label className="form-label mb-2 block">Sides</label>
              <div className="grid grid-cols-2 gap-3">
                <div className={`selection-card ${settings.duplex === 'single' ? 'selected' : ''}`} onClick={() => setSettings(p => ({ ...p, duplex: 'single' }))}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">Single Sided</p>
                    </div>
                    {settings.duplex === 'single' && <CheckCircle size={16} className="text-primary-500 animate-scale-in" />}
                  </div>
                </div>
                <div className={`selection-card ${settings.duplex === 'double' ? 'selected' : ''}`} onClick={() => setSettings(p => ({ ...p, duplex: 'double' }))}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">Double Sided</p>
                      <p className="text-xs text-muted mt-1">₹3 / sheet</p>
                    </div>
                    {settings.duplex === 'double' && <CheckCircle size={16} className="text-primary-500 animate-scale-in" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group mb-5">
              <label className="form-label mb-2 block">Copies</label>
              <div className="flex items-center gap-4">
                <button className="btn rounded-full w-12 h-12 flex items-center justify-center text-xl pb-1" onClick={() => setSettings(p => ({ ...p, copies: Math.max(1, p.copies - 1) }))}>−</button>
                <div className="text-2xl font-bold flex-1 text-center">{settings.copies}</div>
                <button className="btn rounded-full w-12 h-12 flex items-center justify-center text-xl pb-1" onClick={() => setSettings(p => ({ ...p, copies: Math.min(100, p.copies + 1) }))}>+</button>
              </div>
            </div>

            <div className="form-group mb-5">
              <label className="form-label mb-2 block">Pages</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className={`selection-card ${settings.pageRangeType === 'all' ? 'selected' : ''}`} onClick={() => setSettings(p => ({ ...p, pageRangeType: 'all' }))}>
                  <p className="font-bold text-sm text-center">All ({fileData?.pages})</p>
                </div>
                <div className={`selection-card ${settings.pageRangeType === 'custom' ? 'selected' : ''}`} onClick={() => setSettings(p => ({ ...p, pageRangeType: 'custom' }))}>
                  <p className="font-bold text-sm text-center">Custom Range</p>
                </div>
              </div>
              {settings.pageRangeType === 'custom' && (
                <input type="text" name="customRange" placeholder="e.g. 1-3, 5" className="form-input animate-slide-up" value={settings.customRange} onChange={handleSettingsChange} />
              )}
            </div>

            <div className="price-card animate-scale-in" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--primary-gradient)', borderRadius: 'var(--radius-xl)' }}>
              <p className="text-sm opacity-90 font-semibold tracking-wide uppercase mb-1">Total</p>
              <p key={price} className="text-5xl font-extrabold animate-slide-up">₹{price.toFixed(2)}</p>
              <button 
                className="btn w-full font-bold mt-4" 
                style={{ background: 'white', color: 'var(--primary-color)', border: 'none', display: 'flex', justifyContent: 'center', padding: '1rem', borderRadius: 'var(--radius-lg)' }} 
                onClick={handlePrintSettingsSubmit}
                disabled={isSubmittingSettings}
              >
                {isSubmittingSettings ? <><Loader size={20} className="animate-spin mr-2" /> Processing...</> : 'Proceed to Payment'}
              </button>
            </div>
          </Card>
        );
      case 3:
        return (
          <Card glass className="text-center animate-scale-in mt-4 py-8 border-none" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'inline-flex', background: 'var(--primary-50)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary-100)' }}>
              <CreditCard size={40} style={{ color: 'var(--primary-600)' }} />
            </div>
            <h2 className="text-3xl font-extrabold mb-2" style={{ letterSpacing: '-0.02em' }}>Payment Required</h2>
            <p className="text-muted mb-8 font-medium">Total Amount: <span className="text-2xl text-primary-600 font-extrabold ml-1">₹{price.toFixed(2)}</span></p>

            <Button className="w-full text-lg py-4 rounded-xl font-bold shadow-md" onClick={handleCashfreePayment} disabled={isInitializingPayment} style={{ display: 'flex', justifyContent: 'center', background: 'var(--primary-gradient)' }}>
              {isInitializingPayment ? <><Loader size={22} className="animate-spin mr-2" /> Loading securely...</> : 'Pay Securely'}
            </Button>
          </Card>
        );
      case 4:
        return (
          <Card glass className="text-center animate-scale-in mt-4 py-10 border-none" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="success-circle" style={{ width: 100, height: 100, marginBottom: '2rem' }}>
              <CheckCircle size={56} style={{ color: 'var(--success-500)' }} />
            </div>
            <h2 className="text-3xl font-extrabold mb-3" style={{ letterSpacing: '-0.02em' }}>Payment Successful</h2>
            <p className="text-lg text-muted font-medium mb-2">Your document is now in the print queue.</p>
            <div className="inline-flex mt-6" style={{ background: 'var(--primary-50)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--primary-700)' }}>
                Please check the Kiosk screen
              </p>
            </div>
          </Card>
        );
      default: return null;
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}>
      {!isConnected && (
        <div className="animate-slide-up" style={{ position: 'fixed', top: '1rem', left: '1rem', right: '1rem', background: 'var(--warning-50)', border: '1px solid var(--warning-200)', color: 'var(--warning-700)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 100, boxShadow: 'var(--shadow-md)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning-500)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Connection interrupted. Reconnecting...</span>
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
