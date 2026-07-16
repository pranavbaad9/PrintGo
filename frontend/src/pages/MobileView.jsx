import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Upload, Settings, CheckCircle, Smartphone } from 'lucide-react';

const MobileView = () => {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Settings, 3: Success
  const [fileData, setFileData] = useState(null);
  const [jobId, setJobId] = useState(null);
  
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
    const newSocket = io(`https://printgo-ssoi.onrender.com`);
    setSocket(newSocket);

    newSocket.emit('join_session', sessionId);
    newSocket.emit('mobile_connected', sessionId);
    
    newSocket.on('kiosk_payment_success', ({ jobId }) => {
      setJobId(jobId);
      setStep(3); // Move to success
    });
    
    newSocket.on('job_status_changed', (job) => {
      if ((job.status === 'Waiting' || job.status === 'Printing' || job.status === 'Completed') && step !== 4) {
        setStep(4);
      }
    });

    return () => newSocket.close();
  }, [sessionId]);

  // Price Calculation Logic
  useEffect(() => {
    if(!fileData) return;
    
    const calculateCustomPages = (rangeStr, totalPages) => {
      if (!rangeStr.trim()) return totalPages;
      const parts = rangeStr.split(',');
      let count = 0;
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end) && start <= end && start > 0) {
            count += (Math.min(end, totalPages) - start + 1);
          }
        } else {
          const num = parseInt(part.trim());
          if (!isNaN(num) && num > 0 && num <= totalPages) {
            count += 1;
          }
        }
      }
      return count > 0 ? count : totalPages;
    };

    const totalPages = fileData.pages || 1;
    const pagesToPrint = settings.pageRangeType === 'custom' 
      ? calculateCustomPages(settings.customRange, totalPages)
      : totalPages;
      
    let calculatedPrice = 0;
    if (settings.color === 'color') {
      calculatedPrice = pagesToPrint * settings.copies * 10;
    } else {
      if (settings.duplex === 'double') {
        const sheets = Math.ceil(pagesToPrint / 2);
        calculatedPrice = sheets * settings.copies * 3;
      } else {
        calculatedPrice = pagesToPrint * settings.copies * 2;
      }
    }
    
    if (settings.pagesToPrint !== pagesToPrint) {
      setSettings(prev => ({ ...prev, pagesToPrint }));
    }
    
    setPrice(calculatedPrice);

    // Sync settings to Kiosk
    if(socket) {
      socket.emit('settings_updated', { sessionId, settingsData: { ...settings, pagesToPrint }, price: calculatedPrice });
    }
  }, [settings.color, settings.duplex, settings.copies, settings.pageRangeType, settings.customRange, fileData, socket]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("File is too large! Maximum 25MB.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`https://printgo-ssoi.onrender.com/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        const data = response.data.file;
        setFileData(data);
        socket.emit('file_uploaded', { sessionId, fileData: data });
        setStep(2); // Go to settings
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
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
      const res = await axios.post(`https://printgo-ssoi.onrender.com/api/jobs`, {
        file: fileData,
        settings,
        price
      });
      if (res.data.success) {
        setJobId(res.data.job.id);
        socket.emit('payment_initiated', { sessionId, price, jobId: res.data.job.id });
        setStep(3); // Payment required
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadCashfree = () => {
    return new Promise((resolve) => {
      if (window.Cashfree) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCashfreePayment = async () => {
    const res = await loadCashfree();
    if (!res) {
      alert('Cashfree SDK failed to load. Are you online?');
      return;
    }

    try {
      const orderRes = await axios.post(`https://printgo-ssoi.onrender.com/api/jobs/${jobId}/cashfree/order`);
      if (!orderRes.data.success) return;

      const { paymentSessionId, orderId } = orderRes.data;
      const cashfree = window.Cashfree({
        mode: "production",
      });

      let checkoutOptions = {
        paymentSessionId: paymentSessionId,
        redirectTarget: "_modal",
      };

      cashfree.checkout(checkoutOptions).then(async (result) => {
        if(result.error){
            console.log("Cashfree checkout error:", result.error);
            alert("Payment failed or cancelled.");
        }
        if(result.paymentDetails){
            console.log("Payment completed, verifying...", result.paymentDetails);
            try {
              await axios.post(`https://printgo-ssoi.onrender.com/api/jobs/${jobId}/cashfree/verify`, {
                order_id: orderId
              });
              // Socket job_status_changed handles UI step update
            } catch (err) {
              alert('Payment verification failed.');
            }
        }
      });

    } catch (err) {
      console.error("Payment init error:", err);
      alert('Failed to initialize Cashfree');
    }
  };

  const handleSimulatePayment = async () => {
    try {
      await axios.post(`https://printgo-ssoi.onrender.com/api/jobs/${jobId}/pay`);
      socket.emit('payment_success', { sessionId, jobId });
      setStep(4);
    } catch (err) {
      console.error(err);
    }
  };

  if (step === 1) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="glass-panel text-center">
          <Smartphone size={48} className="mx-auto mb-4 text-primary-color" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-2xl font-bold mb-4">Upload Document</h2>
          <p className="text-muted mb-6">Select a file from your phone to print.</p>
          
          <label className="btn btn-primary" style={{ display: 'inline-block', cursor: 'pointer' }}>
            Choose File (Max 25MB)
            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" />
          </label>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="glass-panel">
          <div className="flex align-center gap-2 mb-4">
            <Settings style={{ color: 'var(--primary-color)' }} />
            <h2 className="text-xl font-bold">Print Settings</h2>
          </div>
          
          <div className="form-group">
            <label className="form-label">Color Mode</label>
            <select name="color" className="form-select" value={settings.color} onChange={handleSettingsChange}>
              <option value="bw">Black & White (₹2/side, ₹3/sheet)</option>
              <option value="color">Color (₹10/side)</option>
            </select>
          </div>
          
          <div className="flex gap-4">
            <div className="form-group flex-1">
              <label className="form-label">Sides</label>
              <select name="duplex" className="form-select" value={settings.duplex} onChange={handleSettingsChange}>
                <option value="single">Single Sided</option>
                <option value="double">Double Sided</option>
              </select>
            </div>
            
            <div className="form-group flex-1">
              <label className="form-label">Copies</label>
              <input 
                type="number" 
                name="copies" 
                className="form-input" 
                min="1" 
                max="100" 
                value={settings.copies} 
                onChange={handleSettingsChange} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Page Range</label>
            <select name="pageRangeType" className="form-select mb-2" value={settings.pageRangeType} onChange={handleSettingsChange}>
              <option value="all">All Pages ({fileData.pages})</option>
              <option value="custom">Custom Range</option>
            </select>
            {settings.pageRangeType === 'custom' && (
              <input type="text" name="customRange" placeholder="e.g. 1-3, 5" className="form-input" value={settings.customRange} onChange={handleSettingsChange} />
            )}
          </div>
          
          <div className="mt-4 p-4 rounded-lg text-center" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
            <p className="text-sm opacity-80 mb-1">Total Amount</p>
            <p className="text-4xl font-bold mb-4">₹{price}</p>
            <button className="btn w-full" style={{ background: 'white', color: 'var(--primary-color)', border: 'none' }} onClick={handlePrintSettingsSubmit}>
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="glass-panel text-center py-8">
          <Smartphone size={64} className="mx-auto mb-4 text-warning-color" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-2xl font-bold mb-2">Payment Required</h2>
          <p className="text-muted mb-6">Total cost is <b>₹{price}</b>.</p>
          
          <button 
            className="btn btn-primary w-full mt-4 flex align-center justify-center gap-2" 
            onClick={handleCashfreePayment}
            style={{ fontSize: '1.2rem', padding: '1rem' }}
          >
            Pay Securely with Cashfree
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="glass-panel text-center py-8">
          <CheckCircle size={64} className="mx-auto mb-4" style={{ color: 'var(--success-color)' }} />
          <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
          <p className="text-muted">Your document is now in the print queue.</p>
          <p className="font-bold mt-4">Please look at the Kiosk screen for status.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default MobileView;
