import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Settings, FileText, ArrowRight, Lightbulb, MessageSquare } from 'lucide-react';

const SettingsPage = ({ jobData, setJobData }) => {
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState({
    color: 'bw',
    duplex: 'single',
    copies: 1,
    paperSize: 'a4',
    pageRangeType: 'all',
    customRange: '',
    pagesToPrint: 1,
    notifyWhatsApp: false,
    phoneNumber: ''
  });
  
  const [price, setPrice] = useState(0);
  const [recommendation, setRecommendation] = useState(null);

  // Helper to parse custom page ranges like "1-3, 5"
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

  useEffect(() => {
    if (!jobData.file) {
      navigate('/');
      return;
    }
    
    // AI Recommendations / Cost Optimizer
    const filename = jobData.file.originalName.toLowerCase();
    if (filename.includes('resume') && settings.color === 'bw') {
      setRecommendation("💡 Tip: Resumes look more professional in Color!");
    } else if (settings.duplex === 'single' && jobData.file.pages > 3) {
      setRecommendation(`💡 Save ₹${Math.floor(jobData.file.pages/2)} by switching to Double Sided!`);
    } else {
      setRecommendation(null);
    }

    // Calculate pages to print
    const totalPages = jobData.file.pages || 1;
    const pagesToPrint = settings.pageRangeType === 'custom' 
      ? calculateCustomPages(settings.customRange, totalPages)
      : totalPages;
    
    // Calculate price
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
    
    setSettings(prev => ({ ...prev, pagesToPrint }));
    setPrice(calculatedPrice);
  }, [settings.color, settings.duplex, settings.copies, settings.pageRangeType, settings.customRange, jobData.file, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'copies' ? parseInt(value) : value)
    }));
  };

  const handleProceed = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/jobs', {
        file: jobData.file,
        settings,
        price
      });
      
      if (response.data.success) {
        setJobData(prev => ({
          ...prev,
          jobId: response.data.job.id,
          settings,
          price
        }));
        navigate('/payment');
      }
    } catch (err) {
      console.error('Failed to create job', err);
      alert('Failed to proceed. Please check backend connection.');
    }
  };

  if (!jobData.file) return null;

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '800px' }}>
      
      {recommendation && (
        <div className="mb-6 p-4 rounded-xl flex align-center gap-3 shadow-sm" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <Lightbulb size={24} />
          <p className="font-bold">{recommendation}</p>
        </div>
      )}

      <div className="grid-2">
        {/* Document Info */}
        <div className="glass-panel">
          <div className="flex align-center gap-2 mb-4">
            <FileText style={{ color: 'var(--primary-color)' }} />
            <h2 className="text-xl font-bold">Document Info</h2>
          </div>
          
          <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <p className="text-muted text-sm mb-1">File Name</p>
            <p className="font-bold truncate" title={jobData.file.originalName}>{jobData.file.originalName}</p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)' }}>
              <p className="text-muted text-sm mb-1">Pages Detected</p>
              <p className="font-bold text-xl">{jobData.file.pages}</p>
            </div>
            <div className="flex-1 p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.05)' }}>
              <p className="text-muted text-sm mb-1">Size</p>
              <p className="font-bold text-xl">{(jobData.file.size / (1024 * 1024)).toFixed(2)} <span className="text-sm font-normal">MB</span></p>
            </div>
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div className="flex align-center gap-2 mb-2">
              <MessageSquare size={18} style={{ color: 'var(--success-color)' }} />
              <label className="font-bold text-sm">WhatsApp Notification (Mock)</label>
            </div>
            <div className="flex align-center gap-2 mb-2">
              <input type="checkbox" name="notifyWhatsApp" checked={settings.notifyWhatsApp} onChange={handleChange} id="notify" />
              <label htmlFor="notify" className="text-sm cursor-pointer">Notify me when printing is complete</label>
            </div>
            {settings.notifyWhatsApp && (
              <input type="text" name="phoneNumber" placeholder="Enter phone number" className="form-input text-sm mt-2" value={settings.phoneNumber} onChange={handleChange} />
            )}
          </div>
        </div>

        {/* Print Settings */}
        <div className="glass-panel">
          <div className="flex align-center gap-2 mb-4">
            <Settings style={{ color: 'var(--primary-color)' }} />
            <h2 className="text-xl font-bold">Print Settings</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Page Range</label>
            <select name="pageRangeType" className="form-select mb-2" value={settings.pageRangeType} onChange={handleChange}>
              <option value="all">All Pages ({jobData.file.pages})</option>
              <option value="custom">Custom Range</option>
            </select>
            {settings.pageRangeType === 'custom' && (
              <input type="text" name="customRange" placeholder="e.g. 1-3, 5" className="form-input" value={settings.customRange} onChange={handleChange} />
            )}
            <p className="text-xs text-muted mt-1">Pages to print: {settings.pagesToPrint}</p>
          </div>
          
          <div className="form-group">
            <label className="form-label">Color Mode</label>
            <select name="color" className="form-select" value={settings.color} onChange={handleChange}>
              <option value="bw">Black & White (₹2/page, ₹3/double-side)</option>
              <option value="color">Color (₹10/page)</option>
            </select>
          </div>
          
          <div className="flex gap-4">
            <div className="form-group flex-1">
              <label className="form-label">Sides</label>
              <select name="duplex" className="form-select" value={settings.duplex} onChange={handleChange}>
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
                onChange={handleChange} 
              />
            </div>
          </div>
          
          <div className="mt-4 p-4 rounded-lg flex justify-between align-center" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
            <div>
              <p className="text-sm opacity-80">Total Amount</p>
              <p className="text-3xl font-bold">₹{price}</p>
            </div>
            <button className="btn" style={{ background: 'white', color: 'var(--primary-color)', border: 'none' }} onClick={handleProceed}>
              Pay Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
