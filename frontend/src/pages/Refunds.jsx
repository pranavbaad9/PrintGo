import React from 'react';

const Refunds = () => {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel text-left">
        <h1 className="text-3xl font-bold mb-6">Refunds & Cancellations</h1>
        <p className="mb-4">At PrintGo, we strive to provide a seamless automated printing experience. Our refund and cancellation policies are outlined below.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">Cancellations</h3>
        <p className="mb-4">Because printing is an automated and immediate physical process, <strong>orders cannot be cancelled once payment is successful</strong> and the document enters the print queue.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">Refund Eligibility</h3>
        <p className="mb-2">Refunds will be provided under the following circumstances:</p>
        <ul className="mb-4" style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
          <li><strong>Hardware Failure:</strong> If the kiosk runs out of paper, experiences a paper jam, or loses power after payment but before your document is printed.</li>
          <li><strong>Payment Failure:</strong> If money is deducted from your account but the order is not created in our system (automatic refund within 3-5 business days).</li>
          <li><strong>Print Quality Issues:</strong> If the printer ink is smudged, unreadable, or defective.</li>
        </ul>
        
        <h3 className="text-xl font-bold mt-6 mb-2">How to Request a Refund</h3>
        <p className="mb-4">To request a refund for a failed print job, please email <strong>support@printgo.in</strong> within 48 hours of your transaction. Include your Order ID, Phone Number, and a brief description of the issue. Approved refunds will be credited back to the original payment method within 5-7 business days.</p>
      </div>
    </div>
  );
};

export default Refunds;
