/*
 * Microblink BlinkID in-browser scanning page for mobile
 */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const ScanLicense = () => {
  const [status, setStatus] = useState('init');

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('sessionId');
        if (!sessionId) {
          toast.error('Missing session');
          return;
        }
        setStatus('loading');

        // Load BlinkID SDK
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

        setStatus('ready');

        // NOTE: For brevity, we won't implement full camera UI here.
        // Instead, simulate a result structure after init (replace with real scan UI)
        // TODO: integrate BlinkID UI components or custom camera flow.
        const fakeResult = {
          licenseNumber: '',
          firstName: '',
          lastName: '',
          issuingState: '',
          issuingCountry: 'US',
          expirationDate: '',
          issueDate: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US',
        };

        // Replace this with actual scanning and populate fields
        // Post result to server
        await fetch(`/api/scan/session/${encodeURIComponent(sessionId)}/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fakeResult)
        });

        toast.success('Scan uploaded');
        setStatus('done');
      } catch (e) {
        console.error(e);
        toast.error('Scan failed');
        setStatus('error');
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">License Scan</h1>
        {status === 'init' && <p>Initializing...</p>}
        {status === 'loading' && <p>Loading scanner...</p>}
        {status === 'ready' && <p>Starting scanner...</p>}
        {status === 'done' && <p>Done. You can close this page.</p>}
        {status === 'error' && <p>There was an error. Please close and try again.</p>}
      </div>
    </div>
  );
};

export default ScanLicense;


