/*
 * Mobile-friendly page to scan Driver License on this device (no QR).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const MobileScan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('idle');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    const loadSdk = async () => {
      try {
        setStatus('loading');
        await new Promise((resolve, reject) => {
          if (window.BlinkIDSDK) return resolve();
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/dist/index.min.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load BlinkID'));
          document.body.appendChild(script);
        });

        const BlinkIDSDK = window.BlinkIDSDK;
        const ua = navigator.userAgent || navigator.vendor || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const isAndroid = /android/i.test(ua);
        const licenseKey = (
          (isIOS && process.env.REACT_APP_BLINKID_LICENSE_KEY_IOS) ||
          (isAndroid && process.env.REACT_APP_BLINKID_LICENSE_KEY_ANDROID) ||
          process.env.REACT_APP_BLINKID_LICENSE_KEY ||
          ''
        );
        if (!licenseKey) {
          toast.error('BlinkID license key missing');
          setStatus('error');
          return;
        }
        await BlinkIDSDK.loadWasmModule({
          licenseKey,
          engineLocation: 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/resources'
        });
        setSdkReady(true);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        toast.error('Failed to load scanner');
        setStatus('error');
      }
    };
    loadSdk();
  }, []);

  const handleFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!sdkReady) {
        toast.error('Scanner not ready');
        return;
      }
      setStatus('processing');
      // Placeholder mapping; replace with actual BlinkID processing for production
      const demoResult = {
        licenseNumber: '',
        issuingState: '',
        issuingCountry: 'US',
        sex: '',
        height: '',
        eyeColor: '',
        middleName: '',
        issueDate: '',
        expirationDate: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      };
      localStorage.setItem('scannedLicense', JSON.stringify(demoResult));
      toast.success('License data captured');
      // Navigate back to previous page or /book
      const from = (location.state && location.state.returnTo) || '/book';
      navigate(from, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error('Failed to process');
      setStatus('ready');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Scan Driver License</h1>
        {status === 'loading' && <p>Loading scanner...</p>}
        {status === 'error' && <p>Scanner failed to load. Check configuration.</p>}
        {status === 'ready' && (
          <div>
            <p className="mb-4">Use your phone camera to capture the license.</p>
            <input
              type="file"
              accept="image/*;capture=camera"
              onChange={handleFile}
              className="block w-full text-sm"
            />
          </div>
        )}
        {status === 'processing' && <p>Processing...</p>}
      </div>
    </div>
  );
};

export default MobileScan;


