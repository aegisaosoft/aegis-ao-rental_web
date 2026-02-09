/*
 * Simple Photo Capture Scanner - Replaced BlinkID with basic camera functionality
 * Redirects to DriverLicensePhoto for simplified photo capture workflow
 */
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ScanLicenseNative = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Redirect to the simplified photo capture component
    const returnTo = searchParams.get('returnTo') || '/';
    const customerId = searchParams.get('customerId') || searchParams.get('userId') || '';

    // Build redirect URL with parameters
    const redirectUrl = `/driver-license-photo?returnTo=${encodeURIComponent(returnTo)}${customerId ? `&customerId=${customerId}` : ''}`;

    navigate(redirectUrl, { replace: true });
  }, [navigate, searchParams]);

  // Show loading while redirecting
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-400 mx-auto mb-6"></div>
        <p className="text-xl">Loading camera...</p>
      </div>
    </div>
  );
};

export default ScanLicenseNative;