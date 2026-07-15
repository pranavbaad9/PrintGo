import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Clock } from 'lucide-react';

const PaymentPage = ({ jobData }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!jobData.jobId) {
      navigate('/');
    }
  }, [jobData, navigate]);

  const handlePaymentSimulation = async () => {
    setIsProcessing(true);
    
    // Simulate some network delay
    setTimeout(async () => {
      try {
        const response = await axios.post(`http://localhost:5000/api/jobs/${jobData.jobId}/pay`);
        if (response.data.success) {
          navigate('/status');
        }
      } catch (err) {
        console.error('Payment failed', err);
        alert('Payment processing failed. Please try again.');
        setIsProcessing(false);
      }
    }, 1500);
  };

  if (!jobData.jobId) return null;

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
      <div className="glass-panel text-center">
        <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
        <p className="text-muted mb-4">Scan the QR code with any UPI app</p>
        
        <div className="p-8 bg-white rounded-xl inline-block mb-4 shadow-lg">
          {/* Mock QR Code */}
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=printgo@upi&pn=PrintGo&am=${jobData.price}&cu=INR`} 
            alt="UPI QR Code" 
            style={{ width: '200px', height: '200px' }}
          />
        </div>
        
        <div className="mb-6">
          <p className="text-3xl font-bold gradient-text">₹{jobData.price}</p>
          <p className="text-muted">Job ID: #{jobData.jobId}</p>
        </div>

        {isProcessing ? (
          <div className="flex align-center justify-center gap-2 text-warning-color">
            <Clock className="animate-spin" />
            <span>Processing Payment...</span>
          </div>
        ) : (
          <button className="btn btn-primary w-full" style={{ width: '100%' }} onClick={handlePaymentSimulation}>
            <CheckCircle size={20} /> Simulate Successful Payment
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
