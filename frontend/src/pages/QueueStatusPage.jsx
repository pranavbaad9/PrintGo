import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader, Printer, CheckCircle } from 'lucide-react';

const QueueStatusPage = ({ jobData }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Waiting');
  const [eta, setEta] = useState(null);
  
  useEffect(() => {
    if (!jobData.jobId) {
      navigate('/');
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/jobs/${jobData.jobId}`);
        if (response.data.success) {
          const newStatus = response.data.job.status;
          setStatus(newStatus);
          
          if (response.data.job.eta) {
            setEta(response.data.job.eta);
          }
          
          if (newStatus === 'Completed' || newStatus === 'Cancelled') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Failed to fetch job status', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobData, navigate]);

  const formatEta = (seconds) => {
    if (!seconds) return 'calculating...';
    if (seconds < 60) return `${seconds} seconds`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };

  const getStatusContent = () => {
    switch (status) {
      case 'Waiting':
        return {
          icon: <Loader size={64} className="animate-spin text-warning-color mx-auto mb-4" />,
          title: "In Print Queue",
          desc: `Your document is waiting in the queue. Estimated wait time: ${formatEta(eta)}`
        };
      case 'Printing':
        return {
          icon: <Printer size={64} className="animate-pulse text-primary-color mx-auto mb-4" style={{ color: 'var(--primary-color)' }} />,
          title: "Printing Now",
          desc: `Your document is being printed. Estimated time remaining: ${formatEta(eta)}`
        };
      case 'Completed':
        return {
          icon: <CheckCircle size={64} className="text-success-color mx-auto mb-4" style={{ color: 'var(--success-color)' }} />,
          title: "Printing Completed!",
          desc: "Please collect your printed pages from the tray."
        };
      case 'Cancelled':
        return {
          icon: <CheckCircle size={64} className="text-error-color mx-auto mb-4" style={{ color: 'var(--error-color)' }} />,
          title: "Job Cancelled",
          desc: "This job was cancelled by the administrator."
        };
      default:
        return {
          icon: <Loader size={64} className="animate-spin text-warning-color mx-auto mb-4" />,
          title: "Processing...",
          desc: "Please wait."
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
      <div className="glass-panel text-center py-8">
        {content.icon}
        <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
        <p className="text-muted mb-6">{content.desc}</p>
        
        <div className="p-4 rounded-lg bg-black bg-opacity-5 inline-block text-left" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-muted mb-1">Job ID</p>
          <p className="font-bold text-lg mb-2">#{jobData.jobId}</p>
          
          <p className="text-sm text-muted mb-1">Document</p>
          <p className="font-bold truncate max-w-[200px]" title={jobData.file?.originalName}>
            {jobData.file?.originalName}
          </p>
        </div>

        {(status === 'Completed' || status === 'Cancelled') && (
          <div className="mt-8">
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Print Another Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueStatusPage;
