import React from 'react';

const ContactUs = () => {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel text-left">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="mb-4">We are here to help! If you have any issues with your print job or payment, please reach out to us using the contact details below.</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">Customer Support</h3>
        <p><strong>Email:</strong> support@printgo.in</p>
        <p><strong>Phone:</strong> +91 9876543210 (Mon-Sat, 9 AM - 6 PM)</p>
        
        <h3 className="text-xl font-bold mt-6 mb-2">Office Address</h3>
        <p>PrintGo Technologies<br/>
        123 Innovation Drive, Sector 5<br/>
        Mumbai, Maharashtra 400001<br/>
        India</p>
      </div>
    </div>
  );
};

export default ContactUs;
