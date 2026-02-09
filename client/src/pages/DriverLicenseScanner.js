/*
 * Simple Photo Capture Scanner - Replaced BlinkID with basic camera functionality
 * Redirects to DriverLicensePhoto for simplified photo capture workflow
 */
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function DriverLicenseScanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Redirect to the simplified photo capture component
    const returnTo = searchParams.get('returnTo') || '/';
    const customerId = searchParams.get('customerId') || '';

    // Build redirect URL with parameters
    const redirectUrl = `/driver-license-photo?returnTo=${encodeURIComponent(returnTo)}${customerId ? `&customerId=${customerId}` : ''}`;

    navigate(redirectUrl, { replace: true });
  }, [navigate, searchParams]);

  // Show loading while redirecting
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px',
          margin: '0 auto 20px auto'
        }} />
        <p style={{ fontSize: '18px', margin: 0 }}>Loading camera...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default DriverLicenseScanner;