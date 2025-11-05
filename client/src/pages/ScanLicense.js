/*
 * Microblink BlinkID in-browser scanning page for mobile
 */
import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';

const ScanLicense = () => {
  const [status, setStatus] = useState('init');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const BlinkIDSDKRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Initialize BlinkID SDK
  useEffect(() => {
    const initBlinkID = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('sessionId');
        if (!sessionId) {
          toast.error('Missing session');
          setError('Missing session ID');
          setStatus('error');
          return;
        }
        sessionIdRef.current = sessionId;
        setStatus('loading');

        // Load BlinkID SDK
        if (!window.BlinkIDSDK) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/dist/index.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load BlinkID SDK'));
            document.body.appendChild(script);
          });
        }

        const BlinkIDSDK = window.BlinkIDSDK;
        BlinkIDSDKRef.current = BlinkIDSDK;

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
          setError('BlinkID license key missing');
          setStatus('error');
          return;
        }

        await BlinkIDSDK.loadWasmModule({
          licenseKey,
          engineLocation: 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/resources'
        });

        setStatus('ready');
      } catch (e) {
        console.error('BlinkID initialization error:', e);
        toast.error('Failed to initialize scanner');
        setError(e.message || 'Initialization failed');
        setStatus('error');
      }
    };

    initBlinkID();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera. Please allow camera permissions.');
      setError('Camera access denied');
      setScanning(false);
      setStatus('error');
    }
  };

  // Capture and process image
  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || !BlinkIDSDKRef.current) {
      return;
    }

    try {
      setScanning(false);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      
      // Convert blob to base64 for BlinkID
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setStatus('processing');
      toast.info('Processing license image...');

      // Create BlinkID recognizer
      const { RecognizerRunner, WASM_SDK } = BlinkIDSDKRef.current;
      const recognizerRunner = await RecognizerRunner.create(WASM_SDK, true);
      
      // Create USDL recognizer
      const { USDLRecognizer } = BlinkIDSDKRef.current;
      const usdlRecognizer = new USDLRecognizer();
      await recognizerRunner.recognize(usdlRecognizer, base64Image);

      const result = usdlRecognizer.result;
      
      // Format the result
      const formattedResult = {
        licenseNumber: result.licenseNumber || '',
        firstName: result.firstName || '',
        lastName: result.lastName || '',
        issuingState: result.issuingState || '',
        issuingCountry: result.issuingCountry || 'US',
        expirationDate: result.expirationDate ? new Date(result.expirationDate).toISOString().split('T')[0] : '',
        issueDate: result.dateOfIssue ? new Date(result.dateOfIssue).toISOString().split('T')[0] : '',
        address: result.address || '',
        city: result.city || '',
        state: result.state || '',
        postalCode: result.postalCode || '',
        country: result.country || 'US',
        dateOfBirth: result.dateOfBirth ? new Date(result.dateOfBirth).toISOString().split('T')[0] : '',
      };

      // Clean up recognizer
      usdlRecognizer.delete();
      await recognizerRunner.delete();

      // Post result to server
      const response = await fetch(`/api/scan/session/${encodeURIComponent(sessionIdRef.current)}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedResult)
      });

      if (!response.ok) {
        throw new Error('Failed to upload scan result');
      }

      toast.success('License scanned successfully!');
      setStatus('done');
    } catch (err) {
      console.error('Processing error:', err);
      toast.error('Failed to process license. Please try again.');
      setError(err.message || 'Processing failed');
      setStatus('error');
      // Reset to allow retry
      setTimeout(() => {
        setStatus('ready');
        setError('');
      }, 2000);
    }
  };

  // Cancel scanning
  const cancelScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setStatus('ready');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">Driver License Scan</h1>

          {status === 'init' && (
            <div className="text-center">
              <p className="mb-4">Initializing scanner...</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="mb-4">Loading BlinkID SDK...</p>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          )}

          {status === 'ready' && !scanning && (
            <div className="space-y-4">
              <p className="text-center mb-4">Click to start camera and scan your license</p>
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                Start Camera
              </button>
            </div>
          )}

          {status === 'ready' && scanning && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-4 border-blue-500 rounded-lg" style={{ width: '80%', height: '60%' }}>
                    <div className="absolute top-2 left-2 text-xs text-blue-400">Align license here</div>
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  onClick={captureAndProcess}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Capture & Scan
                </button>
                <button
                  onClick={cancelScan}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center">
              <p className="mb-4">Processing license image...</p>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center">
              <p className="text-green-400 mb-4">✓ License scanned successfully!</p>
              <p className="text-sm text-gray-400">You can close this page.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-red-400 mb-4">{error || 'An error occurred'}</p>
              {status === 'error' && (
                <button
                  onClick={() => {
                    setStatus('ready');
                    setError('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanLicense;


