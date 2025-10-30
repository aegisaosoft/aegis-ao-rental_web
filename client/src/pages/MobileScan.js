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
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('ready');
        toast.error('Camera API unavailable. Ensure HTTPS and browser permissions.');
        return;
      }
      // Try multiple constraint variants for better compatibility (iOS/Android)
      const variants = [
        { audio: false, video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: { facingMode: 'environment' } },
        { audio: false, video: true }
      ];

      let stream = null;
      let lastErr = null;
      for (const v of variants) {
        try {
          // eslint-disable-next-line no-await-in-loop
          stream = await navigator.mediaDevices.getUserMedia(v);
          if (stream) break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!stream) {
        setStatus('ready');
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
            setVideoReady(true);
            resolve();
          };
          videoRef.current.addEventListener('loadedmetadata', onReady, { once: true });
          // Fallback timeout in case event doesn't fire
          setTimeout(() => resolve(), 1500);
          videoRef.current.play().catch(() => {});
        });
      }
      setStatus('camera');
    } catch (err) {
      console.error(err);
      setStatus('ready');
      // Fall back to file input
      const reason = err && (err.name || err.message) ? ` (${err.name || err.message})` : '';
      toast.error(`Camera unavailable${reason}. You can use file capture.`);
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
    } catch {}
  };

  useEffect(() => () => stopCamera(), []);

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
            <div className="text-xs text-gray-500 mb-3">
              <p>Secure: {window.isSecureContext ? 'Yes' : 'No'} • MediaDevices: {navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 'Yes' : 'No'}</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="block w-full text-sm"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={startCamera} className="flex-1 bg-blue-600 text-white py-2 rounded-md font-semibold">
                Capture
              </button>
              <button onClick={continueWithoutCapture} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">
                Continue
              </button>
            </div>
          </div>
        )}
        {status === 'camera' && (
          <div>
            <video ref={videoRef} playsInline autoPlay muted className="w-full rounded mb-3" />
            <div className="flex gap-2">
              <button onClick={captureFrame} disabled={!videoReady} className={`flex-1 py-2 rounded-md font-semibold ${videoReady ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>{videoReady ? 'Capture' : 'Preparing camera...'}</button>
              <button onClick={continueWithoutCapture} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-semibold">Continue</button>
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


