import React from 'react';

const Terms = () => {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel text-left">
        <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
        <p className="mb-4">Welcome to PrintGo. By using our automated printing kiosks and services, you agree to comply with and be bound by the following terms and conditions.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">1. Use of Service</h3>
        <p className="mb-4">The PrintGo kiosk is provided for lawful personal and business printing needs. You agree not to print any illegal, explicit, or copyrighted materials for which you do not have permission.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">2. Document Privacy</h3>
        <p className="mb-4">We take your privacy seriously. Documents uploaded to our servers are encrypted and automatically deleted immediately after printing is completed or cancelled. We do not store or read the contents of your files.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">3. User Responsibility</h3>
        <p className="mb-4">It is your responsibility to ensure you have selected the correct document and print settings (color, duplex, copies) before completing the payment.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">4. Service Availability</h3>
        <p className="mb-4">While we strive for 100% uptime, PrintGo is not liable for temporary kiosk downtime due to internet outages, paper jams, or hardware maintenance.</p>
      </div>
    </div>
  );
};

export default Terms;
