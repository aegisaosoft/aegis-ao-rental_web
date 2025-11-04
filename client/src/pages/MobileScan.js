/*
 * Mobile-friendly page to scan Driver License on this device with BlinkID OCR recognition.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const MobileScan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('ready');
  const [capturedDataUrl, setCapturedDataUrl] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);
  const [blinkIdSdk, setBlinkIdSdk] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Debug logging function
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-9), logEntry]);
  };

  // Load BlinkID SDK in background (don't block camera access)
  useEffect(() => {
    const loadBlinkID = async () => {
      try {
        addDebugLog('Loading BlinkID SDK in background...');

        if (window.BlinkIDSDK) {
          addDebugLog('BlinkID SDK already loaded');
          setBlinkIdSdk(window.BlinkIDSDK);
          await initializeBlinkID(window.BlinkIDSDK);
          return;
        }

        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/dist/index.min.js';
          script.async = true;
          script.onload = () => {
            addDebugLog('BlinkID SDK script loaded');
            if (window.BlinkIDSDK) {
              setBlinkIdSdk(window.BlinkIDSDK);
              resolve();
            } else {
              reject(new Error('BlinkIDSDK not found on window object'));
            }
          };
          script.onerror = () => reject(new Error('Failed to load BlinkID SDK script'));
          document.body.appendChild(script);
        });

        await initializeBlinkID(window.BlinkIDSDK);
      } catch (err) {
        addDebugLog(`BlinkID load error: ${err.message}`);
        console.warn('BlinkID SDK not available, will use backend API for OCR:', err.message);
      }
    };

    loadBlinkID();
  }, []);

  // Initialize BlinkID with license key
  const initializeBlinkID = async (BlinkIDSDK) => {
    try {
      addDebugLog('Initializing BlinkID engine...');

      const ua = navigator.userAgent || navigator.vendor || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /android/i.test(ua);

      const lsWeb = localStorage.getItem('blinkid_license_key') || '';
      const lsIOS = localStorage.getItem('blinkid_license_key_ios') || '';
      const lsAndroid = localStorage.getItem('blinkid_license_key_android') || '';

      const licenseKey = (
        (isIOS && (lsIOS || process.env.REACT_APP_BLINKID_LICENSE_KEY_IOS)) ||
        (isAndroid && (lsAndroid || process.env.REACT_APP_BLINKID_LICENSE_KEY_ANDROID)) ||
        lsWeb || process.env.REACT_APP_BLINKID_LICENSE_KEY ||
        ''
      );

      if (!licenseKey) {
        addDebugLog('No BlinkID license key found - OCR will use fallback method');
        return;
      }

      await BlinkIDSDK.loadWasmModule({
        licenseKey,
        engineLocation: 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/resources'
      });

      addDebugLog('BlinkID engine initialized successfully');
    } catch (err) {
      addDebugLog(`BlinkID init error: ${err.message}`);
      console.warn('Advanced OCR not available. You can still capture and process images.');
    }
  };

  // Process image with BlinkID OCR
  const processImageWithBlinkID = async (imageBlob) => {
    if (!blinkIdSdk || !window.BlinkIDSDK) {
      addDebugLog('BlinkID SDK not available, using fallback');
      return null;
    }

    try {
      addDebugLog('Starting BlinkID OCR recognition...');
      const BlinkIDSDK = window.BlinkIDSDK;

      const { BlinkIdCombinedRecognizer } = BlinkIDSDK;
      const recognizer = await BlinkIdCombinedRecognizer.create();
      
      recognizer.returnFullDocumentImage = true;
      recognizer.returnFaceImage = false;

      const runner = await BlinkIDSDK.createRecognizerRunner(
        [recognizer],
        true
      );

      const imageData = await blobToImageData(imageBlob);

      const processResult = await runner.processImage(imageData);

      if (processResult !== BlinkIDSDK.RecognizerRunnerResultCode.Empty) {
        const results = await recognizer.getResult();
        
        if (results.state === BlinkIDSDK.RecognizerResultState.Valid) {
          addDebugLog('BlinkID recognition successful');
          
          const licenseData = {
            licenseNumber: results.licenseNumber || results.documentNumber || results.firstName || '',
            firstName: results.firstName || '',
            lastName: results.lastName || '',
            middleName: results.middleName || '',
            issuingState: results.driverLicenseDetailedInfo?.jurisdiction || 
                         results.address?.split(',')[1]?.trim() || 
                         results.state || '',
            issuingCountry: results.driverLicenseDetailedInfo?.jurisdiction || 
                           results.country || 'US',
            expirationDate: results.expiresOn ? formatDate(results.expiresOn) : 
                           (results.dateOfExpiry ? formatDate(results.dateOfExpiry) : ''),
            issueDate: results.dateOfIssue ? formatDate(results.dateOfIssue) : '',
            dateOfBirth: results.dateOfBirth ? formatDate(results.dateOfBirth) : '',
            address: results.address || results.street || '',
            city: results.city || '',
            state: results.state || '',
            postalCode: results.postalCode || results.zipCode || '',
            country: results.country || 'US',
            sex: results.sex || results.gender || '',
            height: results.height || '',
            eyeColor: results.eyeColor || '',
            restrictions: results.restrictions || '',
            endorsements: results.endorsements || '',
          };
          
          addDebugLog(`Extracted license data: ${licenseData.firstName} ${licenseData.lastName}, License: ${licenseData.licenseNumber}`);

          await runner.delete();
          await recognizer.delete();

          return licenseData;
        } else {
          addDebugLog(`BlinkID recognition state: ${results.state}`);
          await runner.delete();
          await recognizer.delete();
          return null;
        }
      } else {
        addDebugLog('BlinkID recognition returned empty result');
        await runner.delete();
        await recognizer.delete();
        return null;
      }
    } catch (err) {
      addDebugLog(`BlinkID OCR error: ${err.message}`);
      console.error('BlinkID OCR error:', err);
      return null;
    }
  };

  // Helper: Convert blob to ImageData
  const blobToImageData = async (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  // Helper: Format date
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date.toString();
  };

  const handleFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setStatus('processing');
      addDebugLog('Processing uploaded file...');
      
      const previewUrl = URL.createObjectURL(file);
      setCapturedDataUrl(previewUrl);

      // Always try BlinkID OCR first (if SDK is available)
      let licenseData = null;
      if (blinkIdSdk) {
        addDebugLog('Attempting BlinkID OCR recognition...');
        licenseData = await processImageWithBlinkID(file);
        if (licenseData) {
          addDebugLog('BlinkID OCR successful - data extracted');
        } else {
          addDebugLog('BlinkID OCR did not extract data, trying backend API...');
        }
      } else {
        addDebugLog('BlinkID SDK not available, using backend API...');
      }

      // If BlinkID failed or not available, send to backend API
      if (!licenseData) {
        addDebugLog('Using backend API for license validation...');
        const formData = new FormData();
        formData.append('file', file, 'license.jpg');
        const resp = await fetch('/api/license/validate', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('API validation failed');
        const payload = await resp.json();
        licenseData = payload.data;
      }

      // Save results
      if (licenseData) {
        localStorage.setItem('scannedLicense', JSON.stringify(licenseData));
        localStorage.setItem('scannedLicenseImage', previewUrl);
        const extractedData = licenseData.licenseNumber || licenseData.firstName || licenseData.lastName || 'Data extracted';
        toast.success(`License recognized: ${extractedData}`);
        addDebugLog(`License data saved: ${JSON.stringify(licenseData).substring(0, 100)}...`);
        setStatus('captured');
      } else {
        toast.warn('Could not extract license data. Please try again or enter manually.');
        addDebugLog('No license data extracted from image');
        setStatus('ready');
      }
    } catch (e) {
      console.error(e);
      addDebugLog(`Error processing file: ${e.message}`);
      toast.error('Failed to process license image');
      setStatus('ready');
    }
  };

  // Start native camera preview
  const startCamera = async () => {
    try {
      setStatus('loading');
      setError('');
      
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API not available');
      }
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not available');
      }
      if (!window.isSecureContext && location.protocol !== 'https:') {
        throw new Error('Camera requires HTTPS or localhost');
      }

      addDebugLog(`Starting camera with facingMode: ${facingMode}`);

      const variants = [
        { audio: false, video: { facingMode: { exact: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { audio: false, video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: { facingMode } },
        { audio: false, video: true }
      ];

      let stream = null;
      let lastErr = null;
      for (let i = 0; i < variants.length; i++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(variants[i]);
          if (stream) break;
        } catch (e) {
          lastErr = e;
        }
      }
      
      if (!stream) {
        throw lastErr || new Error('No camera stream available');
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        
        await new Promise((resolve) => {
          const onReady = () => {
            setVideoReady(true);
            resolve();
          };
          videoRef.current.addEventListener('loadedmetadata', onReady, { once: true });
          setTimeout(() => resolve(), 3000);
          videoRef.current.play().catch(() => {});
        });
      }
      
      setIsCameraActive(true);
      setError('');
      setStatus('camera');
      addDebugLog('Camera started successfully');
    } catch (err) {
      addDebugLog(`Camera start failed: ${err.message}`);
      setStatus('ready');
      setError(`Camera failed: ${err.message}`);
      toast.error(`Camera unavailable: ${err.message}. Try file capture instead.`);
    }
  };

  // Capture a frame and process with BlinkID
  const captureFrame = async () => {
    try {
      if (!videoRef.current) return;
      setStatus('processing');
      
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (!vw || !vh) {
        setStatus('camera');
        toast.error('Camera not ready. Please allow camera access and try again.');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) {
        setStatus('camera');
        toast.error('Failed to capture image. Try again.');
        return;
      }

      // Show preview
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedDataUrl(dataUrl);

      // Always try BlinkID OCR first (if SDK is available)
      let licenseData = null;
      if (blinkIdSdk) {
        addDebugLog('Attempting BlinkID OCR recognition on captured image...');
        licenseData = await processImageWithBlinkID(blob);
        if (licenseData) {
          addDebugLog('BlinkID OCR successful - data extracted from captured image');
        } else {
          addDebugLog('BlinkID OCR did not extract data, trying backend API...');
        }
      } else {
        addDebugLog('BlinkID SDK not available, using backend API...');
      }

      // Fallback to backend API if BlinkID failed or not available
      if (!licenseData) {
        addDebugLog('Using backend API for license validation...');
        const formData = new FormData();
        formData.append('file', blob, 'license.jpg');
        const resp = await fetch('/api/license/validate', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('API validation failed');
        const payload = await resp.json();
        licenseData = payload.data;
      }

      stopCamera();

      if (licenseData) {
        localStorage.setItem('scannedLicense', JSON.stringify(licenseData));
        localStorage.setItem('scannedLicenseImage', dataUrl);
        const extractedData = licenseData.licenseNumber || licenseData.firstName || licenseData.lastName || 'Data extracted';
        toast.success(`License recognized: ${extractedData}`);
        setStatus('captured');
      } else {
        toast.warn('Could not extract license data. Please try again.');
        setStatus('ready');
      }
    } catch (e) {
      console.error(e);
      setStatus('camera');
      toast.error('Failed to process license');
    }
  };

  const stopCamera = () => {
    try {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setVideoReady(false);
      setIsCameraActive(false);
    } catch {}
  };

  useEffect(() => () => stopCamera(), []);

  const switchCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (isCameraActive) {
      stopCamera();
      await startCamera();
    }
  };

  const getReturnTo = () => {
    const urlParam = searchParams.get('returnTo');
    const stateValue = location.state && location.state.returnTo;
    return urlParam || stateValue || '/book';
  };

  const continueWithoutCapture = () => {
    stopCamera();
    navigate(getReturnTo(), { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Scan Driver License</h1>
        {status === 'ready' && (
          <div>
            <p className="mb-4">Use your phone camera to capture the license.</p>
            {blinkIdSdk && (
              <p className="text-sm text-green-600 mb-2">✓ OCR recognition enabled</p>
            )}
            {!blinkIdSdk && (
              <p className="text-sm text-yellow-600 mb-2">⚠ OCR loading... camera ready</p>
            )}
            <div className="text-xs text-gray-500 mb-3 space-y-1">
              <p>Secure: {window.isSecureContext ? 'Yes' : 'No'}</p>
              <p>Protocol: {location.protocol}</p>
              <p>MediaDevices: {navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'Yes' : 'No'}</p>
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-3 text-sm">
                {error}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="block w-full text-sm mb-3"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={continueWithoutCapture} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">
                Continue
              </button>
            </div>
          </div>
        )}
        {status === 'camera' && (
          <div className="relative">
            {error && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600/80 text-white px-4 py-2 rounded z-10 text-sm">
                {error}
              </div>
            )}
            <video ref={videoRef} playsInline autoPlay muted className="w-full rounded mb-3 object-cover" />
            <div className="flex items-center justify-around gap-3 py-3 bg-black/50 rounded">
              <button onClick={switchCamera} className="w-12 h-12 rounded-full border-2 border-white text-white text-xl">↺</button>
              <button onClick={captureFrame} disabled={!videoReady} className={`w-16 h-16 rounded-full ${videoReady ? 'bg-white border-4 border-white/50' : 'bg-gray-300 border-4 border-gray-300/50'}`} />
              <button onClick={stopCamera} className="w-12 h-12 rounded-full border-2 border-white text-white text-xl">✕</button>
            </div>
          </div>
        )}
        {status === 'processing' && (
          <div>
            <p className="text-lg font-semibold mb-2">Processing license image...</p>
            <p className="text-sm text-gray-600 mb-4">Extracting information with OCR...</p>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mt-4"></div>
            {debugLogs.length > 0 && (
              <div className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded mb-3 text-xs max-h-32 overflow-y-auto mt-3">
                <div className="font-semibold mb-1">Debug Logs:</div>
                {debugLogs.map((log, i) => (
                  <div key={i} className="font-mono text-xs">{log}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {status === 'captured' && (
          <div>
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="Captured license" className="w-full rounded mb-3" />
            ) : null}
            <div className="flex gap-2">
              <button onClick={() => { setStatus('ready'); setCapturedDataUrl(''); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">Retake</button>
              <button onClick={() => { navigate(getReturnTo(), { replace: true }); }} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">Use Photo</button>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div>
            <p className="text-red-600 mb-4">Camera initialization failed. You can still upload an image.</p>
            <button onClick={startCamera} className="bg-blue-600 text-white px-4 py-2 rounded-md mb-2">Try Camera Again</button>
            <button onClick={() => setStatus('ready')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">Upload Image Instead</button>
          </div>
        )}
        {debugLogs.length > 0 && status !== 'processing' && status !== 'ready' && (
          <div className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded mb-3 text-xs max-h-32 overflow-y-auto mt-3">
            <div className="font-semibold mb-1">Debug Logs:</div>
            {debugLogs.map((log, i) => (
              <div key={i} className="font-mono text-xs">{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileScan;
