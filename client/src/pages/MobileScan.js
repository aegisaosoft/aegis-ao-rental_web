/*
 * Mobile-friendly page to scan Driver License on this device (no QR).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const MobileScan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('ready');
  const [capturedDataUrl, setCapturedDataUrl] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Debug logging function
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
  };

  const handleFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setStatus('processing');
      // Show a quick preview
      const previewUrl = URL.createObjectURL(file);
      setCapturedDataUrl(previewUrl);

      // Send to API for validation
      const formData = new FormData();
      formData.append('file', file, 'license.jpg');
      const resp = await fetch('/api/license/validate', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('API validation failed');
      const payload = await resp.json();
      if (payload && payload.data) {
        localStorage.setItem('scannedLicense', JSON.stringify(payload.data));
        console.log('License data saved:', payload.data);
      }
      localStorage.setItem('scannedLicenseImage', previewUrl);
      toast.success(`License validated: ${payload.data?.licenseNumber || 'Sample data'}`);
      setStatus('captured');
    } catch (e) {
      console.error(e);
      toast.error('Failed to process');
      setStatus('ready');
    }
  };

  // Start native camera preview (no SDK)
  const startCamera = async () => {
    try {
      setStatus('loading');
      setError('');
      
      // Check basic requirements
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
      addDebugLog(`Secure context: ${window.isSecureContext}`);
      addDebugLog(`Protocol: ${location.protocol}`);

      // Try multiple constraint variants for better compatibility (iOS/Android)
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
          addDebugLog(`Trying constraint variant ${i + 1}`);
          // eslint-disable-next-line no-await-in-loop
          stream = await navigator.mediaDevices.getUserMedia(variants[i]);
          addDebugLog('Stream obtained successfully');
          if (stream) break;
        } catch (e) {
          addDebugLog(`Variant ${i + 1} failed: ${e.name} - ${e.message}`);
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
        
        // Wait for metadata to ensure videoWidth/Height are known
        await new Promise((resolve) => {
          const onReady = () => {
            addDebugLog(`Video metadata loaded: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            setVideoReady(true);
            resolve();
          };
          videoRef.current.addEventListener('loadedmetadata', onReady, { once: true });
          // Fallback timeout in case event doesn't fire
          setTimeout(() => {
            addDebugLog('Video metadata timeout, proceeding anyway');
            resolve();
          }, 3000);
          
          videoRef.current.play().then(() => {
            addDebugLog('Video play started');
          }).catch((playErr) => {
            addDebugLog(`Video play failed: ${playErr.message}`);
          });
        });
      }
      
      setIsCameraActive(true);
      setError('');
      setStatus('camera');
      addDebugLog('Camera started successfully');
    } catch (err) {
      addDebugLog(`Camera start failed: ${err.message || err.name || 'Unknown error'}`);
      setStatus('ready');
      const errorMsg = err.message || err.name || 'Unknown error';
      setError(`Camera failed: ${errorMsg}`);
      toast.error(`Camera unavailable: ${errorMsg}. Try file capture instead.`);
    }
  };

  // Capture a frame from the video and send to API for validation
  const captureFrame = async () => {
    try {
      if (!videoRef.current) return;
      setStatus('processing');
      // Ensure camera is actually producing frames
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
      // Convert to Blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) {
        setStatus('camera');
        toast.error('Failed to capture image. Try again.');
        return;
      }

      // Send to API
      const formData = new FormData();
      formData.append('file', blob, 'license.jpg');
      const resp = await fetch('/api/license/validate', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('API validation failed');
      const payload = await resp.json();

      // Save results
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedDataUrl(dataUrl);
      localStorage.setItem('scannedLicenseImage', dataUrl);
      if (payload && payload.data) {
        localStorage.setItem('scannedLicense', JSON.stringify(payload.data));
        console.log('License data saved:', payload.data);
      }
      stopCamera();
      toast.success(`License validated: ${payload.data?.licenseNumber || 'Sample data'}`);
      setStatus('captured');
    } catch (e) {
      console.error(e);
      setStatus('camera');
      toast.error('Failed to capture');
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

  const continueWithoutCapture = () => {
    stopCamera();
    const from = (location.state && location.state.returnTo) || '/book';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Scan Driver License</h1>
        {(status === 'loading') && <p>Loading...</p>}
        {status === 'ready' && (
          <div>
            <p className="mb-4">Use your phone camera to capture the license.</p>
            <div className="text-xs text-gray-500 mb-3 space-y-1">
              <p>Secure: {window.isSecureContext ? 'Yes' : 'No'}</p>
              <p>Protocol: {location.protocol}</p>
              <p>MediaDevices: {navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'Yes' : 'No'}</p>
              <p>User Agent: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-3 text-sm">
                {error}
              </div>
            )}
            {debugLogs.length > 0 && (
              <div className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded mb-3 text-xs max-h-32 overflow-y-auto">
                <div className="font-semibold mb-1">Debug Logs:</div>
                {debugLogs.map((log, i) => (
                  <div key={i} className="font-mono text-xs">{log}</div>
                ))}
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
              <button onClick={startCamera} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">
                Open Camera
              </button>
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
        {status === 'captured' && (
          <div>
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="Captured license" className="w-full rounded mb-3" />
            ) : null}
            <div className="flex gap-2">
              <button onClick={() => { setStatus('ready'); setCapturedDataUrl(''); }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">Retake</button>
              <button onClick={() => { const from = (location.state && location.state.returnTo) || '/book'; navigate(from, { replace: true }); }} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">Use Photo</button>
            </div>
          </div>
        )}
        {status === 'processing' && <p>Processing...</p>}
      </div>
    </div>
  );
};

export default MobileScan;


